/**
 * Verifies `.env` Firebase settings align with each other and the default RTDB URL shape.
 * Does not print secrets (service account JSON, database secrets).
 */
import * as fs from 'fs';
import * as path from 'path';

function parseEnvFile(filePath: string): Record<string, string> {
  const raw = fs.readFileSync(filePath, 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#') || !line.trim()) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env at', envPath);
  process.exit(1);
}

const env = parseEnvFile(envPath);
const projectId = env.FIREBASE_PROJECT_ID?.trim();
const databaseUrl = env.FIREBASE_DATABASE_URL?.trim();
const publicDb = env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();

if (!projectId || !databaseUrl) {
  console.error('FIREBASE_PROJECT_ID and FIREBASE_DATABASE_URL must be set in .env');
  process.exit(1);
}

const expectedDefault = `https://${projectId}-default-rtdb.firebaseio.com`;
const urlOk =
  databaseUrl === expectedDefault ||
  databaseUrl.includes(`${projectId}-default-rtdb`);

if (!urlOk) {
  console.error(
    `FIREBASE_DATABASE_URL does not match project "${projectId}". Expected host like "${projectId}-default-rtdb.firebaseio.com".`
  );
  process.exit(1);
}

if (publicDb && publicDb !== databaseUrl) {
  console.error(
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL differs from FIREBASE_DATABASE_URL; client and server may read different databases.'
  );
  process.exit(1);
}

console.log('[verify-firebase-env] OK');
console.log(`  FIREBASE_PROJECT_ID=${projectId}`);
console.log(`  FIREBASE_DATABASE_URL=${databaseUrl}`);
if (publicDb) console.log('  NEXT_PUBLIC_FIREBASE_DATABASE_URL matches server URL');
