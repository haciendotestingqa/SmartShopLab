import { useThemeMode } from '../ThemeContext';

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
  const { isDark, toggleMode } = useThemeMode();

  return (
    <header
      data-testid="header"
      className="sticky top-0 z-40 border-b border-neon-pink/25 bg-header text-[color:var(--color-header-fg)] shadow-sm shadow-neon/30"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={onCatalogClick}
          className="flex items-center gap-3 rounded text-left focus:outline-none focus:ring-2 focus:ring-neon-pink focus:ring-offset-2 focus:ring-offset-header sm:gap-4"
          aria-label="Go to SmartShopLab catalog"
        >
          <img
            src="/smartshoplab-logo.jpg"
            alt=""
            className="h-20 w-20 rounded-xl object-cover ring-2 ring-neon-pink/40 shadow-neon sm:h-24 sm:w-24"
          />
          <span className="bg-neon-gradient bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            SmartShopLab
          </span>
        </button>

        {currentView === 'catalog' && (
          <div className="hidden flex-1 max-w-md sm:block">
            <label htmlFor="search-input" className="sr-only">
              Search products
            </label>
            <input
              id="search-input"
              data-testid="search-input"
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-neon-pink/20 bg-[color:var(--color-header-input)] px-4 py-2 text-[color:var(--color-header-fg)] placeholder:text-[color:var(--color-header-muted)] focus:border-neon-orange focus:ring-2 focus:ring-neon-orange"
            />
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            data-testid="theme-toggle"
            role="switch"
            aria-checked={isDark}
            onClick={toggleMode}
            className="flex items-center gap-1.5 rounded-full border border-neon-pink/30 bg-[color:var(--color-header-input)] px-2 py-1 text-[color:var(--color-header-fg)] transition hover:border-neon-pink/60 focus:outline-none focus:ring-2 focus:ring-neon-yellow"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Dark mode on' : 'Light mode on'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${!isDark ? 'text-neon-orange' : 'text-slate-300'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span
              className={`relative h-5 w-9 rounded-full transition-colors ${isDark ? 'bg-neon-gradient' : 'bg-neon-pink/35'}`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isDark ? 'left-4' : 'left-0.5'}`}
              />
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isDark ? 'text-neon-pink' : 'text-slate-300'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </button>

          <button
            type="button"
            data-testid="cart-button"
            onClick={onCartClick}
            className="relative rounded-lg p-2 text-[color:var(--color-header-fg)] hover:bg-neon-pink/10 focus:outline-none focus:ring-2 focus:ring-neon-pink"
            aria-label={`Cart with ${cartCount} items`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span
              data-testid="cart-badge"
              className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-neon-gradient px-1 text-xs font-semibold text-white shadow-neon"
            >
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
