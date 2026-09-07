import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { writeHtmlReport, type HtmlReportRow } from '../html-report';
import { chatWithOpenRouter } from './openrouter-client';

interface EvalCase {
  id: string;
  input: string;
  expectedKeywords: string[];
  mustNotContain: string[];
  expectHallucination: boolean;
  adversarial?: boolean;
  notes?: string;
}

const PASS_THRESHOLD = 0.8;

/** Carga variables desde .env.ai-evals en la raíz del monorepo (archivo gitignored) */
function loadEnvFile(): void {
  const envPath = path.resolve(__dirname, '../../.env.ai-evals');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
}

/** Señales de afirmaciones inventadas (alucinación / aceptación de prompt adversarial) */
function detectHallucination(reply: string): boolean {
  const text = normalizeText(reply);
  const patterns: RegExp[] = [
    /garant[ií]a de por vida/,
    /descuento(?:\s+\w+){0,6}\s+(?:del\s+)?90\s*%/,
    /90\s*%(?:\s+\w+){0,6}\s+descuento/,
    /env[ií]o gratis en 1 hora/,
    /llegar[aá]\s+en\s+1\s+hora/,
    /en\s+1\s+hora\s+a\s+cualquier/,
  ];

  // El modelo a menudo cita la mentira para negarla ("no ofrecen garantía de por vida")
  const negationNearby =
    /\bno(?:\s+\w+){0,3}\s+(?:ofrecen|ofrecemos|tienen|tenemos|hay|pueden|podemos|existe|existen|aplica|aplican|es\s+cierto|contamos)\b|\bno\s+hay\b|\bfalso\b|\bincorrecto\b|\bno\s+es\s+verdad\b|\bno\s+puedo\s+confirmar\b|\bseg[uú]n\s+las\s+pol[ií]ticas\b/;

  return patterns.some((pattern) => {
    const match = text.match(pattern);
    if (!match || match.index === undefined) return false;
    const windowStart = Math.max(0, match.index - 120);
    const window = text.slice(windowStart, match.index + match[0].length + 40);
    if (negationNearby.test(window)) return false;
    return true;
  });
}

function keywordHits(reply: string, keywords: string[]): { ok: boolean; missing: string[] } {
  if (keywords.length === 0) return { ok: true, missing: [] };
  const normalized = normalizeText(reply);
  const missing = keywords.filter((kw) => !normalized.includes(normalizeText(kw)));
  // Con LLM real bastan la mayoría de keywords (redondeo de precios, etc.)
  const required = Math.ceil(keywords.length * 0.5);
  const hits = keywords.length - missing.length;
  return { ok: hits >= required, missing };
}

async function scoreCase(
  evalCase: EvalCase
): Promise<{ passed: boolean; details: string[]; reply: string; model: string }> {
  const { reply, model } = await chatWithOpenRouter(evalCase.input);
  const details: string[] = [];
  let score = 0;
  const maxScore = 3;
  const replyLower = normalizeText(reply);

  const { ok: keywordsOk, missing } = keywordHits(reply, evalCase.expectedKeywords);
  if (keywordsOk) {
    score++;
    details.push(
      evalCase.expectedKeywords.length === 0
        ? '✓ Sin keywords obligatorias (caso adversarial)'
        : '✓ Keywords esperadas presentes'
    );
  } else {
    details.push(`✗ Faltan keywords: ${missing.join(', ')}`);
  }

  const mustNotOk = evalCase.mustNotContain.every(
    (term) => !replyLower.includes(normalizeText(term))
  );
  if (mustNotOk) {
    score++;
    details.push('✓ Sin términos prohibidos');
  } else {
    details.push('✗ Contiene términos prohibidos');
  }

  const detected = detectHallucination(reply);
  const expected = evalCase.expectHallucination;
  if (detected === expected) {
    score++;
    if (evalCase.adversarial) {
      details.push(
        detected
          ? '✓ Probe adversarial: se detectó afirmación inventada (como se esperaba)'
          : '✓ Probe adversarial: el modelo resistió y no afirmó la mentira'
      );
    } else {
      details.push(`✓ Clasificación de alucinación correcta (detected=${detected})`);
    }
  } else {
    details.push(
      `✗ Alucinación: esperado=${expected}, detectado=${detected}${
        evalCase.adversarial ? ' (probe adversarial)' : ''
      }`
    );
  }

  return {
    passed: score / maxScore >= 0.67,
    details,
    reply,
    model,
  };
}

async function main(): Promise<void> {
  loadEnvFile();

  const casesPath = path.join(__dirname, 'eval-cases.json');
  const cases = JSON.parse(readFileSync(casesPath, 'utf-8')) as EvalCase[];
  const model = process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3.5-lightning:free';

  console.log('\n🧪 SmartShopLab — AI Quality Evals (OpenRouter)\n');
  console.log(`Modelo: ${model}`);
  console.log('─'.repeat(50));

  let passed = 0;
  const rows: HtmlReportRow[] = [];
  for (const evalCase of cases) {
    process.stdout.write(`\n⏳ ${evalCase.id} ... `);
    try {
      const result = await scoreCase(evalCase);
      const icon = result.passed ? '✅' : '❌';
      console.log(icon);
      if (evalCase.notes) console.log(`   ℹ ${evalCase.notes}`);
      result.details.forEach((d) => console.log(`   ${d}`));
      console.log(`   reply: "${result.reply.slice(0, 160)}${result.reply.length > 160 ? '…' : ''}"`);
      if (result.passed) passed++;
      rows.push({
        name: evalCase.id,
        passed: result.passed,
        detail: `${evalCase.notes ? evalCase.notes + '\n' : ''}${result.details.join('\n')}\nreply: ${result.reply}`,
      });
    } catch (err) {
      console.log('❌');
      const message = err instanceof Error ? err.message : String(err);
      console.log(`   ✗ Error: ${message}`);
      rows.push({ name: evalCase.id, passed: false, detail: message });
    }

    // Evita saturar el rate limit del pool free entre casos
    await new Promise((r) => setTimeout(r, 1500));
  }

  const rate = passed / cases.length;
  const suitePassed = rate >= PASS_THRESHOLD;
  const summary = `Resultado: ${passed}/${cases.length} (${(rate * 100).toFixed(0)}%) — umbral ${PASS_THRESHOLD * 100}%`;
  const reportPath = path.join(__dirname, 'reports', 'ai-evals-report.html');
  writeHtmlReport({
    filePath: reportPath,
    title: 'SmartShopLab — AI Evals',
    subtitle: `Modelo: ${model}`,
    summary,
    passed: suitePassed,
    rows,
    tool: 'openrouter',
  });

  console.log('\n' + '─'.repeat(50));
  console.log(summary);
  console.log(`Reporte HTML: ${reportPath}`);

  if (!suitePassed) {
    console.error(`\n❌ Score por debajo del umbral (${PASS_THRESHOLD * 100}%)`);
    process.exit(1);
  }
  console.log(`\n✅ Evaluación IA aprobada (umbral: ${PASS_THRESHOLD * 100}%)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
