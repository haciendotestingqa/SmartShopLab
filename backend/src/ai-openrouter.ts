import { randomUUID } from 'crypto';
import { products } from './catalog';
import type { AiChatRequest, AiChatResponse } from './types';

function buildSystemPrompt(): string {
  const catalogLines = products
    .map(
      (p) =>
        `- ${p.name}: precio $${p.price.toFixed(2)} ${p.currency}, stock ${p.stock}, categoría ${p.category}. ${p.description}`
    )
    .join('\n');

  return `Eres el asistente de la tienda SmartShopLab.
Solo puedes usar la información del catálogo siguiente. No inventes políticas, descuentos, garantías, plazos de envío ni precios.
Si el usuario pregunta algo que no está en el catálogo, dilo claramente y no afirmes beneficios inventados.

Catálogo:
${catalogLines}

Políticas reales de la tienda:
- No hay garantía de por vida.
- No hay descuento automático del 90%.
- No hay envío gratis en 1 hora a cualquier parte del mundo.
Responde en español, de forma breve y útil.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chat real vía OpenRouter (usado por la app móvil en el lab).
 * La web sigue en ai-mock sin este provider.
 */
export async function chatWithOpenRouter(request: AiChatRequest): Promise<AiChatResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY no configurada. Carga .env.ai-evals en el backend o exporta la variable.'
    );
  }

  const baseUrl = (process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(
    /\/$/,
    ''
  );
  const model = process.env.OPENROUTER_MODEL ?? 'liquid/lfm-2.5-2.6b:free';
        const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? '')
    .split(',')
    .map((m: string) => m.trim())
    .filter(Boolean);
  const models = [...new Set([model, ...fallbacks])];
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 90000);
  const maxRetries = Number(process.env.OPENROUTER_MAX_RETRIES ?? 3);

  let lastError = 'Sin respuesta de OpenRouter';

  for (const candidate of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'http://localhost:5173',
            'X-Title': process.env.OPENROUTER_APP_NAME ?? 'SmartShopLab-Mobile',
          },
          body: JSON.stringify({
            model: candidate,
            temperature: 0.2,
            messages: [
              { role: 'system', content: buildSystemPrompt() },
              { role: 'user', content: request.message },
            ],
          }),
        });

        const bodyText = await response.text();
        if (!response.ok) {
          lastError = `OpenRouter HTTP ${response.status} [${candidate}]: ${bodyText.slice(0, 200)}`;
          const retryable = response.status === 429 || response.status >= 500;
          if (!retryable || attempt === maxRetries) break;
          await sleep(2000 * attempt);
          continue;
        }

        const data = JSON.parse(bodyText) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (!reply) {
          lastError = 'OpenRouter no devolvió contenido';
          break;
        }

        return {
          reply,
          isHallucination: false,
          sessionId: request.sessionId ?? randomUUID(),
          sources: ['openrouter', candidate, 'catalog.ts'],
        };
      } catch (err) {
        lastError =
          err instanceof Error && err.name === 'AbortError'
            ? `Timeout OpenRouter (${timeoutMs}ms) [${candidate}]`
            : err instanceof Error
              ? err.message
              : String(err);
        if (attempt === maxRetries) break;
        await sleep(2000 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw new Error(lastError);
}
