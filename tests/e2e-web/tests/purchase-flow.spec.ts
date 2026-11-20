import { expect, test } from '@playwright/test';

test.describe('Web purchase flow', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/cart/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('browses catalog, adds Laptop and checks cart', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Product Catalog' })).toBeVisible();
    // Lab seed: laptop + headphones → 2 items
    await expect(page.getByRole('button', { name: 'Cart with 2 items' })).toBeVisible();

    const laptopCard = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'SmartBook Pro Laptop' }) });
    await expect(laptopCard).toBeVisible();
    await laptopCard.getByRole('button', { name: 'Add to Cart' }).click();

    // Visible outcome: badge / accessible name reflects the add (laptop qty 2 → 3 items)
    await expect(page.getByRole('button', { name: 'Cart with 3 items' })).toBeVisible();
    await page.getByRole('button', { name: 'Cart with 3 items' }).click();

    await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
    const laptopItem = page.getByTestId('cart-item').filter({
      has: page.getByRole('heading', { name: 'SmartBook Pro Laptop' }),
    });
    await expect(laptopItem).toContainText(/\$1299\.99\s*×\s*2/);
    // 1299.99×2 + 249.99 headphones = 2849.97
    await expect(page.getByText('$2849.97')).toBeVisible();

    await laptopItem.getByRole('button', { name: /Increase quantity/ }).click();
    await expect(laptopItem.getByTestId('cart-qty')).toHaveText('3');
    await expect(page.getByRole('button', { name: 'Cart with 4 items' })).toBeVisible();

    await laptopItem.getByRole('button', { name: /Decrease quantity/ }).click();
    await expect(laptopItem.getByTestId('cart-qty')).toHaveText('2');

    const headphonesItem = page.getByTestId('cart-item').filter({
      has: page.getByRole('heading', { name: /Headphones/i }),
    });
    await headphonesItem.getByRole('button', { name: /Remove/ }).click();
    await expect(headphonesItem).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cart with 2 items' })).toBeVisible();
  });
});
