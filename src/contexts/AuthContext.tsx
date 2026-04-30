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
  signInWithGoogle: () => Promise<boolean>;
  sendPhoneOtp: (phone: string, recaptchaContainer: string) => Promise<ConfirmationResult>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const googleSignInInProgress = useRef(false);

  useEffect(() => {
    getRedirectResult(auth).then(async (cred) => {
      if (cred && cred.user) {
        const token = await cred.user.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;
      }
    }).catch(console.error);

    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        const token = await u.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;
      } else {
        document.cookie = `__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;
  }

  async function signUp(email: string, password: string, displayName?: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await sendEmailVerification(cred.user);
    const token = await cred.user.getIdToken();
    document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;
  }

  async function signInWithGoogle(): Promise<boolean> {
    if (googleSignInInProgress.current) return false;
    googleSignInInProgress.current = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Using signInWithRedirect instead of popup to fix the 'missing initial state'
      // error that occurs on mobile Safari and in-app browsers due to storage partitioning.
      await signInWithRedirect(auth, provider);
      return true;
    } catch (error: any) {
      googleSignInInProgress.current = false;
      throw error;
    }
  }

  async function sendPhoneOtp(phone: string, recaptchaContainer: string) {
    const verifier = new RecaptchaVerifier(auth, recaptchaContainer, { size: 'invisible' });
    return signInWithPhoneNumber(auth, phone, verifier);
  }

  async function signOut() {
    await firebaseSignOut(auth);
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
