import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import os from 'os';
import path from 'path';
import { writeHtmlReport, type HtmlReportRow } from '../html-report';

interface MaestroCommandEntry {
  command?: Record<string, unknown>;
  metadata?: {
    status?: string;
    duration?: number;
    timestamp?: number;
    error?: { message?: string };
  };
}

interface JudgeVerdictFile {
  pass?: boolean;
  score?: number;
  reason?: string;
  mentionsCatalog?: boolean;
  noForbiddenClaims?: boolean;
  checks?: {
    relevant?: boolean;
    factual?: boolean;
    no_hallucination?: boolean;
    matches_catalog?: boolean;
  };
  catalogExpected?: string;
  judgeModel?: string;
  userQuestion?: string;
  assistantReply?: string;
  rubric?: string;
  generatedAt?: string;
}

function latestMaestroRunDir(): string | null {
  const base = path.join(os.homedir(), '.maestro', 'tests');
  if (!existsSync(base)) return null;
  const dirs = readdirSync(base)
    .map((name) => path.join(base, name))
    .filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    })
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return dirs[0] ?? null;
}

function commandLabel(entry: MaestroCommandEntry): string {
  const cmd = entry.command ?? {};
  const type = Object.keys(cmd)[0] ?? 'command';
  const body = (cmd[type] ?? {}) as Record<string, unknown>;

  if (type === 'tapOnElement' || type === 'tapOn') {
    const sel = (body.selector ?? body) as Record<string, unknown>;
    return `Tap: ${sel.idRegex ?? sel.textRegex ?? sel.point ?? 'element'}`;
  }
  if (
    type === 'assertConditionCommand' ||
    type === 'assertVisible' ||
    type === 'assertTrueCommand'
  ) {
    const condition = (body.condition ?? body) as Record<string, unknown>;
    const visible = (condition.visible ?? condition) as Record<string, unknown>;
    const label = typeof body.label === 'string' ? body.label : undefined;
    if (label) return `Assert: ${label}`;
    return `Assert visible: ${visible.idRegex ?? visible.textRegex ?? JSON.stringify(visible).slice(0, 80)}`;
  }
  if (type === 'inputTextCommand' || type === 'inputText') {
    return `Input: ${String(body.text ?? '').slice(0, 60)}`;
  }
  if (type === 'launchAppCommand') {
    return `Launch app: ${body.appId ?? 'app'}`;
  }
  if (type === 'openLinkCommand') {
    return `Open link: ${body.link ?? ''}`;
  }
  if (type === 'runScriptCommand') {
    const src = String(body.sourceDescription ?? body.scriptPath ?? body.file ?? 'script');
    if (src.includes('judge-last-reply')) {
      return 'Run script: LLM-as-judge (POST /api/ai/judge)';
    }
    return `Run script: ${src}`;
  }
  if (type === 'copyTextCommand') {
    const sel = (body.selector ?? body) as Record<string, unknown>;
    return `Copy text: ${sel.idRegex ?? 'element'}`;
  }
  if (type === 'runFlowCommand') {
    return 'Run flow (conditional)';
  }
  if (type === 'extendedWaitUntil' || type.includes('Wait')) {
    const label = typeof body.label === 'string' ? body.label : undefined;
    return label ? `Wait: ${label}` : `Wait: ${type}`;
  }
  return type;
}

function statusPassed(status: string | undefined): boolean {
  const s = (status ?? '').toUpperCase();
  return s === 'COMPLETED' || s === 'WARNED' || s === 'SKIPPED' || s === 'SUCCESS';
}

function isAiChatFile(file: string): boolean {
  return /ai-chat/i.test(file);
}

function loadJudgeVerdict(): JudgeVerdictFile | null {
  const verdictPath = path.resolve(__dirname, 'reports', 'last-judge-verdict.json');
  if (!existsSync(verdictPath)) return null;
  try {
    return JSON.parse(readFileSync(verdictPath, 'utf-8')) as JudgeVerdictFile;
  } catch {
    return null;
  }
}

