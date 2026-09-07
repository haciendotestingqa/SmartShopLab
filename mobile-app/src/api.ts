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

// Fuente de verdad: mobile-app/.env (plantilla: .env.example). Fallback = Android.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';

export async function fetchProducts(query?: string): Promise<Product[]> {
  const url = query
    ? `${API_BASE}/api/products?q=${encodeURIComponent(query)}`
    : `${API_BASE}/api/products`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar productos');
  const data = (await res.json()) as { products: Product[] };
  return data.products;
}

export async function fetchCart(): Promise<Cart> {
  const res = await fetch(`${API_BASE}/api/cart`);
  if (!res.ok) throw new Error('Error al cargar carrito');
  const data = (await res.json()) as { cart: Cart };
  return data.cart;
}

export async function addToCart(productId: string, quantity = 1): Promise<Cart> {
  const res = await fetch(`${API_BASE}/api/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!res.ok) throw new Error('Error al añadir al carrito');
  const data = (await res.json()) as { cart: Cart };
  return data.cart;
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<AiChatResponse> {
  // App móvil del lab → LLM real (OpenRouter). La web no envía este header → ai-mock.
  const provider = process.env.EXPO_PUBLIC_AI_PROVIDER ?? 'openrouter';
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Provider': provider,
    },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: string; error?: string };
      detail = body.detail ?? body.error ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<AiChatResponse>;
}
