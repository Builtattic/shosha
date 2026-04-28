'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
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
  signInWithGoogle: () => Promise<void>;
  sendPhoneOtp: (phone: string, recaptchaContainer: string) => Promise<ConfirmationResult>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string, displayName?: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await sendEmailVerification(cred.user);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
