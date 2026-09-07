import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { writeHtmlReport, type HtmlReportRow } from '../html-report';

interface NewmanAssertion {
  assertion?: string;
  error?: { message?: string } | null;
}

interface NewmanExecution {
  item?: { name?: string };
  response?: { code?: number; responseTime?: number };
  assertions?: NewmanAssertion[];
}

interface NewmanJson {
  run?: {
    executions?: NewmanExecution[];
    stats?: {
      assertions?: { total?: number; failed?: number };
      requests?: { total?: number; failed?: number };
    };
    failures?: Array<{ error?: { message?: string }; source?: { name?: string } }>;
  };
}

const args = process.argv.slice(2);
const jsonPath = args[0]
  ? path.resolve(args[0])
  : path.resolve(__dirname, 'reports/newman.json');
const htmlPath = args[1]
  ? path.resolve(args[1])
  : path.resolve(__dirname, 'reports/newman-report.html');
const title = args[2] ?? 'SmartShopLab — Newman API';

function main(): void {
  if (!existsSync(jsonPath)) {
    writeHtmlReport({
      filePath: htmlPath,
      title,
      summary: `No se encontró ${jsonPath}`,
      passed: false,
      rows: [],
      tool: 'newman',
    });
    console.log(`Reporte HTML: ${htmlPath}`);
    return;
  }

  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as NewmanJson;
  const rows: HtmlReportRow[] = [];

  for (const exec of data.run?.executions ?? []) {
    const name = exec.item?.name ?? 'request';
    const assertions = exec.assertions ?? [];
    const failed = assertions.filter((a) => a.error);
    const passed = failed.length === 0 && assertions.length > 0;
    const lines = [
      `HTTP ${exec.response?.code ?? '?'} · ${exec.response?.responseTime ?? '?'} ms`,
      ...assertions.map((a) => {
        const label = a.assertion ?? 'assertion';
        return a.error ? `✗ ${label}: ${a.error.message ?? 'failed'}` : `✓ ${label}`;
      }),
    ];
    rows.push({
      name,
      passed: assertions.length === 0 ? (exec.response?.code ?? 0) < 400 : passed,
      detail: lines.join('\n'),
    });
  }

  const totalAsserts = data.run?.stats?.assertions?.total ?? rows.length;
  const failedAsserts = data.run?.stats?.assertions?.failed ?? rows.filter((r) => !r.passed).length;
  const suitePassed = failedAsserts === 0;

  writeHtmlReport({
    filePath: htmlPath,
    title,
    subtitle: 'Integración API (Postman/Newman) — mismo estilo que el resto del QA Lab',
    summary: `${totalAsserts - failedAsserts}/${totalAsserts} assertions OK · ${data.run?.stats?.requests?.total ?? rows.length} requests`,
    passed: suitePassed,
    rows,
    tool: 'newman',
  });

  console.log(`Reporte HTML: ${htmlPath}`);
}

main();
