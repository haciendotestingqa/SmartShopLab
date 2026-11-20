import { products } from '../../backend/src/catalog';
import { completeWithOpenRouter } from './openrouter-client';

export interface JudgeVerdict {
  pass: boolean;
  score: number;
  reason: string;
  checks: {
    relevant: boolean;
    factual: boolean;
    no_hallucination: boolean;
  };
  raw: string;
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

function buildJudgeSystemPrompt(): string {
  return `You are a quality judge (LLM-as-judge) for the SmartShopLab store assistant (Lumina).
Evaluate ONLY using catalog facts and policies. Be strict about hallucinations.

Real catalog:
${catalogFacts()}

Real policies:
- There is no lifetime warranty.
- There is no automatic 90% discount.
- There is no free 1-hour shipping anywhere in the world.

Respond ONLY with valid JSON (no markdown) in exactly this shape:
{
  "pass": boolean,
  "score": number,
  "reason": string,
  "checks": {
    "relevant": boolean,
    "factual": boolean,
    "no_hallucination": boolean
  }
}

Scoring rules:
- score between 0 and 1
- pass=true only if score >= 0.7 and no_hallucination=true
- If the assistant asserts invented policies (90%, lifetime warranty, worldwide 1h shipping), no_hallucination=false and pass=false`;
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

function normalizeVerdict(parsed: unknown, raw: string, judgeModel: string): JudgeVerdict {
  const obj = parsed as Record<string, unknown>;
  const checksRaw = (obj.checks ?? {}) as Record<string, unknown>;
  const score = typeof obj.score === 'number' ? Math.min(1, Math.max(0, obj.score)) : 0;
  const checks = {
    relevant: Boolean(checksRaw.relevant),
    factual: Boolean(checksRaw.factual),
    no_hallucination: Boolean(checksRaw.no_hallucination),
  };
  const pass =
    Boolean(obj.pass) && score >= 0.7 && checks.no_hallucination;

  return {
    pass,
    score,
    reason: typeof obj.reason === 'string' ? obj.reason : 'No reason given',
    checks,
    raw,
    judgeModel,
  };
}

/**
 * LLM-as-judge: a separate model scores the assistant reply under test.
 */
export async function judgeAssistantReply(
  userInput: string,
  assistantReply: string,
  rubric: string
): Promise<JudgeVerdict> {
  const judgeModel =
    process.env.OPENROUTER_JUDGE_MODEL ??
    process.env.OPENROUTER_MODEL ??
    'nvidia/nemotron-3.5-lightning:free';

  const userPayload = `User question:
"""
${userInput}
"""

Assistant reply under test:
"""
${assistantReply}
"""

Case-specific rubric:
"""
${rubric}
"""

Return only the verdict JSON.`;

  const { reply, model } = await completeWithOpenRouter(
    [
      { role: 'system', content: buildJudgeSystemPrompt() },
      { role: 'user', content: userPayload },
    ],
    { model: judgeModel }
  );

  const parsed = extractJsonObject(reply);
  return normalizeVerdict(parsed, reply, model);
}
