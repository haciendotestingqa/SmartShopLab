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
        body: 'OpenRouter no devolvió contenido en choices[0].message.content',
      };
    }

    return { ok: true, result: { reply, model: data.model ?? model } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        status: 408,
        body: `Timeout tras ${timeoutMs}ms esperando a ${model}. El pool :free suele ir lento; reintentando o usando fallback…`,
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
 * Completions genéricas (asistente o juez) con reintentos 429 y fallback de modelos :free.
 */
export async function completeWithOpenRouter(
  messages: ChatMessage[],
  options?: { model?: string }
): Promise<OpenRouterChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta OPENROUTER_API_KEY. Copia .env.ai-evals.example a .env.ai-evals y añade tu clave.'
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

  let lastError = 'Sin respuesta de OpenRouter';

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
      console.log(`(${outcome.status} en ${model}, reintento ${attempt}/${maxRetries} en ${waitMs}ms)`);
      await sleep(waitMs);
    }
  }

  throw new Error(
    `${lastError}\nSugerencia: el pool :free está saturado. Cambia OPENROUTER_MODEL en .env.ai-evals (ej. liquid/lfm-2.5-2.6b:free) o espera unos minutos.`
  );
}

/**
 * Llama al asistente de tienda (system prompt + mensaje de usuario).
 */
export async function chatWithOpenRouter(message: string): Promise<OpenRouterChatResult> {
  return completeWithOpenRouter([
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: message },
  ]);
}
