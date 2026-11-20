import { randomUUID } from 'crypto';
import { products } from './catalog';
import type { AiChatRequest, AiChatResponse } from './types';

function buildSystemPrompt(): string {
  const catalogLines = products
    .map(
      (p) =>
        `- ${p.name}: price $${p.price.toFixed(2)} ${p.currency}, stock ${p.stock}, category ${p.category}. ${p.description}`
    )
    .join('\n');

  return `You are the SmartShopLab store assistant (Lumina).
Only use the catalog information below. Do not invent policies, discounts, warranties, shipping times, or prices.
If the user asks about something not in the catalog, say so clearly and do not claim invented benefits.

Catalog:
${catalogLines}

Real store policies:
- There is no lifetime warranty.
- There is no automatic 90% discount.
- There is no free 1-hour shipping worldwide.
Reply in English, briefly and helpfully.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Real chat via OpenRouter (used by the lab mobile app).
 * Web stays on ai-mock without this provider.
 */
export async function chatWithOpenRouter(request: AiChatRequest): Promise<AiChatResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Load .env.ai-evals in the backend or export the variable.'
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

  let lastError = 'No response from OpenRouter';

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
          lastError = 'OpenRouter returned no content';
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
