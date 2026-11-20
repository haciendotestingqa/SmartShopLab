import type { Product } from '../api';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  isAdding?: boolean;
}

export default function ProductCard({ product, onAddToCart, isAdding }: ProductCardProps) {
  return (
    <article
      data-testid="product-card"
      className="flex flex-col overflow-hidden rounded-xl border border-neon-pink/20 bg-surface shadow-md transition hover:border-neon-orange/40 hover:shadow-neon"
    >
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-48 w-full object-cover"
        loading="lazy"
      />
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {product.category}
        </span>
        <h3 className="mt-1 text-lg font-bold text-text">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm text-text-muted line-clamp-2">{product.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span data-testid="product-price" className="text-xl font-bold text-neon-pink">
            ${product.price.toFixed(2)}
          </span>
          <button
            type="button"
            data-testid="add-to-cart-btn"
            onClick={() => onAddToCart(product.id)}
            disabled={isAdding}
            className="rounded-lg bg-neon-gradient px-4 py-2 text-sm font-semibold text-white shadow-neon transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60"
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