function judgeRows(verdict: JudgeVerdictFile): HtmlReportRow[] {
  const checks = verdict.checks ?? {};
  const score =
    typeof verdict.score === 'number' ? verdict.score.toFixed(2) : String(verdict.score ?? '—');
  return [
    {
      name: 'LLM-as-judge · veredicto',
      passed: Boolean(verdict.pass),
      detail: [
        `pass=${Boolean(verdict.pass)} · score=${score}`,
        verdict.judgeModel ? `modelo: ${verdict.judgeModel}` : null,
        verdict.reason ? `reason: ${verdict.reason}` : null,
        verdict.catalogExpected ? `catalogExpected: ${verdict.catalogExpected}` : null,
        verdict.generatedAt ? `generatedAt: ${verdict.generatedAt}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    },
    {
      name: 'Ground truth · menciona catálogo',
      passed: Boolean(verdict.mentionsCatalog),
      detail: `mentionsCatalog=${Boolean(verdict.mentionsCatalog)}`,
    },
    {
      name: 'Ground truth · sin políticas inventadas',
      passed: Boolean(verdict.noForbiddenClaims),
      detail: `noForbiddenClaims=${Boolean(verdict.noForbiddenClaims)}`,
    },
    {
      name: 'Juez · matches_catalog',
      passed: Boolean(checks.matches_catalog),
      detail: `checks.matches_catalog=${Boolean(checks.matches_catalog)}`,
    },
    {
      name: 'Juez · no_hallucination',
      passed: Boolean(checks.no_hallucination),
      detail: `checks.no_hallucination=${Boolean(checks.no_hallucination)}`,
    },
    {
      name: 'Juez · relevant / factual',
      passed: Boolean(checks.relevant) && Boolean(checks.factual),
      detail: `relevant=${Boolean(checks.relevant)} · factual=${Boolean(checks.factual)}`,
    },
    {
      name: 'Caso · pregunta y respuesta',
      passed: Boolean(verdict.pass),
      detail: [
        verdict.userQuestion ? `input: ${verdict.userQuestion}` : null,
        verdict.rubric ? `rubric: ${verdict.rubric}` : null,
        verdict.assistantReply ? `assistant: ${verdict.assistantReply}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
}

function rowsFromCommandFiles(
  runDir: string,
  commandFiles: string[]
): { rows: HtmlReportRow[]; failedSteps: number; totalSteps: number } {
  const rows: HtmlReportRow[] = [];
  let failedSteps = 0;
  let totalSteps = 0;

  for (const file of commandFiles) {
    const flowName = file
      .replace(/^commands-\(/, '')
      .replace(/\)\.json$/, '')
      .replace(/\.json$/, '');
    const raw = JSON.parse(readFileSync(path.join(runDir, file), 'utf-8')) as MaestroCommandEntry[];
    const entries = Array.isArray(raw) ? raw : [];

    rows.push({
      name: `Flow: ${flowName}`,
      passed: entries.every((e) => statusPassed(e.metadata?.status)),
      detail: `${entries.length} pasos · artefacto: ${path.join(runDir, file)}`,
    });

    for (const entry of entries) {
      const status = (entry.metadata?.status ?? 'UNKNOWN').toUpperCase();
      const type = Object.keys(entry.command ?? {})[0] ?? '';
      if (type === 'applyConfigurationCommand' || type === 'defineVariablesCommand') continue;

      totalSteps++;
      const ok = statusPassed(status);
      if (!ok) failedSteps++;

      const duration =
        typeof entry.metadata?.duration === 'number' ? `${entry.metadata.duration} ms` : '—';
      const err = entry.metadata?.error?.message
        ? `\nerror: ${entry.metadata.error.message}`
        : '';

      rows.push({
        name: commandLabel(entry),
        passed: ok,
        detail: `status=${status} · ${duration}${err}`,
      });
    }
  }

  return { rows, failedSteps, totalSteps };
}

function writeOneReport(options: {
  htmlPath: string;
  title: string;
  subtitle: string;
  tool: 'maestro' | 'openrouter';
  platformLabel: string;
  runDir: string | null;
  commandFiles: string[];
  includeJudge: boolean;
  exitHint: string | undefined;
}): void {
  const {
    htmlPath,
    title,
    subtitle,
    tool,
    platformLabel,
    runDir,
    commandFiles,
    includeJudge,
    exitHint,
  } = options;

  if (!runDir || !existsSync(runDir) || commandFiles.length === 0) {
    writeHtmlReport({
      filePath: htmlPath,
      title,
      subtitle,
      summary: 'No se encontró carpeta de debug en ~/.maestro/tests',
      passed: false,
      rows: [],
      tool,
    });
    console.log(`Reporte HTML: ${htmlPath}`);
    return;
  }

  const { rows: stepRows, failedSteps, totalSteps } = rowsFromCommandFiles(runDir, commandFiles);
  const verdict = includeJudge ? loadJudgeVerdict() : null;
  const rows = [...(verdict ? judgeRows(verdict) : []), ...stepRows];

  const screenshots = readdirSync(runDir).filter((f) => f.endsWith('.png'));
  const processFailed = exitHint !== undefined && exitHint !== '0';
  const judgeFailed = verdict ? !verdict.pass : false;
  const suitePassed = failedSteps === 0 && !processFailed && !judgeFailed;
  const summary = [
    `plataforma: ${platformLabel}`,
    includeJudge ? 'suite: Maestro UI + LLM-as-judge' : 'suite: Maestro UI',
    `${totalSteps - failedSteps}/${totalSteps} pasos OK`,
    verdict && typeof verdict.score === 'number' ? `juez score=${verdict.score.toFixed(2)}` : null,
    `debug: ${runDir}`,
    screenshots.length ? `${screenshots.length} screenshot(s)` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  writeHtmlReport({
    filePath: htmlPath,
    title,
    subtitle,
    summary,
    passed: suitePassed,
    rows,
    tool,
  });

  console.log(`Reporte HTML: ${htmlPath}`);
}

function main(): void {
  const platformRaw = (process.env.MAESTRO_PLATFORM || '').trim().toLowerCase();
  // Siempre con sufijo android|ios (nunca maestro-report.html genérico)
  const platform = platformRaw === 'ios' ? 'ios' : 'android';
  const platformLabel = platform === 'ios' ? 'iOS' : 'Android';
  const exitHint = process.env.MAESTRO_EXIT_CODE;
  const runDirArg = process.argv[2];
  const runDir = runDirArg ? path.resolve(runDirArg) : latestMaestroRunDir();
  const kindHint = (process.env.MAESTRO_REPORT_KIND || '').trim().toLowerCase();

  const commandFiles =
    runDir && existsSync(runDir)
      ? readdirSync(runDir)
          .filter((f) => f.startsWith('commands-') && f.endsWith('.json'))
          .sort()
      : [];

  const aiFiles = commandFiles.filter(isAiChatFile);
  const uiFiles = commandFiles.filter((f) => !isAiChatFile(f));

  const writeAi = kindHint === 'ai' || aiFiles.length > 0;
  const writeUi = kindHint === 'ui' || (kindHint !== 'ai' && uiFiles.length > 0);

  if (writeUi) {
    const reportName = `maestro-report-${platform}.html`;
    writeOneReport({
      htmlPath: path.resolve(__dirname, 'reports', reportName),
      title: `SmartShopLab — Maestro ${platformLabel}`,
      subtitle: `E2E Expo Go (${platformLabel}) · catálogo / carrito`,
      tool: 'maestro',
      platformLabel,
      runDir,
      commandFiles: uiFiles.length > 0 ? uiFiles : commandFiles,
      includeJudge: false,
      // Si en la misma corrida también hay AI, el exit code global no debe marcar FAIL el UI
      exitHint: aiFiles.length > 0 ? undefined : exitHint,
    });
  }

  if (writeAi) {
    const reportName = `maestro-ai-report-${platform}.html`;
    writeOneReport({
      htmlPath: path.resolve(__dirname, 'reports', reportName),
      title: `SmartShopLab — Maestro ${platformLabel} · LLM-as-Judge`,
      subtitle: `E2E Expo Go (${platformLabel}) · chat con LLM real + juez OpenRouter`,
      tool: 'openrouter',
      platformLabel,
      runDir,
      commandFiles: aiFiles.length > 0 ? aiFiles : commandFiles,
      includeJudge: true,
      exitHint,
    });
  }

  if (!writeUi && !writeAi) {
    const reportName = `maestro-report-${platform}.html`;
    writeOneReport({
      htmlPath: path.resolve(__dirname, 'reports', reportName),
      title: `SmartShopLab — Maestro ${platformLabel}`,
      subtitle: `E2E Expo Go (${platformLabel})`,
      tool: 'maestro',
      platformLabel,
      runDir,
      commandFiles,
      includeJudge: false,
      exitHint,
    });
  }

  if (runDir) console.log(`Fuente Maestro: ${runDir}`);
}

main();
