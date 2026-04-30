import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function loadEnvLocal() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvLocal();

process.env.FIREBASE_PROJECT_ID ||= 'shosha-local';
process.env.FIREBASE_DATABASE_URL ||= 'https://shosha-local-default-rtdb.firebaseio.com';
process.env.FIREBASE_STORAGE_BUCKET ||= 'shosha-local.appspot.com';

async function main() {
  const { replayAllAccountLedgers } = await import('../src/lib/services/accountScoreReplay');
  const { replayAllLedgers } = await import('../src/lib/services/ledgerReplay');

  console.log('Replaying sheet-first account/profile ledgers...');
  const accountResults = await replayAllAccountLedgers();
  console.log(`Rebuilt ${accountResults.length} account/profile ledgers.`);

  console.log('Replaying current user ledgers...');
  const userResults = await replayAllLedgers();
  console.log(`Rebuilt ${userResults.length} user ledgers.`);

  const accountEvents = accountResults.reduce((sum, result) => sum + result.entriesApplied, 0);
  const userEvents = userResults.reduce((sum, result) => sum + result.entriesApplied, 0);
  console.log(`Applied ${accountEvents} account entries and ${userEvents} user entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
