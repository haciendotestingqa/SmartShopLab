import { randomUUID } from 'crypto';
import { getProductById, products, searchProducts } from './catalog';
import type { AiChatRequest, AiChatResponse } from './types';

/** Triggers that force intentional hallucinated replies for AI quality tests */
const HALLUCINATION_TRIGGERS = [
  'lifetime warranty',
  '90% discount',
  'free shipping in 1 hour',
  'unlimited returns',
  'free price',
  '100% refund always',
];

const sessions = new Map<string, string[]>();

function hasHallucinationTrigger(message: string): boolean {
  const lower = message.toLowerCase();
  return HALLUCINATION_TRIGGERS.some((t) => lower.includes(t));
}

function generateHallucination(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('warranty')) {
    return 'Of course! Every product includes a lifetime warranty with no exceptions, even for water damage or drops from any height.';
  }
  if (lower.includes('discount')) {
    return 'Great news! You have an exclusive 90% discount applied automatically. Your order total is basically free.';
  }
  if (lower.includes('shipping')) {
    return 'Confirmed: your order will arrive in 1 hour with free shipping anywhere in the world, including Antarctica.';
  }
  return 'As the SmartShopLab assistant (Lumina), I can confirm we have the best offer on the market with unlimited benefits that go beyond any real store policy.';
}

function answerAboutProduct(message: string): string | null {
  const lower = message.toLowerCase();

  for (const product of products) {
    const keywords = product.name.toLowerCase().split(' ');
    const match = keywords.some((k) => k.length > 3 && lower.includes(k));
    if (match || lower.includes(product.category.toLowerCase())) {
      return `The ${product.name} costs $${product.price.toFixed(2)} ${product.currency} and we have ${product.stock} units in stock. ${product.description}`;
    }
  }

  if (lower.includes('laptop')) {
    const laptop = getProductById('prod-laptop-001');
    if (laptop) {
      return `Our featured laptop is the ${laptop.name} at $${laptop.price.toFixed(2)}. Available stock: ${laptop.stock} units.`;
    }
  }

  if (lower.includes('headphone')) {
    const hp = getProductById('prod-headphones-002');
    if (hp) {
      return `I recommend the ${hp.name} for $${hp.price.toFixed(2)}. We have ${hp.stock} units available.`;
    }
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
    const list = products.map((p) => `${p.name}: $${p.price.toFixed(2)}`).join('; ');
    return `Here are our current prices: ${list}.`;
  }

  if (lower.includes('stock') || lower.includes('available')) {
    const list = products.map((p) => `${p.name}: ${p.stock} units`).join('; ');
    return `Current stock: ${list}.`;
  }

  return null;
}

function generateFactualReply(message: string): string {
  const productAnswer = answerAboutProduct(message);
  if (productAnswer) return productAnswer;

  const lower = message.toLowerCase();

  if (/hello|hi\b|hey|good morning|good afternoon|good evening/i.test(lower)) {
    return 'Hi! I am the SmartShopLab assistant (Lumina). I can help with products, prices, and stock. What would you like to know?';
  }

  if (/recommend/i.test(lower)) {
    const top = products.slice(0, 2);
    return `I recommend: ${top.map((p) => `${p.name} ($${p.price.toFixed(2)})`).join(' and ')}. Both are popular with our customers.`;
  }

  if (/search|find/i.test(lower)) {
    const query = message.replace(/search|find|product|products/gi, '').trim();
    const results = searchProducts(query);
    if (results.length === 0) {
      return 'I could not find products for that. Try "laptop" or "headphones".';
    }
    return `I found ${results.length} product(s): ${results.map((p) => p.name).join(', ')}.`;
  }

  if (/thanks|thank you/i.test(lower)) {
    return 'You are welcome! I am here if you need more help with your SmartShopLab purchase.';
  }

  return 'I am the SmartShopLab assistant (Lumina). Ask me about laptops, headphones, prices, or stock.';
}

/** Simulates an LLM with both factual replies and intentional hallucinations */
export function chatWithAi(request: AiChatRequest): AiChatResponse {
  const sessionId = request.sessionId ?? randomUUID();
  const history = sessions.get(sessionId) ?? [];
  history.push(request.message);
  sessions.set(sessionId, history);

  const isHallucination = hasHallucinationTrigger(request.message);
  const reply = isHallucination
    ? generateHallucination(request.message)
    : generateFactualReply(request.message);

  return {
    reply,
    isHallucination,
    sessionId,
    sources: isHallucination ? undefined : ['catalog.ts'],
  };
}
