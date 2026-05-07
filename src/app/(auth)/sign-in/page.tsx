'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Phone, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';

type AuthMode = 'choose' | 'email' | 'phone' | 'otp' | 'loading';

/** Allows only safe same-origin relative redirect targets. */
function sanitizeRedirectPath(input: string | null): string {
  if (!input) return '/dashboard';
  if (!input.startsWith('/') || input.startsWith('//')) return '/dashboard';
  const lowered = input.toLowerCase();
  if (lowered.startsWith('/http:') || lowered.startsWith('/https:') || lowered.startsWith('/data:') || lowered.startsWith('/javascript:')) {
    return '/dashboard';
  }
  return input;
}

async function resolveRedirect(redirectParam: string): Promise<string> {
  const safeRedirect = sanitizeRedirectPath(redirectParam);
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const payload = await res.json();
      const u = payload.data?.user ?? payload.user;
      // Only force onboarding for genuinely new accounts that have never
      // filled in any profile data. Existing users who predate the flag
      // should go straight to the dashboard.
      if (u && !u.onboardingComplete && !u.name && !u.occupationRole) {
        return '/onboard';
      }
    }
  } catch {
    // fall through to default
  }
  return safeRedirect;
}

export default function SignInPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle, sendPhoneOtp } = useAuth();



  const [mode, setMode] = useState<AuthMode>('choose');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!authLoading && user && mode !== 'loading') {
      setMode('loading');
      const searchParams = new URLSearchParams(window.location.search);
      resolveRedirect(sanitizeRedirectPath(searchParams.get('redirect'))).then(dest => {
        router.push(dest);
      }).catch(() => {
        router.push('/dashboard');
      });
    }
  }, [user, authLoading, router, mode]);

  // Safety timeout: if we're stuck in loading for >12s, allow the user to retry
  useEffect(() => {
    if (mode !== 'loading') return;
    const timer = setTimeout(() => {
      // If still on this page after 12s, offer recovery
      setMode('choose');
      setGoogleLoading(false);
      setLoading(false);
      setError('Sign-in timed out. Please try again.');
    }, 12000);
    return () => clearTimeout(timer);
  }, [mode]);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }

      const searchParams = new URLSearchParams(window.location.search);
      setMode('loading');
      const dest = await resolveRedirect(sanitizeRedirectPath(searchParams.get('redirect')));
      router.push(dest);
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim() || 'Something went wrong');
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (googleLoading) return;
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === 'cancelled') {
        setGoogleLoading(false);
        return;
      }
      if (result === 'signed-in') {
        setMode('loading');
        const searchParams = new URLSearchParams(window.location.search);
        const dest = await resolveRedirect(sanitizeRedirectPath(searchParams.get('redirect')));
        router.push(dest);
      } else if (result === 'redirecting') {
        setMode('loading');
      }
    } catch (err: any) {
      const msg = err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim();
      setError(msg || 'Google sign-in failed. Try again or use email.');
      setGoogleLoading(false);
      setMode('choose');
    }
  }

  async function handleSendOtp() {
    setError('');
    setLoading(true);
    try {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 6) {
        setError('Enter a valid phone number.');
        setLoading(false);
        return;
      }
      const fullPhoneNumber = `${countryCode}${phoneDigits}`;
      const result = await sendPhoneOtp(fullPhoneNumber, 'recaptcha-container');
      setConfirmResult(result);
      setOtpPhone(fullPhoneNumber);
      setMode('otp');
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!confirmResult) return;
    setError('');
    setLoading(true);
    try {
      const code = otp.join('');
      const cred = await confirmResult.confirm(code);
      const token = await cred.user.getIdToken();
      document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;

      const searchParams = new URLSearchParams(window.location.search);
      setMode('loading');
      const dest = await resolveRedirect(sanitizeRedirectPath(searchParams.get('redirect')));
      router.push(dest);
    } catch (err: any) {
      setError('Invalid OTP. Please try again.');
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    value = value.replace(/\D/g, '');
    if (value.length > 1) value = value.slice(-1);
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight">
            Sho<span className="text-primary">शा</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">The Reputation Ledger</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-lg">
          <div id="recaptcha-container" className="my-2" />
          <AnimatePresence mode="wait">
            {/* Step 1: Choose method */}
            {mode === 'choose' && (
              <motion.div key="choose" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <h2 className="text-xl font-bold text-center mb-6">Welcome to Shoशा</h2>

                {error && <p className="text-red-500 text-sm text-center mb-4 bg-red-500/10 rounded-xl p-3">{error}</p>}

                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl border border-border bg-background py-3 px-4 font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setMode('email')}
                    className="w-full flex items-center gap-3 rounded-2xl border border-border bg-background py-3 px-4 hover:bg-muted transition-colors text-left"
                  >
                    <Mail size={20} className="text-muted-foreground" />
                    <span className="font-medium">Continue with Email</span>
                    <ArrowRight size={16} className="ml-auto text-muted-foreground" />
                  </button>

                  <button
                    onClick={() => setMode('phone')}
                    className="w-full flex items-center gap-3 rounded-2xl border border-border bg-background py-3 px-4 hover:bg-muted transition-colors text-left"
                  >
                    <Phone size={20} className="text-muted-foreground" />
                    <span className="font-medium">Continue with Phone (OTP)</span>
                    <ArrowRight size={16} className="ml-auto text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2a: Email/Password */}
            {mode === 'email' && (
              <motion.div key="email" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <button onClick={() => { setMode('choose'); setError(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft size={16} /> Back
                </button>
                <h2 className="text-xl font-bold mb-6">{isSignUp ? 'Create account' : 'Sign in with email'}</h2>

                {error && <p className="text-red-500 text-sm mb-4 bg-red-500/10 rounded-xl p-3">{error}</p>}

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {isSignUp && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="Your name"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-foreground text-background py-3 font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                  </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-primary font-medium hover:underline">
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </button>
                </p>
              </motion.div>
            )}

            {/* Step 2b: Phone */}
            {mode === 'phone' && (
              <motion.div key="phone" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <button onClick={() => { setMode('choose'); setError(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft size={16} /> Back
                </button>
                <h2 className="text-xl font-bold mb-2">Phone verification</h2>
                <p className="text-sm text-muted-foreground mb-6">We&apos;ll send a 6-digit code to your phone.</p>

                {error && <p className="text-red-500 text-sm mb-4 bg-red-500/10 rounded-xl p-3">{error}</p>}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-[100px] rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none text-center"
                      >
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+971">🇦🇪 +971</option>
                      </select>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                    className="w-full rounded-2xl bg-foreground text-background py-3 font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
                
              </motion.div>
            )}

            {/* Step 3: OTP Verification */}
            {mode === 'otp' && (
              <motion.div key="otp" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <div className="text-center mb-6">
                  <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                    <Shield size={28} />
                  </div>
                  <h2 className="text-xl font-bold">Verify OTP</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code sent to {otpPhone || phone}</p>
                </div>

                {error && <p className="text-red-500 text-sm mb-4 bg-red-500/10 rounded-xl p-3 text-center">{error}</p>}

                <div className="flex justify-center gap-3 mb-6">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 rounded-xl border-2 border-border bg-background text-center text-xl font-bold focus:outline-none focus:border-primary transition-colors"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.some(d => !d)}
                  className="w-full rounded-2xl bg-foreground text-background py-3 font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <button
                  onClick={() => { setMode('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground"
                >
                  Didn&apos;t receive it? Try again
                </button>
              </motion.div>
            )}
            {/* Step 4: Loading / Redirecting */}
            {mode === 'loading' && (
              <motion.div key="loading" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="flex flex-col items-center justify-center py-12">
                <div className="relative w-16 h-16 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                  <CheckCircle2 size={24} className="text-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-bold mb-2">Preparing your profile</h2>
                <p className="text-sm text-muted-foreground text-center animate-pulse">
                  Securely verifying your credentials...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to Shoशा&apos;s Terms of Service.
        </p>
      </div>
    </main>
  );
}
