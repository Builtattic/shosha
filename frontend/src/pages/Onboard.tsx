import { useAuth } from '@/providers/AuthProvider';

export default function Onboard() {
  const { profile } = useAuth();
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-4xl font-bold">Complete your Profile</h1>
        <p className="text-muted-foreground font-sans max-w-md mx-auto">
          Welcome to Shosha, {profile?.firebase_uid}. Let's set up your core identity.
        </p>
      </div>
      <div className="w-full max-w-lg h-64 border border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground bg-card">
        [Onboarding Form Flow Placeholder]
      </div>
    </div>
  );
}
