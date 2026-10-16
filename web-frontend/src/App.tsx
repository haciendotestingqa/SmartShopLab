import { useCallback, useEffect, useState } from 'react';
import { addToCart, fetchCart, fetchProducts, type Cart, type Product } from './api';
import ChatbotWidget from './components/ChatbotWidget';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

type View = 'catalog' | 'cart';

export default function App() {
  const [view, setView] = useState<View>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const loadData = useCallback(async (query?: string) => {
    try {
      setError(null);
      const [productList, cartData] = await Promise.all([
        fetchProducts(query),
        fetchCart(),
      ]);
      setProducts(productList);
      setCart(cartData);
    } catch {
      setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadData]);

  const handleAddToCart = async (productId: string) => {
    setAddingId(productId);
    try {
      const updated = await addToCart(productId);
      setCart(updated);
    } catch {
      setError('Error al añadir producto al carrito');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCartClick={() => setView('cart')}
        currentView={view}
        onCatalogClick={() => setView('catalog')}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-center text-text-muted">Cargando catálogo...</p>
        ) : view === 'catalog' ? (
          <>
            <h1 className="mb-6 text-3xl font-bold text-text">Catálogo de Productos</h1>
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
              <p className="text-center text-text-muted">No se encontraron productos.</p>
            )}
          </>
        ) : (
          <section data-testid="cart-view">
            <h1 className="mb-6 text-3xl font-bold text-text">Tu Carrito</h1>
            {cart && cart.items.length > 0 ? (
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    data-testid="cart-item"
                    className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-md"
                  >
                    {item.product && (
                      <>
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-text">{item.product.name}</h3>
                          <p className="text-primary-main font-bold">
                            ${item.product.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div className="rounded-xl bg-primary-dark p-6 text-white">
                  <p className="text-lg font-semibold">Total</p>
                  <p data-testid="cart-total" className="text-3xl font-bold">
                    ${cart.total.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    className="mt-4 rounded-lg bg-accent px-6 py-3 font-semibold hover:bg-violet-600"
                  >
                    Proceder al Pago
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-text-muted">Tu carrito está vacío.</p>
            )}
            <button
              type="button"
              onClick={() => setView('catalog')}
              className="mt-6 text-primary-main hover:underline"
            >
              ← Volver al catálogo
            </button>
          </section>
        )}
      </main>

      <ChatbotWidget />
    </div>
  );
}
