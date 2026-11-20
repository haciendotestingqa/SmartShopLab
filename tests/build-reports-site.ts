// Builds a static site with all QA Lab HTML reports.
// Sources: tests/.../reports and published-reports (Maestro overlays).
// Output: reports-site/ (gitignored), ready for GitHub Pages.
//
// Guide — full lab set = 12 HTML (this file does not require them; documents only):
//   1. playwright-report.html                         → Web E2E (Playwright)
//   2. newman-report.html                             → API (Newman)
//   3. newman-demo-fail-report.html                   → API (Newman)
//   4. pact-consumer-report.html                      → Contracts (Pact)
//   5. pact-provider-report.html                      → Contracts (Pact, green)
//   5b. pact-provider-demo-fail-report.html           → Contracts (Pact demo magicField)
//   6. k6-report.html                                 → Load (k6)
//   7. ai-evals-report.html                           → AI Evals   (npm run test:ai)
//   8. llm-judge-report.html                          → AI Evals   (npm run test:ai:judge)
//   9. maestro-ai-report-android.html                 → AI Evals   (Maestro + juez)
//  10. maestro-ai-report-ios.html                     → AI Evals
//  11. maestro-report-android.html                    → Mobile (Maestro)
//  12. maestro-report-ios.html                        → Mobile (Maestro)
// CI usually generates 1–8; Maestro (9–12) usually lands in published-reports/ via reports:collect.
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
import {
  NEON,
  brandLogoMarkup,
  toolForGroup,
  toolLogoMarkup,
} from './html-report';

interface ReportEntry {
  id: string;
  title: string;
  href: string;
  group: string;
  source: string;
}

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'reports-site');

/** Directories to scan. published-reports wins on same basename+group. */
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
 * Assigns index section. null = exclude (e.g. legacy maestro-report.html).
 * Maestro UI → Mobile; Maestro AI (judge) → AI Evals.
 */
function groupForReport(dir: string, filePath: string): string | null {
  const base = path.basename(filePath);

  // Leftovers without platform (before *-android / *-ios)
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
  if (dir.includes('contract-tests') || dir.endsWith('/pact')) return 'Contracts (Pact)';
  if (dir.includes('performance') || dir.endsWith('/k6')) return 'Load (k6)';
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
  // Key: group::basename — published-reports wins over tests/**/reports
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

  // Copy winners only (avoids orphan HTML in files/)
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
    'Contracts (Pact)',
    'Load (k6)',
    'AI Evals',
    'Mobile (Maestro)',
  ];

  const sections = expectedGroups
    .map((group) => {
      const items = groups.get(group) ?? [];
      let emptyMsg = 'No reports in this run';
      if (group.includes('Maestro')) {
        emptyMsg =
          'Catalog/cart: run Maestro UI → reports:collect → commit published-reports/maestro/maestro-report-*.html';
      } else if (group.includes('AI')) {
        emptyMsg =
          'Heuristics/judge in CI (OPENROUTER_API_KEY) or Maestro AI → published-reports/maestro/maestro-ai-report-*.html';
      }
      const groupTool = toolForGroup(group);
      const groupLogo = groupTool ? toolLogoMarkup(groupTool, true) : '';
      const rows =
        items.length > 0
          ? items
              .map((item) => {
                const tool = toolForGroup(group, item.source) ?? groupTool;
                const logo = tool ? toolLogoMarkup(tool, true) : '';
                return `<tr>
          <td class="report-cell">
            ${logo}
            <a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a>
          </td>
          <td><code>${escapeHtml(item.source)}</code></td>
        </tr>`;
              })
              .join('\n')
          : `<tr><td colspan="2" class="empty">${escapeHtml(emptyMsg)}</td></tr>`;
      return `<section>
        <div class="section-head">
          ${groupLogo}
          <h2>${escapeHtml(group)}</h2>
        </div>
        <table>
          <thead><tr><th>Report</th><th>Source</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SmartShopLab — QA Reports</title>
  <style>
    :root {
      --neon-pink: ${NEON.pink};
      --neon-orange: ${NEON.orange};
      --neon-yellow: ${NEON.yellow};
      --lab-dark: ${NEON.dark};
      --lab-bg: ${NEON.bg};
      --lab-text: ${NEON.text};
    }
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: var(--lab-bg); color: var(--lab-text); }
    header {
      background: var(--lab-dark);
      color: #fff;
      padding: 24px 32px;
      box-shadow: 0 8px 24px rgb(10 9 18 / 45%);
      border-bottom: 3px solid var(--neon-pink);
    }
    header p { margin: 8px 0 0; color: rgb(255 255 255 / 92%); }
    header a { color: var(--neon-yellow); font-weight: 600; }
    .header-row { display: flex; align-items: center; gap: 18px; }
    .brand-logo {
      width: 160px; height: 160px; border-radius: 24px; object-fit: cover;
      border: 2px solid rgb(255 255 255 / 55%); box-shadow: 0 4px 14px rgb(10 9 18 / 35%);
    }
    .brand-tag {
      font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
      color: var(--neon-yellow); margin-bottom: 4px;
    }
    header h1 { margin: 0; font-size: 1.6rem; letter-spacing: -0.02em; }
    main { padding: 24px 32px 48px; max-width: 1100px; color: #000; }
    main h1, main h2, main h3, main p, main td, main th, main code, main a, main .empty {
      color: #000;
    }
    .section-head { display: flex; align-items: center; gap: 12px; margin-top: 32px; }
    .section-head h2 { margin: 0; font-size: 1.15rem; color: #000; }
    .section-head .tool-label { color: #000; }
    .tool-logo { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
    .tool-logo svg { display: block; filter: drop-shadow(0 1px 3px rgb(15 23 42 / 15%)); }
    .tool-label { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #000; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgb(15 23 42 / 8%); margin-top: 12px; border: 1px solid rgb(247 20 170 / 12%); overflow: visible; }
    th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; color: #000 !important; }
    thead th, th {
      background: #d8d8de !important;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: #000 !important;
      border-bottom: 1px solid #c4c4cc;
      box-shadow: 0 6px 14px rgb(10 9 18 / 18%);
    }
    thead th:first-child { border-top-left-radius: 12px; }
    thead th:last-child { border-top-right-radius: 12px; }
    .report-cell { display: flex; align-items: center; gap: 12px; }
    .report-cell a { color: #000; font-weight: 600; text-decoration: none; }
    .report-cell a:hover { color: #000; text-decoration: underline; }
    .report-cell .tool-label { display: none; }
    code { font-size: 12px; color: #000; }
    .empty { color: #000; }
  </style>
</head>
<body>
  <header>
    <div class="header-row">
      ${brandLogoMarkup(160)}
      <div>
        <div class="brand-tag">SmartShopLab QA Lab</div>
        <h1>QA Reports</h1>
        <p>HTML report index for the lab (Playwright, Newman, Pact, k6, AI, Maestro).</p>
        <p>
          Demo:
          <a href="https://smart-shop-lab-web-frontend.vercel.app">Web</a> ·
          <a href="https://smartshoplab.onrender.com/health">API</a> ·
          <a href="https://github.com/haciendotestingqa/SmartShopLab">Repo</a>
        </p>
        <p>Generated: ${escapeHtml(new Date().toISOString())} · Total reports: ${reports.length}</p>
      </div>
    </div>
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
  console.log(`Reports site: ${outDir}`);
  console.log(`Entries: ${reports.length}`);
  for (const r of reports) {
    console.log(`  - [${r.group}] ${r.title} ← ${r.source}`);
  }
}

main();
