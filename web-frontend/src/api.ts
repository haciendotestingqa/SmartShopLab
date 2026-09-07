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
const FETCH_TIMEOUT_MS = 8000;

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

export async function fetchProducts(query?: string): Promise<Product[]> {
  const url = query ? `${API_BASE}/api/products?q=${encodeURIComponent(query)}` : `${API_BASE}/api/products`;
  const res = await fetchJson(url);
  const data = (await res.json()) as { products: Product[] };
  return data.products;
}

export async function fetchCart(): Promise<Cart> {
  const res = await fetchJson(`${API_BASE}/api/cart`);
  const data = (await res.json()) as { cart: Cart };
  return data.cart;
}

export async function addToCart(productId: string, quantity = 1): Promise<Cart> {
  const res = await fetchJson(`${API_BASE}/api/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  const data = (await res.json()) as { cart: Cart };
  return data.cart;
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<AiChatResponse> {
  const res = await fetchJson(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });
  return res.json() as Promise<AiChatResponse>;
}
