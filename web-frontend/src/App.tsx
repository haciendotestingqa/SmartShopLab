import { useCallback, useEffect, useState } from 'react';
import {
  addToCart,
  fetchCart,
  fetchProducts,
  pingHealth,
  removeFromCart,
  setCartItemQuantity,
  type Cart,
  type Product,
  type RetryProgress,
} from './api';
import ChatbotWidget from './components/ChatbotWidget';
import Header from './components/Header';
import LabSplash from './components/LabSplash';
import ProductCard from './components/ProductCard';
import SiteFooter from './components/SiteFooter';

type View = 'catalog' | 'cart';

export default function App() {
  const [view, setView] = useState<View>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [booting, setBooting] = useState(true);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [, setRetryProgress] = useState<RetryProgress>({
    attempt: 1,
    maxAttempts: 6,
  });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [cartBusyId, setCartBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const bootLoad = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    setError(null);
    void pingHealth();
    try {
      const [productList, cartData] = await Promise.all([
        fetchProducts(undefined, setRetryProgress),
        fetchCart(setRetryProgress),
      ]);
      setProducts(productList);
      setCart(cartData);
      setReady(true);
    } catch {
      setBootError(
        'The API did not respond in time (possible Render cold start). Tap Retry to try again.'
      );
      setReady(false);
    } finally {
      setBooting(false);
    }
  }, []);

  const searchLoad = useCallback(async (query?: string) => {
    try {
      setError(null);
      const productList = await fetchProducts(query);
      setProducts(productList);
    } catch {
      setError('Could not refresh the catalog. It will retry automatically on the next search.');
    }
  }, []);

  useEffect(() => {
    void bootLoad();
  }, [bootLoad]);

  useEffect(() => {
    if (!ready || booting) return;
    const timer = setTimeout(() => {
      void searchLoad(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, ready, booting, searchLoad]);

  const handleAddToCart = async (productId: string) => {
    setAddingId(productId);
    try {
      const updated = await addToCart(productId);
      setCart(updated);
      const name = products.find((p) => p.id === productId)?.name;
      setToast(name ? `${name} was added to the cart` : 'Product added to the cart');
    } catch {
      setError('Could not add the product to the cart');
    } finally {
      setAddingId(null);
    }
  };

  const handleSetQuantity = async (
    productId: string,
    nextQuantity: number,
    currentQuantity: number
  ) => {
    if (cartBusyId) return;
    setCartBusyId(productId);
    setError(null);
    try {
      const updated = await setCartItemQuantity(productId, nextQuantity, currentQuantity);
      setCart(updated);
    } catch {
      setError('Could not update the quantity');
    } finally {
      setCartBusyId(null);
    }
  };

  const handleRemoveItem = async (productId: string, currentQuantity: number) => {
    if (cartBusyId) return;
    setCartBusyId(productId);
    setError(null);
    try {
      const updated = await removeFromCart(productId, currentQuantity);
      setCart(updated);
    } catch {
      setError('Could not remove the product');
    } finally {
      setCartBusyId(null);
    }
  };

  const showSplash = booting || Boolean(bootError) || !ready;

  return (
    <div className="flex min-h-screen flex-col bg-background text-text transition-colors">
      <Header
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCartClick={() => setView('cart')}
        currentView={view}
        onCatalogClick={() => setView('catalog')}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {showSplash ? (
          <LabSplash
            message="Waking up the lab…"
            error={bootError}
            onRetry={() => void bootLoad()}
          />
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-neon-pink/30 bg-surface-muted px-4 py-3 text-text"
              >
                {error}
              </div>
            )}

            {view === 'catalog' ? (
              <div className="animate-fade-in">
                <h1 className="mb-6 text-3xl font-bold text-text">Product Catalog</h1>
                <div
                  data-testid="product-grid"
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      isAdding={addingId === product.id}
                    />
                  ))}
                </div>
                {products.length === 0 && (
                  <p className="text-center text-text-muted">No products found.</p>
                )}
              </div>
            ) : (
              <section data-testid="cart-view" className="animate-fade-in">
                <h1 className="mb-6 text-3xl font-bold text-text">Your Cart</h1>
                {cart && cart.items.length > 0 ? (
                  <div className="space-y-4">
                    {cart.items.map((item) => (
                      <div
                        key={item.productId}
                        data-testid="cart-item"
                        className="flex flex-col gap-3 rounded-xl border border-neon-pink/15 bg-surface p-4 shadow-md sm:flex-row sm:items-center sm:gap-4"
                      >
                        {item.product && (
                          <>
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="h-20 w-20 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-text">{item.product.name}</h3>
                              <p className="font-bold text-neon-pink">
                                ${item.product.price.toFixed(2)} × {item.quantity}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                data-testid="cart-qty-decrease"
                                aria-label={`Decrease quantity of ${item.product.name}`}
                                disabled={cartBusyId === item.productId}
                                onClick={() =>
                                  void handleSetQuantity(
                                    item.productId,
                                    item.quantity - 1,
                                    item.quantity
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-pink/30 text-lg font-bold text-text hover:bg-neon-pink/10 disabled:opacity-50"
                              >
                                −
                              </button>
                              <span
                                data-testid="cart-qty"
                                className="min-w-[1.5rem] text-center font-semibold text-text"
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                data-testid="cart-qty-increase"
                                aria-label={`Increase quantity of ${item.product.name}`}
                                disabled={cartBusyId === item.productId}
                                onClick={() =>
                                  void handleSetQuantity(
                                    item.productId,
                                    item.quantity + 1,
                                    item.quantity
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-pink/30 text-lg font-bold text-text hover:bg-neon-pink/10 disabled:opacity-50"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                data-testid="cart-item-remove"
                                aria-label={`Remove ${item.product.name} from cart`}
                                disabled={cartBusyId === item.productId}
                                onClick={() =>
                                  void handleRemoveItem(item.productId, item.quantity)
                                }
                                className="ml-1 rounded-lg border border-neon-orange/40 px-3 py-1.5 text-sm font-semibold text-neon-orange hover:bg-neon-orange/10 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="rounded-xl border border-neon-orange/40 bg-surface-muted p-6 shadow-neon">
                      <p className="text-lg font-semibold text-text">Total</p>
                      <p data-testid="cart-total" className="text-3xl font-bold text-neon-gradient">
                        ${cart.total.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        className="mt-4 rounded-lg bg-neon-gradient px-6 py-3 font-semibold text-white shadow-neon transition hover:brightness-110"
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-text-muted">Your cart is empty.</p>
                )}
                <button
                  type="button"
                  onClick={() => setView('catalog')}
                  className="mt-6 text-neon-pink hover:underline"
                >
                  ← Back to catalog
                </button>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter toast={toast} />
      {!showSplash && <ChatbotWidget />}
    </div>
  );
}
