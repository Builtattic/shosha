const admin = require('firebase-admin');

// We have FIREBASE_DATABASE_SECRET=ylQoar7oMKLmXGQNzCEaRIRJGcBW1Xf4ElJpeqtl
admin.initializeApp({
  projectId: 'shosha-builtattic',
  databaseURL: 'https://shosha-builtattic-default-rtdb.firebaseio.com',
  credential: admin.credential.applicationDefault()
});

async function run() {
  try {
    const db = admin.database();
    await db.ref('test').set({ time: Date.now() });
    console.log("Success with ADC (it shouldn't work if no ADC)");
  } catch(e) {
    console.error("ADC failed:", e.message);
  }
}

run();
