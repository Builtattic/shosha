import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { signInWithGoogle } from '@/lib/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function SignIn() {
  const { firebaseUser, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [flashStage, setFlashStage] = useState(0);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  // Handle the artificial 1600ms minimum sequence when logging in
  useEffect(() => {
    if (isSigningIn && firebaseUser) {
      const t1 = setTimeout(() => setFlashStage(1), 800);
      const t2 = setTimeout(() => {
        setFlashStage(2);
        setSequenceDone(true);
      }, 1600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isSigningIn, firebaseUser]);

  // Handle routing once sequence is done AND profile is loaded
  useEffect(() => {
    // If the user lands here already logged in (not actively signing in now), redirect immediately
    if (firebaseUser && profile && !isSigningIn) {
      if (profile.onboarding_complete) {
        navigate(from, { replace: true });
      } else {
        navigate('/onboard', { replace: true });
      }
    }
    
    // If they just signed in, wait for both the sequence and the profile fetch to finish
    if (isSigningIn && sequenceDone && profile && !isLoading) {
      if (profile.onboarding_complete) {
        navigate(from, { replace: true });
      } else {
        navigate('/onboard', { replace: true });
      }
    }
  }, [firebaseUser, profile, sequenceDone, isSigningIn, isLoading, navigate, from]);

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      setIsSigningIn(true);
      setFlashStage(0);
      
      if (import.meta.env.VITE_USE_MOCKS !== 'false') {
         // In mock mode, we trigger our manual "sign in" state in localStorage for AuthProvider
         localStorage.setItem('mock_fb_user', JSON.stringify({ uid: 'mock', email: 'mock@shosha' }));
         window.location.reload(); // Quick hack for mock mode to simulate a clean state load
         return;
      }
      
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in.');
      setIsSigningIn(false);
    }
  };

  const flashMessages = [
    "Verifying credentials...",
    "Fetching your profile...",
    "Almost there..."
  ];

  if (isSigningIn || (firebaseUser && isLoading)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-500">
          <div className="relative flex items-center justify-center h-24 w-24">
            <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20 absolute" />
            <Loader2 className="h-16 w-16 animate-spin text-primary absolute border-t-transparent" style={{ animationDuration: '3s' }} />
            {flashStage >= 1 && (
              <CheckCircle2 className="h-6 w-6 text-positive absolute z-10 animate-in zoom-in" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              {flashMessages[flashStage] || flashMessages[2]}
            </h2>
            <p className="text-muted-foreground text-sm font-sans max-w-xs mx-auto">
              This process takes a moment to ensure your security and reputation integrity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <Card className="w-full max-w-sm lift">
        <CardHeader className="space-y-1">
          <CardTitle className="font-serif text-2xl font-bold">Sign In</CardTitle>
          <CardDescription className="font-sans">
            Enter your credentials to access your Shosha dossier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 font-sans">
          {authError && (
            <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
              {authError}
            </div>
          )}
          <Button 
            className="w-full press" 
            size="lg" 
            onClick={handleGoogleSignIn}
          >
            Sign in with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" disabled>
            Email / Phone (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
