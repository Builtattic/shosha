import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

const auth = getAuth();
const db = getDatabase();
const TARGET_EMAIL = 'tushar@builtattic.com';

async function grantAdmin() {
  console.log(`Searching for ${TARGET_EMAIL}...`);
  
  let uid;
  try {
    const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
    uid = userRecord.uid;
    console.log(`Found in Firebase Auth: uid=${uid}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`User ${TARGET_EMAIL} not found in Firebase Auth.`);
      console.log('Searching in RTDB as fallback...');
      const snap = await db.ref('users').orderByChild('email').equalTo(TARGET_EMAIL).once('value');
      if (snap.exists()) {
        snap.forEach((child) => { uid = child.key; });
      }
    } else {
      throw err;
    }
  }

  if (!uid) {
    console.error(`Could not find user with email: ${TARGET_EMAIL}`);
    console.log('Please sign in at least once at the login page.');
    process.exit(1);
  }

  const userRef = db.ref(`users/${uid}`);
  const snap = await userRef.once('value');
  
  if (snap.exists()) {
    await userRef.update({
      role: 'admin',
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Updated existing user record to admin.`);
  } else {
    // Create pre-emptively
    const username = TARGET_EMAIL.split('@')[0].toLowerCase();
    await userRef.set({
      email: TARGET_EMAIL,
      username,
      role: 'admin',
      reporterScore: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Created new admin record for ${TARGET_EMAIL}.`);
  }
  process.exit(0);
}

grantAdmin().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
