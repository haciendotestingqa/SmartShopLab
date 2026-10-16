import { expect, test } from '@playwright/test';

/**
 * Capa WEB — IA mockeada (`backend/src/ai-mock.ts`).
 * Contraste del lab: la app móvil usa Maestro (UI) + `npm run test:mobile:ai` (LLM-as-judge).
 *
 * Locators: role + accessible name / placeholder. `getByTestId` solo si no hay hook a11y
 * (p. ej. burbujas de chat sin rol semántico propio).
 */
test.describe('Chatbot IA', () => {
  test('abre widget y recibe respuesta factual sobre laptop', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Abrir asistente de IA' }).click();
    const dialog = page.getByRole('dialog', { name: 'Asistente SmartShopLab' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Online')).toBeVisible();

    await dialog.getByPlaceholder('Escribe tu mensaje...').fill('¿Cuánto cuesta la laptop?');
    await dialog.getByRole('button', { name: 'Enviar' }).click();

    // Outcome visible: la respuesta del asistente menciona producto/precio (testid solo en burbuja)
    await expect(dialog.getByTestId('chat-message-assistant').last()).toContainText(
      /SmartBook|1299|laptop/i
    );
  });

  test('detecta respuesta alucinada con trigger de garantía', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir asistente de IA' }).click();

    const dialog = page.getByRole('dialog', { name: 'Asistente SmartShopLab' });
    await dialog.getByPlaceholder('Escribe tu mensaje...').fill('¿Tienen garantía de por vida?');
    await dialog.getByRole('button', { name: 'Enviar' }).click();

    await expect(dialog.getByTestId('chat-message-assistant').last()).toContainText(
      /garantía de por vida/i
    );
  });
});
