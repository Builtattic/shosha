'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
  type User,
  type ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<'signed-in' | 'redirecting' | 'cancelled'>;
  sendPhoneOtp: (phone: string, recaptchaContainer: string) => Promise<ConfirmationResult>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function setSessionCookie(token: string) {
  document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;
}

function clearSessionCookie() {
  document.cookie = `__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function shouldFallbackToRedirect(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/cancelled-popup-request'
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const googleSignInInProgress = useRef(false);
  const phoneVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    getRedirectResult(auth).then(async (cred) => {
      if (cred && cred.user) {
        const token = await cred.user.getIdToken();
        setSessionCookie(token);
      }
    }).catch((error) => {
      console.error("Firebase Redirect Error:", error);
      // Redirect auth can fail when users cancel or browser storage is blocked.
      // Keep the page quiet; the button handler exposes actionable failures.
    });

    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        const token = await u.getIdToken();
        setSessionCookie(token);
      } else {
        clearSessionCookie();
      }
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    setSessionCookie(token);
  }

  async function signUp(email: string, password: string, displayName?: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await sendEmailVerification(cred.user);
    const token = await cred.user.getIdToken();
    setSessionCookie(token);
  }

  async function signInWithGoogle(): Promise<'signed-in' | 'redirecting' | 'cancelled'> {
    if (googleSignInInProgress.current) return 'cancelled';
    googleSignInInProgress.current = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Attempt popup first; if blocked or not supported, fallback to redirect


      try {
        const cred = await signInWithPopup(auth, provider);
        const token = await cred.user.getIdToken();
        setSessionCookie(token);
        return 'signed-in';
      } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          return 'cancelled';
        }
        if (!shouldFallbackToRedirect(error)) {
          throw error;
        }
        await signInWithRedirect(auth, provider);
        return 'redirecting';
      }
    } finally {
      googleSignInInProgress.current = false;
    }
  }

  async function sendPhoneOtp(phone: string, recaptchaContainer: string) {
    phoneVerifierRef.current?.clear();
    phoneVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainer, { size: 'invisible' });
    try {
      await phoneVerifierRef.current.render();
      return await signInWithPhoneNumber(auth, phone, phoneVerifierRef.current);
    } catch (error) {
      phoneVerifierRef.current?.clear();
      phoneVerifierRef.current = null;
      throw error;
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    clearSessionCookie();
    if (typeof window !== 'undefined') {
      window.location.assign('/sign-in');
    }
  }

  async function getIdToken(): Promise<string | null> {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, sendPhoneOtp, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
