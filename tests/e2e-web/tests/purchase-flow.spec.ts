import { expect, test } from '@playwright/test';

test.describe('Flujo de compra web', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/cart/reset');
    expect(res.ok()).toBeTruthy();
  });

  test('navega catálogo, añade Laptop y ve carrito', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catálogo de Productos' })).toBeVisible();
    // Seed del lab: laptop + headphones → 2 artículos
    await expect(page.getByRole('button', { name: 'Carrito con 2 artículos' })).toBeVisible();

    const laptopCard = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'SmartBook Pro Laptop' }) });
    await expect(laptopCard).toBeVisible();
    await laptopCard.getByRole('button', { name: 'Añadir al Carrito' }).click();

    // Outcome visible: el badge / nombre accesible refleja el add (laptop pasa a qty 2 → 3 ítems)
    await expect(page.getByRole('button', { name: 'Carrito con 3 artículos' })).toBeVisible();
    await page.getByRole('button', { name: 'Carrito con 3 artículos' }).click();

    await expect(page.getByRole('heading', { name: 'Tu Carrito' })).toBeVisible();
    const laptopLine = page
      .getByRole('heading', { name: 'SmartBook Pro Laptop' })
      .locator('..');
    await expect(laptopLine).toContainText(/\$1299\.99\s*×\s*2/);
    // 1299.99×2 + 249.99 headphones = 2849.97
    await expect(page.getByText('$2849.97')).toBeVisible();
  });
});
