#!/usr/bin/env node

/**
 * Runs Maestro E2E (Expo Go) + HTML report.
 * LLM-as-judge (ai-chat): POST /api/ai/judge — API key only in `.env.ai-evals`.
 *
 * Platform: MAESTRO_PLATFORM=android|ios (or inferred from device).
 * Device: MAESTRO_DEVICE in `.env.maestro.local` / env.
 *   - Android default: emulator-5554 (+ adb reverse 8081/3001)
 *   - iOS: simulator UDID (if missing, uses booted sim)
 *
 * Driver port: MAESTRO_DRIVER_HOST_PORT (Maestro default 7001).
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
    console.error(`\nInvalid MAESTRO_PLATFORM: "${platform}". Use android|ios.\n`);
    process.exit(1);
  }

  if (!device) {
    if (platform === 'ios') {
      device = detectBootedIosUdid();
      if (!device) {
        console.error(
          '\nNo booted iOS simulator and no MAESTRO_DEVICE.\n' +
            '  open -a Simulator\n' +
            '  # or set MAESTRO_DEVICE=<UDID> in .env.maestro.local\n' +
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

// Free stuck Maestro process on the driver port (when using a custom port)
if (driverPort) {
  const lsof = spawnSync('lsof', ['-t', `-i:${driverPort}`], { encoding: 'utf8' });
  const pids = (lsof.stdout || '')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (pids.length) {
    console.log(`\n⚠ Port ${driverPort} in use (PIDs: ${pids.join(', ')}). Releasing…`);
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
  console.log(`\n→ adb reverse tcp:8081 and tcp:3001 (device ${device})`);
  const reverse8081 = run('adb', ['-s', device, 'reverse', 'tcp:8081', 'tcp:8081']);
  const reverse3001 = run('adb', ['-s', device, 'reverse', 'tcp:3001', 'tcp:3001']);
  if (reverse8081.error || reverse3001.error) {
    console.error('\n`adb` not found in PATH (required for Android).\n');
    process.exit(1);
  }
} else {
  console.log(`\n→ iOS: no adb reverse (device ${device})`);
  console.log('  Ensure mobile-app/.env → EXPO_PUBLIC_API_URL=http://localhost:3001');
}

const needsJudge =
  String(target).includes('ai-chat') ||
  target.endsWith('flows/') ||
  target.endsWith('flows');

if (needsJudge) {
  const envPath = path.join(root, '.env.ai-evals');
  if (!fs.existsSync(envPath)) {
    console.error(
      '\nMissing .env.ai-evals (sole source of OPENROUTER_API_KEY for backend/judge).\n' +
        'cp .env.ai-evals.example .env.ai-evals\n'
    );
    process.exit(1);
  }
  const health = spawnSync('curl', ['-s', '-m', '3', 'http://127.0.0.1:3001/health'], {
    encoding: 'utf8',
  });
  if (health.status !== 0) {
    console.error(
      '\nBackend not responding on :3001. Restart with:\n' +
        '  npm run dev:backend\n'
    );
    process.exit(1);
  }
}

// Expo Go bundle id: on iOS case-sensitive (Exponent with capital E).
const appId =
  process.env.MAESTRO_APP_ID?.trim() ||
  (platform === 'ios' ? 'host.exp.Exponent' : 'host.exp.exponent');
// Same URL always (avoids duplicates in Recently opened: LAN vs 127.0.0.1).
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

console.log(`\n→ platform: ${platform}`);
console.log(`→ Expo Go appId: ${appId}`);
console.log(`→ Expo URL: ${expoUrl}`);
console.log(`→ maestro ${args.join(' ')}\n`);
if (needsJudge) {
  console.log('(ai-chat: judge via POST /api/ai/judge; key only in backend .env.ai-evals)\n');
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
  console.error('\n`maestro` not found in PATH.\n');
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
