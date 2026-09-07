import { existsSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Carga `.env.ai-evals` de la raíz del monorepo.
 * Las keys del archivo tienen prioridad (evita una key vieja/exportada en el shell
 * que deje un 401 "User not found" aunque `.env.ai-evals` esté bien).
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
