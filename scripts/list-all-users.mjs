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

async function listAllUsers() {
  const snap = await db.ref('users').once('value');
  if (!snap.exists()) {
    console.log('No users found in database.');
    process.exit(0);
  }

  console.log(`Total users: ${snap.numChildren()}`);
  snap.forEach((child) => {
    const data = child.val();
    console.log(`- ${data.email} (${child.key}) [${data.role}]`);
  });
  process.exit(0);
}

listAllUsers().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
