import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const serviceAccountJson = envContent.match(/FIREBASE_SERVICE_ACCOUNT_JSON='(.+?)'/s)?.[1];
const databaseURL = envContent.match(/FIREBASE_DATABASE_URL=(.+)/)?.[1]?.trim();

if (!serviceAccountJson || !databaseURL) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_DATABASE_URL in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

initializeApp({ credential: cert(serviceAccount), databaseURL });

const db = getDatabase();

async function searchTushar() {
  const snap = await db.ref('users').once('value');
  if (!snap.exists()) {
    console.log('No users found.');
    process.exit(0);
  }

  console.log('Searching for "tushar" in emails...');
  snap.forEach((child) => {
    const data = child.val();
    if (data.email?.toLowerCase().includes('tushar')) {
      console.log(`FOUND: ${data.email} (${child.key}) [${data.role}]`);
    }
  });
  process.exit(0);
}

searchTushar().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
