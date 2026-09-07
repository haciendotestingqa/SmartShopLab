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
      className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md transition-shadow hover:shadow-lg"
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
        <div className="mt-4 flex items-center justify-between">
          <span
            data-testid="product-price"
            className="text-xl font-bold text-primary-main"
          >
            ${product.price.toFixed(2)}
          </span>
          <button
            type="button"
            data-testid="add-to-cart-btn"
            onClick={() => onAddToCart(product.id)}
            disabled={isAdding}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-60"
          >
            {isAdding ? 'Añadiendo...' : 'Añadir al Carrito'}
          </button>
        </div>
      </div>
    </article>
  );
}
