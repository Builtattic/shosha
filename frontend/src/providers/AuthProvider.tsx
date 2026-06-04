import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import {
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignInWithGoogle,
  firebaseSendPhoneOtp,
  firebaseSignOut,
  getMockGoogleUser,
} from '@/lib/firebase';
import type { GoogleSignInResult } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser, ConfirmationResult } from 'firebase/auth';
import { getCurrentUser } from '@/api/auth';
import type { UserProfile } from '@/types/user';
import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import { router } from '@/routes';
import axios from 'axios';

// ─── Context shape ─────────────────────────────────────────────────────────────
interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  sessionReady: boolean;
  sessionError: string | null;
  refetchProfile: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  sendPhoneOtp: (phone: string, recaptchaContainerId: string) => Promise<ConfirmationResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  profile: null,
  isLoading: true,
  sessionReady: false,
  sessionError: null,
  refetchProfile: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => 'cancelled',
  sendPhoneOtp: async () => { throw new Error('Not implemented'); },
  logout: async () => {},
});

// ─── Mock user store ───────────────────────────────────────────────────────────
// In mock mode we never hit Firebase. Instead we keep a fake user in localStorage
// and synchronise it via state — no page reload required.
function readMockUser(): FirebaseUser | null {
  const stored = localStorage.getItem('mock_fb_user');
  return stored ? (JSON.parse(stored) as FirebaseUser) : null;
}

function writeMockUser(user: FirebaseUser | null) {
  if (user) {
    localStorage.setItem('mock_fb_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('mock_fb_user');
  }
}

interface SessionSyncData {
  user: UserProfile;
  is_new_user: boolean;
}

function sessionSyncPayload(user: FirebaseUser) {
  const displayName = user.displayName?.trim();
  const photo = user.photoURL?.trim();
  const photoOk =
    photo && /^https?:\/\//i.test(photo) && photo.length <= 1024 ? photo : null;
  return {
    display_name: displayName || null,
    photo_url: photoOk,
  };
}

async function postSessionSync(user: FirebaseUser, token: string) {
  return apiClient.post<SessionSyncData>(
    '/auth/session/sync',
    sessionSyncPayload(user),
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

function formatSessionSyncError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.response?.status === 401) {
      return 'Server rejected the Firebase token (401). Sign out, restart the backend, and try again.';
    }
    if (err.response?.status === 422) {
      return data?.error?.message ?? 'Invalid profile data sent to server (422).';
    }
    if (err.response?.status === 500) {
      return data?.error?.message ?? 'Server error during session sync (500).';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Session sync failed';
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();

  // The source-of-truth Firebase user (real or mock)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() =>
    USE_MOCKS ? readMockUser() : null
  );
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(!USE_MOCKS);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Keep mock user in sync with localStorage
  const setMockUser = (user: FirebaseUser | null) => {
    writeMockUser(user);
    setFirebaseUser(user);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  useEffect(() => {
    if (USE_MOCKS) return; // real Firebase listener not needed in mock mode

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setSessionReady(false);
      setSessionError(null);

      if (!user) {
        queryClient.removeQueries({ queryKey: ['profile'] });
        setIsFirebaseLoading(false);
        return;
      }

      setIsFirebaseLoading(true);
      try {
        const token = await user.getIdToken(true);
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { data } = await postSessionSync(user, token);
        queryClient.setQueryData(['profile', user.uid], data.user);
        setSessionReady(true);
        setSessionError(null);

        if (data.is_new_user || data.user.username == null) {
          router.navigate('/onboard', { replace: true });
        }
      } catch (err) {
        console.error('Session sync failed:', err);
        setSessionReady(false);
        setSessionError(formatSessionSyncError(err));
      } finally {
        setIsFirebaseLoading(false);
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // ─── Profile fetch (TanStack Query) ────────────────────────────────────────
  const {
    data: profileData,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile', firebaseUser?.uid],
    queryFn: async () => {
      const res = await getCurrentUser();
      if (!res.ok) {
        throw new Error(
          typeof res.error === 'string' ? res.error : 'Failed to fetch profile',
        );
      }
      return res.data ?? null;
    },
    enabled: !!firebaseUser && (USE_MOCKS || sessionReady),
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = isFirebaseLoading || (!!firebaseUser && isProfileLoading);
  const profile = profileData ?? null;

  // ─── Auth functions ─────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    await firebaseSignIn(email, password);
    if (USE_MOCKS) {
      setMockUser({ uid: `mock_${email}`, email, displayName: email.split('@')[0] } as unknown as FirebaseUser);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    await firebaseSignUp(email, password, displayName);
    if (USE_MOCKS) {
      setMockUser({ uid: `mock_${email}`, email, displayName } as unknown as FirebaseUser);
    }
  };

  const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
    const result = await firebaseSignInWithGoogle();
    if (USE_MOCKS && result === 'signed-in') {
      const mock = getMockGoogleUser();
      setMockUser(mock as unknown as FirebaseUser);
    }
    return result;
  };

  const sendPhoneOtp = async (phone: string, recaptchaContainerId: string): Promise<ConfirmationResult> => {
    return firebaseSendPhoneOtp(phone, recaptchaContainerId);
  };

  const logout = async () => {
    await firebaseSignOut();
    if (USE_MOCKS) setMockUser(null);
    else {
      setFirebaseUser(null);
      setSessionReady(false);
      setSessionError(null);
    }
    queryClient.removeQueries({ queryKey: ['profile'] });
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      profile,
      isLoading,
      sessionReady: USE_MOCKS ? !!firebaseUser : sessionReady,
      sessionError,
      refetchProfile,
      signIn,
      signUp,
      signInWithGoogle,
      sendPhoneOtp,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
