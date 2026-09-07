import { randomUUID } from 'crypto';
import { getProductById, products, searchProducts } from './catalog';
import type { AiChatRequest, AiChatResponse } from './types';

/** Triggers que provocan respuestas alucinadas intencionales para tests de calidad IA */
const HALLUCINATION_TRIGGERS = [
  'garantía de por vida',
  'garantia de por vida',
  'descuento del 90',
  'descuento del 90%',
  'envío gratis en 1 hora',
  'envio gratis en 1 hora',
  'devolución ilimitada',
  'devolucion ilimitada',
  'precio gratis',
  '100% reembolso siempre',
];

const sessions = new Map<string, string[]>();

function hasHallucinationTrigger(message: string): boolean {
  const lower = message.toLowerCase();
  return HALLUCINATION_TRIGGERS.some((t) => lower.includes(t));
}

function generateHallucination(message: string): string {
  if (message.toLowerCase().includes('garantía') || message.toLowerCase().includes('garantia')) {
    return '¡Por supuesto! Todos nuestros productos incluyen garantía de por vida sin excepciones, incluso en caso de daños por agua o caídas desde cualquier altura.';
  }
  if (message.toLowerCase().includes('descuento')) {
    return '¡Excelente noticia! Tienes un descuento exclusivo del 90% aplicado automáticamente. Tu pedido total es prácticamente gratis.';
  }
  if (message.toLowerCase().includes('envío') || message.toLowerCase().includes('envio')) {
    return 'Confirmado: tu pedido llegará en 1 hora con envío gratis a cualquier parte del mundo, incluyendo la Antártida.';
  }
  return 'Como asistente SmartShopLab, te confirmo que tenemos la mejor oferta del mercado con beneficios ilimitados que superan cualquier política real de la tienda.';
}

function answerAboutProduct(message: string): string | null {
  const lower = message.toLowerCase();

  for (const product of products) {
    const keywords = product.name.toLowerCase().split(' ');
    const match = keywords.some((k) => k.length > 3 && lower.includes(k));
    if (match || lower.includes(product.category.toLowerCase())) {
      return `El ${product.name} cuesta $${product.price.toFixed(2)} ${product.currency} y tenemos ${product.stock} unidades en stock. ${product.description}`;
    }
  }

  if (lower.includes('laptop') || lower.includes('portátil') || lower.includes('portatil')) {
    const laptop = getProductById('prod-laptop-001');
    if (laptop) {
      return `Nuestra laptop destacada es la ${laptop.name} a $${laptop.price.toFixed(2)}. Stock disponible: ${laptop.stock} unidades.`;
    }
  }

  if (lower.includes('auricular') || lower.includes('headphone') || lower.includes('audífono') || lower.includes('audifono')) {
    const hp = getProductById('prod-headphones-002');
    if (hp) {
      return `Te recomiendo los ${hp.name} por $${hp.price.toFixed(2)}. Disponemos de ${hp.stock} unidades.`;
    }
  }

  if (lower.includes('precio') || lower.includes('cuánto') || lower.includes('cuanto') || lower.includes('cuesta')) {
    const list = products.map((p) => `${p.name}: $${p.price.toFixed(2)}`).join('; ');
    return `Estos son nuestros precios actuales: ${list}.`;
  }

  if (lower.includes('stock') || lower.includes('disponible')) {
    const list = products.map((p) => `${p.name}: ${p.stock} uds.`).join('; ');
    return `Stock actual: ${list}.`;
  }

  return null;
}

function generateFactualReply(message: string): string {
  const productAnswer = answerAboutProduct(message);
  if (productAnswer) return productAnswer;

  const lower = message.toLowerCase();

  if (/hola|buenos|buenas|hey|saludos/i.test(lower)) {
    return '¡Hola! Soy el asistente de SmartShopLab. Puedo ayudarte con información de productos, precios y stock. ¿Qué te gustaría saber?';
  }

  if (/recomienda|recomendación|recomendacion|suger/i.test(lower)) {
    const top = products.slice(0, 2);
    return `Te recomiendo: ${top.map((p) => `${p.name} ($${p.price.toFixed(2)})`).join(' y ')}. Ambos son muy populares entre nuestros clientes.`;
  }

  if (/busca|buscar|encuentra/i.test(lower)) {
    const query = message.replace(/busca|buscar|encuentra|producto|productos/gi, '').trim();
    const results = searchProducts(query);
    if (results.length === 0) {
      return 'No encontré productos con ese criterio. Prueba con "laptop" o "auriculares".';
    }
    return `Encontré ${results.length} producto(s): ${results.map((p) => p.name).join(', ')}.`;
  }

  if (/gracias|thank/i.test(lower)) {
    return '¡De nada! Estoy aquí si necesitas más ayuda con tu compra en SmartShopLab.';
  }

  return 'Soy el asistente de SmartShopLab. Pregúntame sobre laptops, auriculares, precios o stock de nuestros productos.';
}

/** Simula respuestas de un LLM con respuestas correctas y alucinaciones intencionales */
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
