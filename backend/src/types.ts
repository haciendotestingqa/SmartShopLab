/** Tipos compartidos de la API SmartShopLab */

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

export interface AiChatRequest {
  message: string;
  sessionId?: string;
}

export interface AiChatResponse {
  reply: string;
  isHallucination: boolean;
  sessionId: string;
  sources?: string[];
}
