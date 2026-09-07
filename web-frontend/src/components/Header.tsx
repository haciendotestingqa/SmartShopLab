interface HeaderProps {
  cartCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCartClick: () => void;
  currentView: 'catalog' | 'cart';
  onCatalogClick: () => void;
}

export default function Header({
  cartCount,
  searchQuery,
  onSearchChange,
  onCartClick,
  currentView,
  onCatalogClick,
}: HeaderProps) {
  return (
    <header
      data-testid="header"
      className="sticky top-0 z-40 bg-primary-dark text-white shadow-lg"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onCatalogClick}
          className="flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary-dark rounded"
          aria-label="Ir al catálogo SmartShopLab"
        >
          <span className="text-2xl font-bold tracking-tight">SmartShopLab</span>
        </button>

        {currentView === 'catalog' && (
          <div className="hidden flex-1 max-w-md sm:block">
            <label htmlFor="search-input" className="sr-only">
              Buscar productos
            </label>
            <input
              id="search-input"
              data-testid="search-input"
              type="search"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border-0 bg-white/10 px-4 py-2 text-white placeholder:text-white/60 focus:bg-white/20 focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        <button
          type="button"
          data-testid="cart-button"
          onClick={onCartClick}
          className="relative rounded-lg p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label={`Carrito con ${cartCount} artículos`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span
            data-testid="cart-badge"
            className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white"
          >
            {cartCount}
          </span>
        </button>
      </div>
    </header>
  );
}
