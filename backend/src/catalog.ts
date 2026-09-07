import type { Product } from './types';

/** Catálogo mock de productos SmartShopLab */
export const products: Product[] = [
  {
    id: 'prod-laptop-001',
    name: 'SmartBook Pro Laptop',
    description: 'Laptop ultraligera con procesador de última generación, 16GB RAM y SSD 512GB.',
    price: 1299.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    stock: 15,
    category: 'Computadoras',
  },
  {
    id: 'prod-headphones-002',
    name: 'SoundWave Auriculares',
    description: 'Auriculares inalámbricos con cancelación activa de ruido y 30h de batería.',
    price: 249.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    stock: 42,
    category: 'Audio',
  },
  {
    id: 'prod-keyboard-003',
    name: 'TypeMaster Teclado Mecánico',
    description: 'Teclado mecánico RGB compacto con switches silenciosos.',
    price: 89.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&h=300&fit=crop',
    stock: 28,
    category: 'Accesorios',
  },
  {
    id: 'prod-monitor-004',
    name: 'ViewMax Monitor 27"',
    description: 'Monitor 4K IPS de 27 pulgadas con HDR10 y 144Hz.',
    price: 449.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    stock: 8,
    category: 'Monitores',
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
}
