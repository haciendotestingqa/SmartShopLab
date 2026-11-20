import { existsSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Loads `.env.ai-evals` from the monorepo root.
 * File keys take priority (avoids a stale shell export causing 401 "User not found"
 * even when `.env.ai-evals` is correct).
 */
export function loadRootAiEvalsEnv(): void {
  const envPath = path.resolve(__dirname, '../../.env.ai-evals');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
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
    process.env[key] = value;
  }
}
