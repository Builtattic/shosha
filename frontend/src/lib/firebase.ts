import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { USE_MOCKS } from './apiClient';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'mock-id',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ─── Mock helpers ─────────────────────────────────────────────────────────────
const MOCK_GOOGLE_USER = { uid: 'fb_mock_google', email: 'mock.google@shosha.local', displayName: 'Mock User' };

/** Returns a fake ConfirmationResult for mock mode. Accepts "123456" as the valid OTP. */
function mockConfirmationResult(phone: string): ConfirmationResult {
  return {
    verificationId: 'mock-verification-id',
    confirm: async (code: string) => {
      await new Promise(r => setTimeout(r, 600));
      if (code !== '123456') throw new Error('Invalid OTP. (Mock: use 123456)');
      return {
        user: {
          uid: `fb_mock_phone_${phone}`,
          email: null,
          displayName: null,
          phoneNumber: phone,
          getIdToken: async () => 'mock-token',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    },
  } as ConfirmationResult;
}

// ─── Exported auth functions ───────────────────────────────────────────────────

export type GoogleSignInResult = 'signed-in' | 'redirecting' | 'cancelled';

export async function firebaseSignInWithGoogle(): Promise<GoogleSignInResult> {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 600));
    return 'signed-in';
  }
  try {
    await signInWithPopup(auth, googleProvider);
    return 'signed-in';
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return 'cancelled';
    }
    throw err;
  }
}

export async function firebaseSignIn(email: string, password: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 600));
    return;
  }
  await signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseSignUp(email: string, password: string, displayName: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 600));
    return;
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
}

export async function firebaseSendPhoneOtp(
  phoneNumber: string,
  recaptchaContainerId: string,
): Promise<ConfirmationResult> {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 800));
    return mockConfirmationResult(phoneNumber);
  }
  const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function firebaseSignOut(): Promise<void> {
  if (USE_MOCKS) return;
  return signOut(auth);
}

/** @deprecated — Use context functions via useAuth() instead. */
export const getMockGoogleUser = () => MOCK_GOOGLE_USER;
