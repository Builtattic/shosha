import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { getCurrentUser } from '@/api/auth';
import type { UserProfile } from '@/types/user';
import { USE_MOCKS } from '@/lib/apiClient';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  profile: null,
  isLoading: true,
  refetchProfile: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCKS) {
      // In fully mock mode, we assume no active session until they "sign in".
      // We start with null user.
      const stored = localStorage.getItem('mock_fb_user');
      if (stored) {
        setFirebaseUser(JSON.parse(stored) as FirebaseUser);
      }
      setIsFirebaseLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch the Shosha profile once Firebase Auth is established.
  const { data: profileResponse, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', firebaseUser?.uid],
    queryFn: async () => {
      const res = await getCurrentUser();
      if (!res.ok) throw new Error(res.error || 'Failed to fetch profile');
      return res.data;
    },
    enabled: !!firebaseUser, // Only run if we have a firebase user
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isLoading = isFirebaseLoading || (!!firebaseUser && isProfileLoading);
  const profile = profileResponse || null;

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, isLoading, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
