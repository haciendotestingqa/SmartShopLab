import { readFileSync } from 'fs';
import path from 'path';
import { writeHtmlReport, type HtmlReportRow } from '../html-report';
import { loadAiEvalsEnv } from './load-env';
import { judgeAssistantReply } from './llm-judge';
import { chatWithOpenRouter } from './openrouter-client';

interface JudgeCase {
  id: string;
  input: string;
  rubric: string;
  notes?: string;
}

const PASS_THRESHOLD = 0.67;

async function main(): Promise<void> {
  loadAiEvalsEnv();

  const casesPath = path.join(__dirname, 'judge-cases.json');
  const cases = JSON.parse(readFileSync(casesPath, 'utf-8')) as JudgeCase[];
  const assistantModel = process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3.5-lightning:free';
  const judgeModel =
    process.env.OPENROUTER_JUDGE_MODEL ?? assistantModel;

  console.log('\n⚖️  SmartShopLab — Mobile AI: LLM-as-Judge\n');
  console.log('Contraste del lab:');
  console.log('  • Web  → Playwright + ai-mock (respuestas simuladas)');
  console.log('  • App  → Maestro (UI) + este juez LLM (calidad OpenRouter)');
  console.log(`Asistente (bajo prueba): ${assistantModel}`);
  console.log(`Juez:                    ${judgeModel}`);
  console.log('─'.repeat(50));
  console.log(
    'Flujo: 1) el asistente responde  2) otro LLM puntúa con rúbrica (JSON pass/score/reason)\n'
  );

  let passed = 0;
  const rows: HtmlReportRow[] = [];

  for (const judgeCase of cases) {
    process.stdout.write(`\n⏳ ${judgeCase.id} ... `);
    try {
      const { reply, model: usedAssistant } = await chatWithOpenRouter(judgeCase.input);
      await new Promise((r) => setTimeout(r, 1500));

      const verdict = await judgeAssistantReply(judgeCase.input, reply, judgeCase.rubric);
      const icon = verdict.pass ? '✅' : '❌';
      console.log(icon);
      if (judgeCase.notes) console.log(`   ℹ ${judgeCase.notes}`);
      console.log(`   assistant[${usedAssistant}]: "${reply.slice(0, 140)}${reply.length > 140 ? '…' : ''}"`);
      console.log(
        `   judge[${verdict.judgeModel}]: pass=${verdict.pass} score=${verdict.score.toFixed(2)}`
      );
      console.log(
        `   checks: relevant=${verdict.checks.relevant} factual=${verdict.checks.factual} no_hallucination=${verdict.checks.no_hallucination}`
      );
      console.log(`   reason: ${verdict.reason}`);

      if (verdict.pass) passed++;
      rows.push({
        name: judgeCase.id,
        passed: verdict.pass,
        detail: [
          judgeCase.notes ?? '',
          `input: ${judgeCase.input}`,
          `rubric: ${judgeCase.rubric}`,
          `assistant (${usedAssistant}): ${reply}`,
          `judge (${verdict.judgeModel}): score=${verdict.score} pass=${verdict.pass}`,
          `checks: ${JSON.stringify(verdict.checks)}`,
          `reason: ${verdict.reason}`,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (err) {
      console.log('❌');
      const message = err instanceof Error ? err.message : String(err);
      console.log(`   ✗ Error: ${message}`);
      rows.push({ name: judgeCase.id, passed: false, detail: message });
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  const rate = cases.length === 0 ? 0 : passed / cases.length;
  const suitePassed = rate >= PASS_THRESHOLD;
  const summary = `Resultado: ${passed}/${cases.length} (${(rate * 100).toFixed(0)}%) — umbral ${PASS_THRESHOLD * 100}%`;
  const reportPath = path.join(__dirname, 'reports', 'llm-judge-report.html');

  writeHtmlReport({
    filePath: reportPath,
    title: 'SmartShopLab — Mobile LLM-as-Judge',
    subtitle: `App móvil · Asistente: ${assistantModel} · Juez: ${judgeModel}`,
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
  console.log(`\n✅ Mobile LLM-as-Judge aprobado (umbral: ${PASS_THRESHOLD * 100}%)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
