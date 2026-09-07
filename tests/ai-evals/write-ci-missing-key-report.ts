// Genera un HTML placeholder si CI no tiene OPENROUTER_API_KEY.
import path from 'path';
import { writeHtmlReport } from '../html-report';

const reportPath = path.join(__dirname, 'reports', 'ai-evals-report.html');

writeHtmlReport({
  filePath: reportPath,
  title: 'SmartShopLab — AI Evals',
  subtitle: 'OpenRouter · pendiente de secret en CI',
  summary:
    'No se ejecutó: falta el secret OPENROUTER_API_KEY en GitHub Actions (Settings → Secrets and variables → Actions).',
  passed: false,
  tool: 'openrouter',
  rows: [
    {
      name: 'Configurar secret OPENROUTER_API_KEY',
      passed: false,
      detail:
        'Repo → Settings → Secrets and variables → Actions → New repository secret\nName: OPENROUTER_API_KEY\nValue: tu key de https://openrouter.ai/keys\nLuego: Actions → QA Reports → Run workflow',
    },
    {
      name: 'Suites esperadas',
      passed: false,
      detail: 'npm run test:ai → ai-evals-report.html\nnpm run test:ai:judge → llm-judge-report.html',
    },
  ],
});

console.log(`Reporte HTML (placeholder): ${reportPath}`);
