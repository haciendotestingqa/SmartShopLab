#!/usr/bin/env node

/**
 * Ejecuta Maestro E2E (Expo Go) + reporte HTML.
 * LLM-as-judge (ai-chat): POST /api/ai/judge — API key solo en `.env.ai-evals`.
 *
 * Plataforma: MAESTRO_PLATFORM=android|ios (o se infiere del device).
 * Device: MAESTRO_DEVICE en `.env.maestro.local` / entorno.
 *   - Android por defecto: emulator-5554 (+ adb reverse 8081/3001)
 *   - iOS: UDID del simulador (si falta, se usa el booted)
 *
 * Puerto del driver: MAESTRO_DRIVER_HOST_PORT (default Maestro 7001).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const target = process.argv[2] || 'tests/e2e-mobile/flows/';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(root, '.env.maestro.local'));

const driverPort = process.env.MAESTRO_DRIVER_HOST_PORT?.trim() || '';

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: root,
    stdio: opts.silent ? 'pipe' : 'inherit',
    env: process.env,
    shell: false,
  });
}

function isIosUdid(id) {
  return /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(
    id
  );
}

function detectBootedIosUdid() {
  const result = spawnSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || !result.stdout) return null;
  try {
    const data = JSON.parse(result.stdout);
    const devices = data.devices || {};
    for (const list of Object.values(devices)) {
      if (!Array.isArray(list)) continue;
      const booted = list.find((d) => d.state === 'Booted' && d.udid);
      if (booted) return booted.udid;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function resolvePlatformAndDevice() {
  const envPlatform = (process.env.MAESTRO_PLATFORM || '').trim().toLowerCase();
  let device = (process.env.MAESTRO_DEVICE || '').trim();

  let platform = envPlatform;
  if (!platform) {
    if (device && isIosUdid(device)) platform = 'ios';
    else if (device.startsWith('emulator-') || device.startsWith('emulator')) platform = 'android';
    else platform = 'android';
  }

  if (platform !== 'android' && platform !== 'ios') {
    console.error(`\nMAESTRO_PLATFORM inválida: "${platform}". Usa android|ios.\n`);
    process.exit(1);
  }

  if (!device) {
    if (platform === 'ios') {
      device = detectBootedIosUdid();
      if (!device) {
        console.error(
          '\nNo hay simulador iOS booted ni MAESTRO_DEVICE.\n' +
            '  open -a Simulator\n' +
            '  # o define MAESTRO_DEVICE=<UDID> en .env.maestro.local\n' +
            '  xcrun simctl list devices booted\n'
        );
        process.exit(1);
      }
    } else {
      device = 'emulator-5554';
    }
  }

  return { platform, device };
}

const { platform, device } = resolvePlatformAndDevice();

// Liberar proceso Maestro colgado en el puerto del driver (si se usa uno custom)
if (driverPort) {
  const lsof = spawnSync('lsof', ['-t', `-i:${driverPort}`], { encoding: 'utf8' });
  const pids = (lsof.stdout || '')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (pids.length) {
    console.log(`\n⚠ Puerto ${driverPort} ocupado (PIDs: ${pids.join(', ')}). Liberando…`);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch {
        /* ignore */
      }
    }
    spawnSync('pkill', ['-f', 'maestro.cli.AppKt'], { stdio: 'ignore' });
  }
}

if (platform === 'android') {
  console.log(`\n→ adb reverse tcp:8081 y tcp:3001 (device ${device})`);
  const reverse8081 = run('adb', ['-s', device, 'reverse', 'tcp:8081', 'tcp:8081']);
  const reverse3001 = run('adb', ['-s', device, 'reverse', 'tcp:3001', 'tcp:3001']);
  if (reverse8081.error || reverse3001.error) {
    console.error('\nNo se encontró `adb` en el PATH (necesario para Android).\n');
    process.exit(1);
  }
} else {
  console.log(`\n→ iOS: sin adb reverse (device ${device})`);
  console.log('  Asegura mobile-app/.env → EXPO_PUBLIC_API_URL=http://localhost:3001');
}

const needsJudge =
  String(target).includes('ai-chat') ||
  target.endsWith('flows/') ||
  target.endsWith('flows');

if (needsJudge) {
  const envPath = path.join(root, '.env.ai-evals');
  if (!fs.existsSync(envPath)) {
    console.error(
      '\nFalta .env.ai-evals (unica fuente de OPENROUTER_API_KEY para el backend/juez).\n' +
        'cp .env.ai-evals.example .env.ai-evals\n'
    );
    process.exit(1);
  }
  const health = spawnSync('curl', ['-s', '-m', '3', 'http://127.0.0.1:3001/health'], {
    encoding: 'utf8',
  });
  if (health.status !== 0) {
    console.error(
      '\nEl backend no responde en :3001. Reinícialo con:\n' +
        '  npm run dev:backend\n'
    );
    process.exit(1);
  }
}

// Bundle id de Expo Go: en iOS es case-sensitive (Exponent con E mayúscula).
const appId =
  process.env.MAESTRO_APP_ID?.trim() ||
  (platform === 'ios' ? 'host.exp.Exponent' : 'host.exp.exponent');
// Misma URL siempre (evita duplicados en Recently opened: LAN vs 127.0.0.1).
const expoUrl = process.env.MAESTRO_EXPO_URL?.trim() || 'exp://127.0.0.1:8081';

const args = [];
if (driverPort) {
  args.push('--driver-host-port', driverPort);
}
args.push(
  '--device',
  device,
  'test',
  '-e',
  `APP_ID=${appId}`,
  '-e',
  `EXPO_URL=${expoUrl}`,
  target
);

console.log(`\n→ plataforma: ${platform}`);
console.log(`→ Expo Go appId: ${appId}`);
console.log(`→ Expo URL: ${expoUrl}`);
console.log(`→ maestro ${args.join(' ')}\n`);
if (needsJudge) {
  console.log('(ai-chat: juez vía POST /api/ai/judge; key solo en .env.ai-evals del backend)\n');
}

const result = run('maestro', args);

const reportEnv = {
  ...process.env,
  MAESTRO_EXIT_CODE: String(result.status ?? 1),
  MAESTRO_PLATFORM: platform,
  MAESTRO_REPORT_KIND: String(target).includes('ai-chat')
    ? 'ai'
    : target.endsWith('flows/') || target.endsWith('flows')
      ? 'all'
      : 'ui',
};
spawnSync('npx', ['tsx', 'tests/e2e-mobile/write-maestro-html.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: reportEnv,
  shell: false,
});

if (result.error) {
  console.error('\nNo se encontró `maestro` en el PATH.\n');
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
