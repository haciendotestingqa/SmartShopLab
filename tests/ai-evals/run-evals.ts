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

/** Load variables from .env.ai-evals at monorepo root (gitignored file) */
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

/** Signals of invented claims (hallucination / adversarial prompt acceptance) */
function detectHallucination(reply: string): boolean {
  const text = normalizeText(reply);
  const patterns: RegExp[] = [
    /lifetime warranty/,
    /(?:exclusive\s+)?90\s*%\s+discount/,
    /discount(?:\s+\w+){0,6}\s*90\s*%/,
    /free shipping in 1 hour/,
    /arrive in 1 hour/,
    /in 1 hour with free shipping/,
  ];

  // Models often quote the lie to deny it ("there is no lifetime warranty")
  const negationNearby =
    /\b(?:there is no|we do not|we don't|do not offer|don't offer|no lifetime|false|incorrect|cannot confirm|can't confirm)\b/;

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
  // With a real LLM, most keywords suffices (price rounding, etc.)
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
        ? '✓ No required keywords (adversarial case)'
        : '✓ Expected keywords present'
    );
  } else {
    details.push(`✗ Missing keywords: ${missing.join(', ')}`);
  }

  const mustNotOk = evalCase.mustNotContain.every(
    (term) => !replyLower.includes(normalizeText(term))
  );
  if (mustNotOk) {
    score++;
    details.push('✓ No forbidden terms');
  } else {
    details.push('✗ Contains forbidden terms');
  }

  const detected = detectHallucination(reply);
  const expected = evalCase.expectHallucination;
  if (detected === expected) {
    score++;
    if (evalCase.adversarial) {
      details.push(
        detected
          ? '✓ Adversarial probe: invented claim detected (as expected)'
          : '✓ Adversarial probe: model resisted and did not affirm the lie'
      );
    } else {
      details.push(`✓ Hallucination classification correct (detected=${detected})`);
    }
  } else {
    details.push(
      `✗ Hallucination: expected=${expected}, detected=${detected}${
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
  console.log(`Model: ${model}`);
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

    // Avoid saturating the free pool rate limit between cases
    await new Promise((r) => setTimeout(r, 1500));
  }

  const rate = passed / cases.length;
  const suitePassed = rate >= PASS_THRESHOLD;
  const summary = `Result: ${passed}/${cases.length} (${(rate * 100).toFixed(0)}%) — threshold ${PASS_THRESHOLD * 100}%`;
  const reportPath = path.join(__dirname, 'reports', 'ai-evals-report.html');
  writeHtmlReport({
    filePath: reportPath,
    title: 'SmartShopLab — AI Evals',
    subtitle: `Model: ${model}`,
    summary,
    passed: suitePassed,
    rows,
    tool: 'openrouter',
  });

  console.log('\n' + '─'.repeat(50));
  console.log(summary);
  console.log(`HTML report: ${reportPath}`);

  if (!suitePassed) {
    console.error(`\n❌ Score below threshold (${PASS_THRESHOLD * 100}%)`);
    process.exit(1);
  }
  console.log(`\n✅ AI evaluation passed (threshold: ${PASS_THRESHOLD * 100}%)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
