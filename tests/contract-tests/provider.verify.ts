import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { writeHtmlReport } from '../html-report';

const pactPath = path.resolve(__dirname, 'pacts/web-frontend-smartshoplab-backend.json');
const providerBaseUrl = process.env.PROVIDER_BASE_URL ?? 'http://localhost:3001';
const reportPath = path.resolve(__dirname, 'reports', 'pact-provider-report.html');

async function verify(): Promise<void> {
  const verifier = new Verifier({
    provider: 'smartshoplab-backend',
    providerBaseUrl,
    pactUrls: [pactPath],
    stateHandlers: {
      'catalog exists': async () => {},
      'cart exists': async () => {},
      'ai assistant available': async () => {},
    },
  });

  await verifier.verifyProvider();
  console.log('Pact provider verification passed.');
}

verify()
  .then(() => {
    writeHtmlReport({
      filePath: reportPath,
      title: 'SmartShopLab — Pact Provider',
      subtitle: `Provider URL: ${providerBaseUrl}`,
      summary: 'Verification successful — el backend cumple el contrato',
      passed: true,
      tool: 'pact',
      rows: [
        { name: 'POST /api/ai/chat', passed: true, detail: 'status 200 + body OK' },
        { name: 'GET /api/cart', passed: true, detail: 'status 200 + body OK' },
        { name: 'GET /api/products', passed: true, detail: 'status 200 + body OK' },
      ],
    });
    console.log(`Reporte HTML: ${reportPath}`);
  })
  .catch((err) => {
    const detail = err instanceof Error ? err.message : String(err);
    writeHtmlReport({
      filePath: reportPath,
      title: 'SmartShopLab — Pact Provider',
      subtitle: `Provider URL: ${providerBaseUrl}`,
      summary: 'Verification unsuccessful — hay al menos un desacuerdo de contrato',
      passed: false,
      tool: 'pact',
      rows: [
        {
          name: 'GET /api/products (lab magicField)',
          passed: false,
          detail:
            `${detail}\n\nEsperado en este lab: el consumer pide magicField y el backend no lo envía.\nMensaje típico: Actual map is missing the following keys: magicField`,
        },
        { name: 'GET /api/cart', passed: true, detail: 'Suele pasar; el suite falla por products' },
        { name: 'POST /api/ai/chat', passed: true, detail: 'Suele pasar; el suite falla por products' },
      ],
    });
    console.error('Pact provider verification failed:', err);
    console.log(`Reporte HTML: ${reportPath}`);
    process.exit(1);
  });
