import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { describe, expect, it } from 'vitest';

const { like, eachLike, regex } = MatchersV3;

const provider = new PactV3({
  consumer: 'web-frontend',
  provider: 'smartshoplab-backend',
  dir: path.resolve(__dirname, 'pacts'),
});

describe('SmartShopLab API Contract — Consumer', () => {
  it('GET /api/products', async () => {
    provider
      .given('catalog exists')
      .uponReceiving('a request for products')
      .withRequest({ method: 'GET', path: '/api/products' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          products: eachLike({
            id: like('prod-laptop-001'),
            name: like('SmartBook Pro Laptop'),
            price: like(1299.99),
            currency: like('USD'),
            stock: like(15),
          }),
          count: like(4),
          // LAB INTENCIONAL: el backend NO envía magicField → provider verify siempre falla.
          // Sirve para demostrar un rompimiento de contrato. No afecta Playwright/Newman/K6/AI.
          magicField: like('obligatorio'),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/api/products`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products.length).toBeGreaterThan(0);
    });
  });

  it('GET /api/cart', async () => {
    provider
      .given('cart exists')
      .uponReceiving('a request for cart')
      .withRequest({ method: 'GET', path: '/api/cart' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          cart: {
            id: like('cart-default'),
            items: eachLike({ productId: like('prod-laptop-001'), quantity: like(1) }),
            total: like(1549.98),
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/api/cart`);
      expect(res.status).toBe(200);
    });
  });

  it('POST /api/ai/chat', async () => {
    provider
      .given('ai assistant available')
      .uponReceiving('a chat message')
      .withRequest({
        method: 'POST',
        path: '/api/ai/chat',
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'Hola' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          reply: like('¡Hola!'),
          isHallucination: like(false),
          sessionId: regex('[0-9a-f-]{36}', 'uuid'),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hola' }),
      });
      expect(res.status).toBe(200);
    });
  });
});
