import { expect, test } from '@playwright/test';

/**
 * WEB layer — mocked AI (`backend/src/ai-mock.ts`).
 * Lab contrast: mobile uses Maestro (UI) + `npm run test:mobile:ai` (LLM-as-judge).
 *
 * Locators: role + accessible name / placeholder. `getByTestId` only when no a11y hook
 * (e.g. chat bubbles without their own semantic role).
 */
test.describe('AI chatbot', () => {
  test('opens widget and gets a factual laptop reply', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Open AI assistant (Lumina)' }).click();
    const dialog = page.getByRole('dialog', { name: 'SmartShopLab Assistant (Lumina)' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Online')).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Assistant (Lumina)' })).toBeVisible();

    await dialog.getByPlaceholder('Type your message...').fill('How much does the laptop cost?');
    await dialog.getByRole('button', { name: 'Send' }).click();

    // Visible outcome: assistant reply mentions product/price (testid only on bubble)
    await expect(dialog.getByTestId('chat-message-assistant').last()).toContainText(
      /SmartBook|1299|laptop/i
    );
  });

  test('detects hallucinated reply with lifetime warranty trigger', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open AI assistant (Lumina)' }).click();

    const dialog = page.getByRole('dialog', { name: 'SmartShopLab Assistant (Lumina)' });
    await dialog.getByPlaceholder('Type your message...').fill('Do you have a lifetime warranty?');
    await dialog.getByRole('button', { name: 'Send' }).click();

    await expect(dialog.getByTestId('chat-message-assistant').last()).toContainText(
      /lifetime warranty/i
    );
  });
});
