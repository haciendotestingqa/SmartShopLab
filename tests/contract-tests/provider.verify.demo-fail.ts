import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { writeHtmlReport } from '../html-report';

/**
 * Demo educativa: verifica el pact con `magicField`.
 * Esperado: FAIL (el backend no envía ese campo).
 * No es suite crítica — ver CI `continue-on-error`.
 */
const pactPath = path.resolve(
  __dirname,
  'pacts/web-frontend-demo-break-smartshoplab-backend.json'
);
const providerBaseUrl = process.env.PROVIDER_BASE_URL ?? 'http://localhost:3001';
const reportPath = path.resolve(__dirname, 'reports', 'pact-provider-demo-fail-report.html');

async function verify(): Promise<void> {
  const verifier = new Verifier({
    provider: 'smartshoplab-backend',
    providerBaseUrl,
    pactUrls: [pactPath],
    stateHandlers: {
      'catalog exists': async () => {},
    },
  });

  await verifier.verifyProvider();
  console.log('UNEXPECTED: demo provider verification passed (magicField should fail).');
}

verify()
  .then(() => {
    writeHtmlReport({
      filePath: reportPath,
      title: 'SmartShopLab — Pact Provider (Demo FAIL)',
      subtitle: `Provider URL: ${providerBaseUrl}`,
      summary:
        'UNEXPECTED PASS — el demo debería fallar por magicField. ¿Cambió el backend?',
      passed: false,
      tool: 'pact',
      rows: [
        {
          name: 'GET /api/products (magicField demo)',
          passed: false,
          detail: 'Se esperaba un FAIL educativo y el provider pasó.',
        },
      ],
    });
    console.log(`Reporte HTML: ${reportPath}`);
    process.exit(1);
  })
  .catch((err) => {
    const detail = err instanceof Error ? err.message : String(err);
    // Expected educational failure → report as intentional demo FAIL (passed:false for Pages)
    writeHtmlReport({
      filePath: reportPath,
      title: 'SmartShopLab — Pact Provider (Demo FAIL)',
      subtitle: `Provider URL: ${providerBaseUrl}`,
      summary:
        'Expected FAIL — el consumer demo pide magicField y el backend no lo envía',
      passed: false,
      tool: 'pact',
      rows: [
        {
          name: 'GET /api/products (lab magicField)',
          passed: false,
          detail:
            `${detail}\n\nEsperado en este lab: el consumer demo pide magicField y el backend no lo envía.\nMensaje típico: Actual map is missing the following keys: magicField`,
        },
      ],
    });
    console.log('Pact provider DEMO FAIL (expected):', detail.split('\n')[0]);
    console.log(`Reporte HTML: ${reportPath}`);
    // Non-zero so CI can mark the step as failed while continue-on-error keeps Pages green
    process.exit(1);
  });
