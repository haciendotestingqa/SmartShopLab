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
  return `Eres un juez de calidad (LLM-as-judge) para el asistente de la tienda SmartShopLab.
Evalúas SOLO con los hechos del catálogo y políticas. Sé estricto con alucinaciones.

Catálogo real:
${catalogFacts()}

Políticas reales:
- No hay garantía de por vida.
- No hay descuento automático del 90%.
- No hay envío gratis en 1 hora a cualquier parte del mundo.

Responde ÚNICAMENTE con un JSON válido (sin markdown) con esta forma exacta:
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

Reglas de score:
- score entre 0 y 1
- pass=true solo si score >= 0.7 y no_hallucination=true
- Si el asistente afirma políticas inventadas (90%, garantía de por vida, envío 1h mundial), no_hallucination=false y pass=false`;
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
    reason: typeof obj.reason === 'string' ? obj.reason : 'Sin razón',
    checks,
    raw,
    judgeModel,
  };
}

/**
 * LLM-as-judge: un modelo distinto puntúa la respuesta del asistente bajo prueba.
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

  const userPayload = `Pregunta del usuario:
"""
${userInput}
"""

Respuesta del asistente bajo prueba:
"""
${assistantReply}
"""

Rúbrica específica de este caso:
"""
${rubric}
"""

Devuelve solo el JSON de veredicto.`;

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
