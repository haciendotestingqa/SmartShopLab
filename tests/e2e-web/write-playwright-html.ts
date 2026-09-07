import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { writeHtmlReport, type HtmlReportRow } from '../html-report';

interface PlaywrightSpec {
  title: string;
  ok?: boolean;
  tests?: Array<{
    projectName?: string;
    results?: Array<{ status?: string; duration?: number; error?: { message?: string } }>;
    status?: string;
  }>;
}

interface PlaywrightSuite {
  title: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightJson {
  suites?: PlaywrightSuite[];
  stats?: {
    expected?: number;
    unexpected?: number;
    duration?: number;
  };
}

const jsonPath = path.resolve(__dirname, 'reports', 'results.json');
const reportPath = path.resolve(__dirname, 'reports', 'playwright-report.html');

function walk(suite: PlaywrightSuite, parentTitles: string[], rows: HtmlReportRow[]): void {
  const titles = suite.title ? [...parentTitles, suite.title] : parentTitles;

  for (const spec of suite.specs ?? []) {
    const t = spec.tests?.[0];
    const result = t?.results?.[t.results.length - 1];
    const status = result?.status ?? t?.status ?? (spec.ok ? 'expected' : 'unexpected');
    const passed = status === 'expected' || status === 'passed';
    const skipped = status === 'skipped';
    rows.push({
      name: [...titles, spec.title].filter(Boolean).join(' › '),
      passed: skipped || passed,
      detail: [
        result?.duration != null ? `Duración: ${(result.duration / 1000).toFixed(2)}s` : '',
        skipped
          ? 'skipped'
          : passed
            ? 'OK'
            : result?.error?.message?.split('\n').slice(0, 4).join('\n') || status,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  for (const child of suite.suites ?? []) {
    walk(child, titles, rows);
  }
}

function main(): void {
  if (!existsSync(jsonPath)) {
    writeHtmlReport({
      filePath: reportPath,
      title: 'SmartShopLab — Playwright E2E',
      summary: `No se encontró ${jsonPath}`,
      passed: false,
      rows: [],
      tool: 'playwright',
    });
    console.log(`Reporte HTML: ${reportPath}`);
    return;
  }

  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as PlaywrightJson;
  const rows: HtmlReportRow[] = [];
  for (const suite of data.suites ?? []) {
    walk(suite, [], rows);
  }

  const unexpected = data.stats?.unexpected ?? rows.filter((r) => !r.passed).length;
  const expected = data.stats?.expected ?? rows.filter((r) => r.passed).length;
  const total = rows.length || expected + unexpected;
  const suitePassed = unexpected === 0 && rows.every((r) => r.passed);
  const durationSec =
    data.stats?.duration != null ? `${(data.stats.duration / 1000).toFixed(1)}s` : undefined;

  writeHtmlReport({
    filePath: reportPath,
    title: 'SmartShopLab — Playwright E2E',
    subtitle: 'Chromium · catálogo, carrito y chatbot',
    summary: `${expected}/${total} passed${durationSec ? ` · ${durationSec}` : ''}`,
    passed: suitePassed,
    rows,
    tool: 'playwright',
  });
  console.log(`Reporte HTML: ${reportPath}`);
}

main();
