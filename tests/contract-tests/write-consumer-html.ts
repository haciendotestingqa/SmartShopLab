import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { writeHtmlReport, type HtmlReportRow } from '../html-report';

interface VitestJson {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  testResults?: Array<{
    name?: string;
    status?: string;
    assertionResults?: Array<{ title?: string; fullName?: string; status?: string; failureMessages?: string[] }>;
  }>;
}

const jsonPath = path.resolve(__dirname, 'reports', 'consumer.json');
const reportPath = path.resolve(__dirname, 'reports', 'pact-consumer-report.html');

function main(): void {
  if (!existsSync(jsonPath)) {
    writeHtmlReport({
      filePath: reportPath,
      title: 'SmartShopLab — Pact Consumer',
      summary: 'No se encontró consumer.json (¿falló vitest antes de escribir el reporter?)',
      passed: false,
      rows: [],
      tool: 'pact',
    });
    console.log(`Reporte HTML: ${reportPath}`);
    return;
  }

  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as VitestJson;
  const rows: HtmlReportRow[] = [];

  for (const file of data.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      const passed = assertion.status === 'passed';
      rows.push({
        name: assertion.fullName ?? assertion.title ?? file.name ?? 'test',
        passed,
        detail: passed ? 'OK' : (assertion.failureMessages ?? []).join('\n'),
      });
    }
  }

  const total = data.numTotalTests ?? rows.length;
  const passedCount = data.numPassedTests ?? rows.filter((r) => r.passed).length;
  const failedCount = data.numFailedTests ?? rows.filter((r) => !r.passed).length;
  const suitePassed = failedCount === 0 && total > 0;

  writeHtmlReport({
    filePath: reportPath,
    title: 'SmartShopLab — Pact Consumer',
    subtitle: 'Genera el archivo Pact contra un mock (no requiere backend)',
    summary: `${passedCount}/${total} tests passed`,
    passed: suitePassed,
    rows,
    tool: 'pact',
  });
  console.log(`Reporte HTML: ${reportPath}`);
}

main();
