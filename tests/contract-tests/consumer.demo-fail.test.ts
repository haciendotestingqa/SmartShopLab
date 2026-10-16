import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { describe, expect, it } from 'vitest';

const { like, eachLike } = MatchersV3;

/**
 * Demo educativa (NO crítica): exige `magicField` que el backend no envía.
 * Genera un pact aparte para `npm run test:contract:provider:demo-fail`
 * (expected FAIL). El contrato verde vive en `consumer.test.ts`.
 */
const provider = new PactV3({
  consumer: 'web-frontend-demo-break',
  provider: 'smartshoplab-backend',
  dir: path.resolve(__dirname, 'pacts'),
});

describe('SmartShopLab API Contract — Consumer DEMO FAIL (magicField)', () => {
  it('GET /api/products exige magicField (romperá el provider)', async () => {
    provider
      .given('catalog exists')
      .uponReceiving('a request for products with mandatory magicField')
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
          // LAB: el backend NO envía magicField → provider verify falla a propósito.
          magicField: like('obligatorio'),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/api/products`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.magicField).toBeTruthy();
    });
  });
});
