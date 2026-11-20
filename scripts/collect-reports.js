#!/usr/bin/env node
/**
 * Copies local HTML reports to published-reports/ for versioning
 * so GitHub Pages can show them after the next push / workflow run.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const destRoot = path.join(root, 'published-reports');

const sources = [
  {
    from: 'tests/e2e-web/reports',
    to: 'web',
    match: (n) => n.endsWith('.html'),
  },
  {
    from: 'tests/api-integration/reports',
    to: 'newman',
    match: (n) => n.endsWith('.html'),
  },
  {
    from: 'tests/contract-tests/reports',
    to: 'pact',
    match: (n) => n.endsWith('.html'),
  },
  {
    from: 'tests/performance/reports',
    to: 'k6',
    match: (n) => n.endsWith('.html'),
  },
  {
    from: 'tests/ai-evals/reports',
    to: 'ai-evals',
    match: (n) => n.endsWith('.html'),
  },
  {
    from: 'tests/e2e-mobile/reports',
    to: 'maestro',
    // Platform-specific reports only (no generic maestro-report.html or last-judge)
    match: (n) =>
      /^maestro-(ai-)?report-(android|ios)\.html$/.test(n),
  },
];

let copied = 0;
for (const src of sources) {
  const fromDir = path.join(root, src.from);
  if (!fs.existsSync(fromDir)) continue;
  const toDir = path.join(destRoot, src.to);
  fs.mkdirSync(toDir, { recursive: true });
  for (const name of fs.readdirSync(fromDir)) {
    if (!src.match(name)) continue;
    fs.copyFileSync(path.join(fromDir, name), path.join(toDir, name));
    console.log(`→ published-reports/${src.to}/${name}`);
    copied++;
  }
}

console.log(`\nCopied: ${copied}`);
console.log("Next: git add 'published-reports/**/*.html' && git commit && git push");
console.log('Only HTML is versioned (README and the rest stay local).');
console.log('The QA Reports workflow will refresh https://haciendotestingqa.github.io/SmartShopLab/');