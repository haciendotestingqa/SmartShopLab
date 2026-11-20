import type { Product } from './types';

/** SmartShopLab mock product catalog (English copy for web + mobile; redeploy trigger) */
export const products: Product[] = [
  {
    id: 'prod-laptop-001',
    name: 'SmartBook Pro Laptop',
    description: 'Ultralight laptop with a latest-gen processor, 16GB RAM, and 512GB SSD.',
    price: 1299.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    stock: 15,
    category: 'Computers',
  },
  {
    id: 'prod-headphones-002',
    name: 'SoundWave Headphones',
    description: 'Wireless headphones with active noise cancellation and 30-hour battery life.',
    price: 249.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    stock: 42,
    category: 'Audio',
  },
  {
    id: 'prod-keyboard-003',
    name: 'TypeMaster Mechanical Keyboard',
    description: 'Compact RGB mechanical keyboard with quiet switches.',
    price: 89.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&h=300&fit=crop',
    stock: 28,
    category: 'Accessories',
  },
  {
    id: 'prod-monitor-004',
    name: 'ViewMax Monitor 27"',
    description: '27-inch 4K IPS monitor with HDR10 and 144Hz refresh rate.',
    price: 449.99,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    stock: 8,
    category: 'Monitors',
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
