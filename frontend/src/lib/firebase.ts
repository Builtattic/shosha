import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { USE_MOCKS } from './apiClient';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-id",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (USE_MOCKS) {
    // In mock mode without a real Firebase project, we bypass the actual popup
    // and just pretend we got a Firebase user.
    return {
      user: {
        uid: 'fb_mock_uid',
        email: 'mock@shosha.local',
        displayName: 'Mock User',
      }
    };
  }
  return signInWithPopup(auth, googleProvider);
};

export const logout = async () => {
  if (USE_MOCKS) return;
  return signOut(auth);
};
