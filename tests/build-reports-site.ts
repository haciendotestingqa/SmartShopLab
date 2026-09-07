// Construye un sitio estático con todos los reportes HTML del QA Lab.
// Fuentes: tests/.../reports y published-reports (Maestro u overlays).
// Salida: reports-site/ (gitignore) lista para GitHub Pages.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import path from 'path';

interface ReportEntry {
  id: string;
  title: string;
  href: string;
  group: string;
  source: string;
}

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'reports-site');

/** Directorios a escanear. published-reports gana si hay el mismo basename+group. */
const SOURCE_DIRS = [
  'tests/e2e-web/reports',
  'tests/api-integration/reports',
  'tests/contract-tests/reports',
  'tests/performance/reports',
  'tests/ai-evals/reports',
  'tests/e2e-mobile/reports',
  'published-reports/maestro',
  'published-reports/web',
  'published-reports/newman',
  'published-reports/pact',
  'published-reports/k6',
  'published-reports/ai-evals',
] as const;

/**
 * Asigna sección del índice. null = no incluir (p. ej. maestro-report.html legacy).
 * Maestro UI → Mobile; Maestro AI (juez) → AI Evals.
 */
function groupForReport(dir: string, filePath: string): string | null {
  const base = path.basename(filePath);

  // Residuos sin plataforma (antes de *-android / *-ios)
  if (/^maestro-(ai-)?report\.html$/.test(base)) return null;

  const isMaestroDir =
    dir === 'tests/e2e-mobile/reports' || dir === 'published-reports/maestro';

  if (isMaestroDir) {
    if (/^maestro-ai-report-(android|ios)\.html$/.test(base)) return 'AI Evals';
    if (/^maestro-report-(android|ios)\.html$/.test(base)) return 'Mobile (Maestro)';
    return null;
  }

  if (dir.includes('e2e-web') || dir.endsWith('/web')) return 'Web E2E (Playwright)';
  if (dir.includes('api-integration') || dir.endsWith('/newman')) return 'API (Newman)';
  if (dir.includes('contract-tests') || dir.endsWith('/pact')) return 'Contratos (Pact)';
  if (dir.includes('performance') || dir.endsWith('/k6')) return 'Carga (k6)';
  if (dir.includes('ai-evals') || dir.endsWith('/ai-evals')) return 'AI Evals';

  return null;
}

function listHtmlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith('.html') && !name.startsWith('.')) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

function titleFromFile(filePath: string): string {
  const base = path.basename(filePath, '.html');
  return base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function collectReports(): ReportEntry[] {
  // Clave: group::basename — published-reports gana sobre tests/**/reports
  type Candidate = ReportEntry & { prefer: number; absPath: string };
  const byKey = new Map<string, Candidate>();

  for (const dir of SOURCE_DIRS) {
    const absDir = path.join(root, dir);
    const prefer = dir.startsWith('published-reports') ? 2 : 1;
    for (const file of listHtmlFiles(absDir)) {
      const group = groupForReport(dir, file);
      if (!group) continue;

      const base = path.basename(file);
      const key = `${group}::${base}`;
      const existing = byKey.get(key);
      if (existing && existing.prefer >= prefer) continue;

      byKey.set(key, {
        id: '',
        title: titleFromFile(file),
        href: '',
        group,
        source: path.relative(root, file).replace(/\\/g, '/'),
        prefer,
        absPath: file,
      });
    }
  }

  // Solo copiar ganadores (evita HTML huérfanos en files/)
  const entries: ReportEntry[] = [];
  for (const c of byKey.values()) {
    const destName = `${c.source.replace(/\//g, '__')}`;
    const destPath = path.join(outDir, 'files', destName);
    mkdirSync(path.dirname(destPath), { recursive: true });
    copyFileSync(c.absPath, destPath);
    entries.push({
      id: destName,
      title: c.title,
      href: `./files/${destName}`,
      group: c.group,
      source: c.source,
    });
  }

  return entries.sort((a, b) =>
    a.group === b.group ? a.title.localeCompare(b.title) : a.group.localeCompare(b.group)
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function writeIndex(reports: ReportEntry[]): void {
  const groups = new Map<string, ReportEntry[]>();
  for (const r of reports) {
    const list = groups.get(r.group) ?? [];
    list.push(r);
    groups.set(r.group, list);
  }

  const expectedGroups = [
    'Web E2E (Playwright)',
    'API (Newman)',
    'Contratos (Pact)',
    'Carga (k6)',
    'AI Evals',
    'Mobile (Maestro)',
  ];

  const sections = expectedGroups
    .map((group) => {
      const items = groups.get(group) ?? [];
      let emptyMsg = 'Sin reportes en esta corrida';
      if (group.includes('Maestro')) {
        emptyMsg =
          'Catálogo/carrito: corre Maestro UI → reports:collect → commit published-reports/maestro/maestro-report-*.html';
      } else if (group.includes('AI')) {
        emptyMsg =
          'Heurísticas/juez en CI (OPENROUTER_API_KEY) o Maestro AI → published-reports/maestro/maestro-ai-report-*.html';
      }
      const rows =
        items.length > 0
          ? items
              .map(
                (item) => `<tr>
          <td><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></td>
          <td><code>${escapeHtml(item.source)}</code></td>
        </tr>`
              )
              .join('\n')
          : `<tr><td colspan="2" class="empty">${escapeHtml(emptyMsg)}</td></tr>`;
      return `<section>
        <h2>${escapeHtml(group)}</h2>
        <table>
          <thead><tr><th>Reporte</th><th>Fuente</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SmartShopLab — Reportes QA</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #F9FAFB; color: #0F172A; }
    header { background: #1E293B; color: white; padding: 24px 32px; }
    header p { margin: 8px 0 0; color: #cbd5e1; }
    header a { color: #93c5fd; }
    main { padding: 24px 32px 48px; max-width: 1100px; }
    h2 { margin-top: 32px; font-size: 1.15rem; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgb(15 23 42 / 8%); margin-top: 12px; }
    th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    th { background: #f1f5f9; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
    code { font-size: 12px; color: #475569; }
    .empty { color: #64748b; }
  </style>
</head>
<body>
  <header>
    <h1>SmartShopLab — Reportes QA</h1>
    <p>Índice de reportes HTML del laboratorio (Playwright, Newman, Pact, k6, AI, Maestro).</p>
    <p>
      Demo:
      <a href="https://smart-shop-lab-web-frontend.vercel.app">Web</a> ·
      <a href="https://smartshoplab.onrender.com/health">API</a> ·
      <a href="https://github.com/haciendotestingqa/SmartShopLab">Repo</a>
    </p>
    <p>Generado: ${escapeHtml(new Date().toISOString())} · Total reportes: ${reports.length}</p>
  </header>
  <main>
    ${sections}
  </main>
</body>
</html>`;

  writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
  writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf-8');
}

function main(): void {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(path.join(outDir, 'files'), { recursive: true });
  const reports = collectReports();
  writeIndex(reports);
  console.log(`Sitio de reportes: ${outDir}`);
  console.log(`Entradas: ${reports.length}`);
  for (const r of reports) {
    console.log(`  - [${r.group}] ${r.title} ← ${r.source}`);
  }
}

main();
