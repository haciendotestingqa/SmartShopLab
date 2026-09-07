import { expect, test } from '@playwright/test';

test.describe('Flujo de compra web', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/cart/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('navega catálogo, añade Laptop y ve carrito', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('header')).toBeVisible();
    await expect(page.getByTestId('cart-badge')).toHaveText('2');
    await expect(page.getByTestId('product-grid')).toBeVisible();

    const laptopCard = page.getByTestId('product-card').filter({ hasText: 'SmartBook Pro Laptop' });
    await expect(laptopCard).toBeVisible();
    await laptopCard.getByTestId('add-to-cart-btn').click();

    await page.getByTestId('cart-button').click();
    await expect(page.getByTestId('cart-view')).toBeVisible();
    await expect(page.getByTestId('cart-item').first()).toBeVisible();
    await expect(page.getByTestId('cart-total')).toBeVisible();
  });
});
