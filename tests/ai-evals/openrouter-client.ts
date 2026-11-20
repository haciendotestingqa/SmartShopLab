import { products } from '../../backend/src/catalog';

export interface OpenRouterChatResult {
  reply: string;
  model: string;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

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

function resolveModelQueue(preferred?: string): string[] {
  const primary = preferred ?? process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3.5-lightning:free';
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ??
    'liquid/lfm-2.5-2.6b:free,thinkingmachines/inkling-small:free,z-ai/glm-5.2:free,google/gemma-4-26b-a4b-it:free')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  return [...new Set([primary, ...fallbacks])];
}

async function requestOnce(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  baseUrl: string,
  siteUrl: string,
  appName: string
): Promise<{ ok: true; result: OpenRouterChatResult } | { ok: false; status: number; body: string }> {
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 90000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': siteUrl,
        'X-Title': appName,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages,
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      return { ok: false, status: response.status, body };
    }

    const data = JSON.parse(body) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return {
        ok: false,
        status: 502,
        body: 'OpenRouter returned no content in choices[0].message.content',
      };
    }

    return { ok: true, result: { reply, model: data.model ?? model } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        status: 408,
        body: `Timeout after ${timeoutMs}ms waiting for ${model}. The :free pool is often slow; retrying or using fallback…`,
      };
    }
    return {
      ok: false,
      status: 500,
      body: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generic completions (assistant or judge) with 429 retries and :free model fallback.
 */
export async function completeWithOpenRouter(
  messages: ChatMessage[],
  options?: { model?: string }
): Promise<OpenRouterChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing OPENROUTER_API_KEY. Copy .env.ai-evals.example to .env.ai-evals and add your key.'
    );
  }

  const baseUrl = (process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(
    /\/$/,
    ''
  );
  const siteUrl = process.env.OPENROUTER_SITE_URL ?? 'http://localhost:5173';
  const appName = process.env.OPENROUTER_APP_NAME ?? 'SmartShopLab-AI-Evals';
  const maxRetries = Number(process.env.OPENROUTER_MAX_RETRIES ?? 3);
  const models = resolveModelQueue(options?.model);

  let lastError = 'No response from OpenRouter';

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const outcome = await requestOnce(messages, model, apiKey, baseUrl, siteUrl, appName);
      if (outcome.ok) {
        if (model !== models[0]) {
          console.log(`(fallback → ${model})`);
        }
        return outcome.result;
      }

      lastError = `OpenRouter HTTP ${outcome.status} [${model}]: ${outcome.body}`;
      const retryable = outcome.status === 429 || outcome.status === 408 || outcome.status >= 500;
      if (!retryable || attempt === maxRetries) break;

      const waitMs = 2000 * attempt;
      console.log(`(${outcome.status} on ${model}, retry ${attempt}/${maxRetries} in ${waitMs}ms)`);
      await sleep(waitMs);
    }
  }

  throw new Error(
    `${lastError}\nTip: the :free pool may be saturated. Change OPENROUTER_MODEL in .env.ai-evals (e.g. liquid/lfm-2.5-2.6b:free) or wait a few minutes.`
  );
}

/**
 * Calls the store assistant (system prompt + user message).
 */
export async function chatWithOpenRouter(message: string): Promise<OpenRouterChatResult> {
  return completeWithOpenRouter([
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: message },
  ]);
}
