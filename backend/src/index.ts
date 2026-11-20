import cors from 'cors';
import express, { Request, Response } from 'express';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { judgeAssistantReply } from './ai-judge';
import { chatWithAi } from './ai-mock';
import { chatWithOpenRouter } from './ai-openrouter';
import { getProductById, products, searchProducts } from './catalog';
import { loadRootAiEvalsEnv } from './load-env';
import type { Cart, CartItem } from './types';

loadRootAiEvalsEnv();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

const SEED_ITEMS: CartItem[] = [
  { productId: 'prod-laptop-001', quantity: 1 },
  { productId: 'prod-headphones-002', quantity: 1 },
];

function createSeedCart(): Cart {
  return {
    id: 'cart-default',
    items: SEED_ITEMS.map((item) => ({ ...item })),
    total: 0,
  };
}

let cart: Cart = createSeedCart();

function enrichCart(c: Cart): Cart {
  const items = c.items
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      ...item,
      product: getProductById(item.productId),
    }));
  const total = items.reduce((sum, item) => {
    return sum + (item.product?.price ?? 0) * item.quantity;
  }, 0);
  return { ...c, items, total: Math.round(total * 100) / 100 };
}

function resolveAiProvider(req: Request): 'mock' | 'openrouter' {
  const header = String(req.header('x-ai-provider') ?? '')
    .trim()
    .toLowerCase();
  if (header === 'openrouter' || header === 'mock') return header;
  const env = String(process.env.AI_PROVIDER ?? 'mock')
    .trim()
    .toLowerCase();
  return env === 'openrouter' ? 'openrouter' : 'mock';
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'SmartShopLab API', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const result = q ? searchProducts(q) : products;
  res.json({ products: result, count: result.length });
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = getProductById(String(req.params.id));
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ product });
});

app.get('/api/cart', (_req: Request, res: Response) => {
  res.json({ cart: enrichCart(cart) });
});

app.post('/api/cart/reset', (_req: Request, res: Response) => {
  cart = createSeedCart();
  res.json({ cart: enrichCart(cart) });
});

/**
 * Add / set / remove cart item.
 * mode: 'add' (default) | 'set' | 'remove'
 * — 'set'/'remove' use POST so hosts without PATCH still work.
 */
app.post('/api/cart/items', (req: Request, res: Response) => {
  const { productId, quantity = 1, mode = 'add' } = req.body as {
    productId?: string;
    quantity?: number;
    mode?: 'add' | 'set' | 'remove';
  };

  if (!productId || !getProductById(productId)) {
    res.status(400).json({ error: 'Invalid productId' });
    return;
  }

  if (mode === 'remove' || (mode === 'set' && typeof quantity === 'number' && quantity <= 0)) {
    cart.items = cart.items.filter((i) => i.productId !== productId);
    res.json({ cart: enrichCart(cart) });
    return;
  }

  if (mode === 'set') {
    if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
      res.status(400).json({ error: 'quantity is required for mode=set' });
      return;
    }
    const qty = Math.floor(quantity);
    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      existing.quantity = qty;
    } else {
      cart.items.push({ productId, quantity: qty });
    }
    res.json({ cart: enrichCart(cart) });
    return;
  }

  // mode === 'add' (compat; quantity may be negative for ± on hosts without mode/PATCH)
  const delta = typeof quantity === 'number' && !Number.isNaN(quantity) ? Math.trunc(quantity) : 1;
  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += delta;
    if (existing.quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    }
  } else if (delta > 0) {
    cart.items.push({ productId, quantity: delta });
  }

  res.status(201).json({ cart: enrichCart(cart) });
});

/** PATCH/DELETE aliases (same behavior as mode set/remove) */
app.patch('/api/cart/items/:productId', (req: Request, res: Response) => {
  const productId = String(req.params.productId);
  const { quantity } = req.body as { quantity?: number };

  if (!getProductById(productId)) {
    res.status(400).json({ error: 'Invalid productId' });
    return;
  }
  if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
    res.status(400).json({ error: 'quantity is required' });
    return;
  }

  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.productId !== productId);
    res.json({ cart: enrichCart(cart) });
    return;
  }

  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity = Math.floor(quantity);
  } else {
    cart.items.push({ productId, quantity: Math.floor(quantity) });
  }
  res.json({ cart: enrichCart(cart) });
});

app.delete('/api/cart/items/:productId', (req: Request, res: Response) => {
  const productId = String(req.params.productId);
  cart.items = cart.items.filter((i) => i.productId !== productId);
  res.json({ cart: enrichCart(cart) });
});

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const provider = resolveAiProvider(req);
  try {
    if (provider === 'openrouter') {
      const response = await chatWithOpenRouter({ message: message.trim(), sessionId });
      res.json(response);
      return;
    }
    res.json(chatWithAi({ message: message.trim(), sessionId }));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[ai/chat]', provider, detail);
    res.status(502).json({ error: 'AI provider error', detail, provider });
  }
});

/** LLM-as-judge for Maestro: API key is only used here (from .env.ai-evals). */
app.post('/api/ai/judge', async (req: Request, res: Response) => {
  const { userQuestion, assistantReply, rubric } = req.body as {
    userQuestion?: string;
    assistantReply?: string;
    rubric?: string;
  };

  if (!userQuestion?.trim() || !assistantReply?.trim()) {
    res.status(400).json({ error: 'userQuestion and assistantReply are required' });
    return;
  }

  try {
    const verdict = await judgeAssistantReply({
      userQuestion: userQuestion.trim(),
      assistantReply: assistantReply.trim(),
      rubric,
    });

    // Sidecar for Maestro HTML report (same style as ai-evals / writeHtmlReport)
    try {
      const verdictPath = path.resolve(
        __dirname,
        '../../tests/e2e-mobile/reports/last-judge-verdict.json'
      );
      mkdirSync(path.dirname(verdictPath), { recursive: true });
      writeFileSync(
        verdictPath,
        JSON.stringify(
          {
            ...verdict,
            userQuestion: userQuestion.trim(),
            assistantReply: assistantReply.trim(),
            rubric: rubric?.trim() || null,
            generatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch (persistErr) {
      console.warn('[ai/judge] could not save last-judge-verdict.json', persistErr);
    }

    res.json(verdict);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[ai/judge]', detail);
    res.status(502).json({ error: 'LLM judge error', detail });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const provider = process.env.AI_PROVIDER ?? 'mock';
  const key = process.env.OPENROUTER_API_KEY ?? '';
  console.log(`SmartShopLab API running at http://localhost:${PORT}`);
  console.log(
    `AI default provider: ${provider} (mobile can force openrouter via X-AI-Provider header)`
  );
  console.log(
    `OpenRouter key: ${key ? `loaded (len=${key.length})` : 'NOT loaded — check .env.ai-evals'}`
  );
});

export default app;
