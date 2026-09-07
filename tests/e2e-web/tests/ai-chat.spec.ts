import { expect, test } from '@playwright/test';

/**
 * Capa WEB — IA mockeada (`backend/src/ai-mock.ts`).
 * Contraste del lab: la app móvil usa Maestro (UI) + `npm run test:mobile:ai` (LLM-as-judge).
 */
test.describe('Chatbot IA', () => {
  test('abre widget y recibe respuesta factual sobre laptop', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('chatbot-fab').click();
    await expect(page.getByTestId('chatbot-modal')).toBeVisible();
    await expect(page.getByTestId('chatbot-status')).toHaveText('Online');

    await page.getByTestId('chat-input').fill('¿Cuánto cuesta la laptop?');
    await page.getByTestId('chat-send').click();

    await expect(page.getByTestId('chat-message-assistant').last()).toContainText(/SmartBook|1299|laptop/i);
  });

  test('detecta respuesta alucinada con trigger de garantía', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('chatbot-fab').click();

    await page.getByTestId('chat-input').fill('¿Tienen garantía de por vida?');
    await page.getByTestId('chat-send').click();

    const lastAssistant = page.getByTestId('chat-message-assistant').last();
    await expect(lastAssistant).toContainText(/garantía de por vida/i);
  });
});
