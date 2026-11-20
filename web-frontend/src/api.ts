export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  stock: number;
  category: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
}

export interface AiChatResponse {
  reply: string;
  isHallucination: boolean;
  sessionId: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';
/** Generous timeout for Render free cold start (~30–60s) */
const FETCH_TIMEOUT_MS = 25000;
const RETRY_BACKOFFS_MS = [2000, 4000, 8000, 12000, 16000];
const MAX_ATTEMPTS = 6;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export type RetryProgress = { attempt: number; maxAttempts: number };

async function withRetry<T>(
  fn: () => Promise<T>,
  onAttempt?: (progress: RetryProgress) => void
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onAttempt?.({ attempt, maxAttempts: MAX_ATTEMPTS });
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BACKOFFS_MS[attempt - 1] ?? 16000);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Warm-up opcional; no falla el flujo si /health tarda. */
export async function pingHealth(): Promise<boolean> {
  try {
    const res = await fetchJson(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchProducts(
  query?: string,
  onAttempt?: (progress: RetryProgress) => void
): Promise<Product[]> {
  return withRetry(async () => {
    const url = query
      ? `${API_BASE}/api/products?q=${encodeURIComponent(query)}`
      : `${API_BASE}/api/products`;
    const res = await fetchJson(url);
    const data = (await res.json()) as { products: Product[] };
    if (!Array.isArray(data.products)) throw new Error('Invalid products response');
    return data.products;
  }, onAttempt);
}

/** Filtra qty≤0 y recalcula total (API hosted antigua deja basura tras deltas negativos). */
function sanitizeCart(cart: Cart): Cart {
  const items = cart.items.filter((item) => item.quantity > 0);
  const total = items.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);
  return { ...cart, items, total: Math.round(total * 100) / 100 };
}

async function postCartDelta(productId: string, delta: number): Promise<Cart> {
  const res = await fetchJson(`${API_BASE}/api/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity: delta }),
  });
  const data = (await res.json()) as { cart: Cart };
  return sanitizeCart(data.cart);
}

export async function fetchCart(onAttempt?: (progress: RetryProgress) => void): Promise<Cart> {
  return withRetry(async () => {
    const res = await fetchJson(`${API_BASE}/api/cart`);
    const data = (await res.json()) as { cart: Cart };
    if (!data.cart) throw new Error('Invalid cart response');
    return sanitizeCart(data.cart);
  }, onAttempt);
}

export async function addToCart(productId: string, quantity = 1): Promise<Cart> {
  return postCartDelta(productId, quantity);
}

/**
 * Adjust quantity with delta (+1/-N) via POST add — works on current Render deploy
 * (sin PATCH ni mode=set). No enviar cantidad absoluta: el host antiguo la suma.
 */
export async function setCartItemQuantity(
  productId: string,
  nextQuantity: number,
  currentQuantity: number
): Promise<Cart> {
  if (nextQuantity <= 0) {
    return removeFromCart(productId, currentQuantity);
  }
  const delta = nextQuantity - currentQuantity;
  if (delta === 0) {
    return fetchCart();
  }
  return postCartDelta(productId, delta);
}

export async function removeFromCart(productId: string, currentQuantity: number): Promise<Cart> {
  const qty = Math.max(0, Math.floor(currentQuantity));
  if (qty <= 0) {
    return fetchCart();
  }
  return postCartDelta(productId, -qty);
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<AiChatResponse> {
  const res = await fetchJson(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });
  return res.json() as Promise<AiChatResponse>;
}
