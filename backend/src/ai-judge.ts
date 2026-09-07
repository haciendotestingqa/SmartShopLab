import { products } from './catalog';

export interface JudgeRequest {
  userQuestion: string;
  assistantReply: string;
  rubric?: string;
}

export interface JudgeVerdict {
  pass: boolean;
  score: number;
  reason: string;
  mentionsCatalog: boolean;
  noForbiddenClaims: boolean;
  checks: {
    relevant: boolean;
    factual: boolean;
    no_hallucination: boolean;
    matches_catalog: boolean;
  };
  catalogExpected: string;
  judgeModel: string;
}

function catalogFacts(): string {
  return products
    .map(
      (p) =>
        `- ${p.name}: $${p.price.toFixed(2)} ${p.currency}, stock ${p.stock}, ${p.category}`
    )
    .join('\n');
}

function groundTruth(assistantReply: string): {
  mentionsCatalog: boolean;
  noForbiddenClaims: boolean;
} {
  const normalized = assistantReply.toLowerCase();
  const mentionsCatalog =
    normalized.includes('smartbook') ||
    normalized.includes('1299') ||
    (normalized.includes('laptop') && normalized.includes('pro'));

  const claimsFakeDiscount =
    /descuento(?:\s+\w+){0,8}\s*90\s*%/.test(normalized) ||
    /90\s*%(?:\s+\w+){0,8}\s*descuento/.test(normalized);
  const claimsLifetimeWarranty = /garant[ií]a de por vida/.test(normalized);
  const claimsMagicShipping =
    /env[ií]o gratis en 1 hora/.test(normalized) ||
    /en 1 hora a cualquier/.test(normalized);
  const negatesNearby =
    /\bno (hay|ofrecen|tenemos|existe|es cierto)\b/.test(normalized) ||
    /\bseg[uú]n las pol[ií]ticas\b/.test(normalized) ||
    /\bfalso\b/.test(normalized);

  const noForbiddenClaims =
    (!claimsFakeDiscount && !claimsLifetimeWarranty && !claimsMagicShipping) ||
    negatesNearby;

  return { mentionsCatalog, noForbiddenClaims };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error(`El juez no devolvió JSON parseable: ${trimmed.slice(0, 240)}`);
  }
}

/**
 * LLM-as-judge en el backend: la API key solo vive en `.env.ai-evals`.
 */
export async function judgeAssistantReply(request: JudgeRequest): Promise<JudgeVerdict> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Falta OPENROUTER_API_KEY en .env.ai-evals (cargada por el backend)');
  }

  const { mentionsCatalog, noForbiddenClaims } = groundTruth(request.assistantReply);
  const catalogExpected = 'SmartBook Pro Laptop ~$1299.99 (catalog.ts)';

  if (!mentionsCatalog || !noForbiddenClaims) {
    return {
      pass: false,
      score: 0,
      reason: !mentionsCatalog
        ? 'Ground truth FAIL: la respuesta no menciona SmartBook/1299/laptop del catálogo'
        : 'Ground truth FAIL: la respuesta afirma políticas inventadas',
      mentionsCatalog,
      noForbiddenClaims,
      checks: {
        relevant: false,
        factual: false,
        no_hallucination: noForbiddenClaims,
        matches_catalog: mentionsCatalog,
      },
      catalogExpected,
      judgeModel: 'ground-truth',
    };
  }

  const baseUrl = (process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(
    /\/$/,
    ''
  );
  const judgeModel =
    process.env.OPENROUTER_JUDGE_MODEL ??
    process.env.OPENROUTER_MODEL ??
    'liquid/lfm-2.5-2.6b:free';
  const rubric =
    request.rubric ??
    'Debe basarse en el catálogo real: SmartBook Pro Laptop ~1299.99. Español, útil. Sin inventar descuentos/garantías/envíos.';

  const systemPrompt = `Eres un juez LLM-as-judge para SmartShopLab.
Catálogo REAL:
${catalogFacts()}

Políticas REALES:
- No hay garantía de por vida.
- No hay descuento automático del 90%.
- No hay envío gratis en 1 hora a cualquier parte del mundo.

Compara la respuesta del asistente con esos hechos.
Responde ÚNICAMENTE con JSON válido (sin markdown):
{"pass":boolean,"score":number,"reason":string,"checks":{"relevant":boolean,"factual":boolean,"no_hallucination":boolean,"matches_catalog":boolean}}
pass=true solo si score>=0.7, no_hallucination=true y matches_catalog=true.`;

  const userPayload = `Pregunta del usuario en la app:
"""
${request.userQuestion}
"""

Respuesta del LLM (texto en pantalla):
"""
${request.assistantReply}
"""

Rúbrica:
"""
${rubric}
"""

Hechos de catálogo esperados: SmartBook Pro Laptop y/o ~1299.99. Devuelve solo JSON.`;

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
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_NAME ?? 'SmartShopLab-Judge',
      },
      body: JSON.stringify({
        model: judgeModel,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPayload },
        ],
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(`OpenRouter HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
    }

    const data = JSON.parse(bodyText) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = extractJsonObject(raw) as Record<string, unknown>;
    const checksRaw = (parsed.checks ?? {}) as Record<string, unknown>;
    const score = typeof parsed.score === 'number' ? Math.min(1, Math.max(0, parsed.score)) : 0;
    const checks = {
      relevant: Boolean(checksRaw.relevant),
      factual: Boolean(checksRaw.factual),
      no_hallucination: Boolean(checksRaw.no_hallucination),
      matches_catalog: Boolean(checksRaw.matches_catalog),
    };
    const pass =
      Boolean(parsed.pass) &&
      score >= 0.7 &&
      checks.no_hallucination &&
      checks.matches_catalog &&
      mentionsCatalog &&
      noForbiddenClaims;

    return {
      pass,
      score,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'Sin razón',
      mentionsCatalog,
      noForbiddenClaims,
      checks,
      catalogExpected,
      judgeModel: data.model ?? judgeModel,
    };
  } finally {
    clearTimeout(timer);
  }
}
