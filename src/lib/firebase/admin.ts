import { cert, applicationDefault, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Use globalThis to survive Next.js HMR reloads
const g = globalThis as unknown as {
  __firebaseAdminApp?: App;
  __firebaseAdminDb?: Database;
  __firebaseAdminStorage?: Storage;
};

function init(): App {
  if (g.__firebaseAdminApp) return g.__firebaseAdminApp;
  const existing = getApps()[0];
  if (existing) {
    g.__firebaseAdminApp = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'shosha-local';
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  const databaseURL = process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson && serviceAccountJson.trim() !== '{}' && serviceAccountJson.trim() !== '') {
    const credentials = JSON.parse(serviceAccountJson);
    g.__firebaseAdminApp = initializeApp({ credential: cert(credentials), projectId, storageBucket, databaseURL });
  } else {
    // Falls back to Google Application Default Credentials
    g.__firebaseAdminApp = initializeApp({ 
      credential: applicationDefault(),
      projectId, 
      storageBucket, 
      databaseURL 
    });
  }
  return g.__firebaseAdminApp;
}

export function adminDb(): Database {
  if (!g.__firebaseAdminDb) {
    g.__firebaseAdminDb = getDatabase(init());
  }
  return g.__firebaseAdminDb;
}

export function adminStorage(): Storage {
  if (!g.__firebaseAdminStorage) g.__firebaseAdminStorage = getStorage(init());
  return g.__firebaseAdminStorage;
}

export function adminBucket() {
  return adminStorage().bucket();
}
