import { existsSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Loads variables from `.env.ai-evals` at the monorepo root (gitignored).
 * File values take priority over variables already exported in the shell.
 */
export function loadAiEvalsEnv(): void {
  const envPath = path.resolve(__dirname, '../../.env.ai-evals');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf-8').split('\n');
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
    process.env[key] = value;
  }
}
