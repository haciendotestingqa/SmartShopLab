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
  const items = c.items.map((item) => ({
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
    res.status(404).json({ error: 'Producto no encontrado' });
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

app.post('/api/cart/items', (req: Request, res: Response) => {
  const { productId, quantity = 1 } = req.body as { productId?: string; quantity?: number };

  if (!productId || !getProductById(productId)) {
    res.status(400).json({ error: 'productId inválido' });
    return;
  }

  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  res.status(201).json({ cart: enrichCart(cart) });
});

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'message es requerido' });
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
    res.status(502).json({ error: 'Error del proveedor de IA', detail, provider });
  }
});

/** LLM-as-judge para Maestro: la key solo se usa aquí (desde .env.ai-evals). */
app.post('/api/ai/judge', async (req: Request, res: Response) => {
  const { userQuestion, assistantReply, rubric } = req.body as {
    userQuestion?: string;
    assistantReply?: string;
    rubric?: string;
  };

  if (!userQuestion?.trim() || !assistantReply?.trim()) {
    res.status(400).json({ error: 'userQuestion y assistantReply son requeridos' });
    return;
  }

  try {
    const verdict = await judgeAssistantReply({
      userQuestion: userQuestion.trim(),
      assistantReply: assistantReply.trim(),
      rubric,
    });

    // Sidecar para el reporte HTML de Maestro (mismo estilo que ai-evals / writeHtmlReport)
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
      console.warn('[ai/judge] no se pudo guardar last-judge-verdict.json', persistErr);
    }

    res.json(verdict);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[ai/judge]', detail);
    res.status(502).json({ error: 'Error del juez LLM', detail });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const provider = process.env.AI_PROVIDER ?? 'mock';
  const key = process.env.OPENROUTER_API_KEY ?? '';
  console.log(`SmartShopLab API corriendo en http://localhost:${PORT}`);
  console.log(
    `AI default provider: ${provider} (mobile puede forzar openrouter con header X-AI-Provider)`
  );
  console.log(
    `OpenRouter key: ${key ? `cargada (len=${key.length})` : 'NO cargada — revisa .env.ai-evals'}`
  );
});

export default app;
