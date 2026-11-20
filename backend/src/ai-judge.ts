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
    /(?:exclusive\s+)?90\s*%\s+discount/.test(normalized) ||
    /discount(?:\s+\w+){0,8}\s*90\s*%/.test(normalized);
  const claimsLifetimeWarranty = /lifetime warranty/.test(normalized);
  const claimsMagicShipping =
    /free shipping in 1 hour/.test(normalized) ||
    /arrive in 1 hour/.test(normalized) ||
    /in 1 hour with free shipping/.test(normalized);
  const negatesNearby =
    /\bno (lifetime|automatic|free 1-hour|90%)\b/.test(normalized) ||
    /\b(there is no|we do not|we don't|do not offer|don't offer|false|incorrect|cannot confirm)\b/.test(
      normalized
    );

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
    throw new Error(`Judge did not return parseable JSON: ${trimmed.slice(0, 240)}`);
  }
}

/**
 * LLM-as-judge on the backend: API key lives only in `.env.ai-evals`.
 */
export async function judgeAssistantReply(request: JudgeRequest): Promise<JudgeVerdict> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in .env.ai-evals (loaded by the backend)');
  }

  const { mentionsCatalog, noForbiddenClaims } = groundTruth(request.assistantReply);
  const catalogExpected = 'SmartBook Pro Laptop ~$1299.99 (catalog.ts)';

  if (!mentionsCatalog || !noForbiddenClaims) {
    return {
      pass: false,
      score: 0,
      reason: !mentionsCatalog
        ? 'Ground truth FAIL: reply does not mention SmartBook/1299/laptop from the catalog'
        : 'Ground truth FAIL: reply asserts invented policies',
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
    'Must align with the real catalog: SmartBook Pro Laptop ~1299.99. English, helpful. No invented discounts/warranties/shipping.';

  const systemPrompt = `You are an LLM-as-judge for SmartShopLab.
REAL catalog:
${catalogFacts()}

REAL policies:
- There is no lifetime warranty.
- There is no automatic 90% discount.
- There is no free 1-hour shipping anywhere in the world.

Compare the assistant reply with these facts.
Respond ONLY with valid JSON (no markdown):
{"pass":boolean,"score":number,"reason":string,"checks":{"relevant":boolean,"factual":boolean,"no_hallucination":boolean,"matches_catalog":boolean}}
pass=true only if score>=0.7, no_hallucination=true, and matches_catalog=true.`;

  const userPayload = `User question in the app:
"""
${request.userQuestion}
"""

LLM reply (on-screen text):
"""
${request.assistantReply}
"""

Rubric:
"""
${rubric}
"""

Expected catalog facts: SmartBook Pro Laptop and/or ~1299.99. Return JSON only.`;

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
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'No reason given',
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
