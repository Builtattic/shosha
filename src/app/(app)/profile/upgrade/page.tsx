'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ChevronLeft, Search, Bell, ArrowRight, CheckCircle2,
  TrendingUp, User, Scan, Lock, Star, Users, ZapOff, Target,
  Loader2, Smartphone, Check, X, Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRUST_BADGE_USD, TRUST_BADGE_INR, USD_TO_INR_RATE } from '@/lib/pricing';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessPayload) => Promise<void>;
  prefill: {
    name: string;
    email: string;
  };
  theme: { color: string };
  modal: { ondismiss: () => void };
};

type Step = 0 | 1 | 2 | 3 | 4 | 5; // 0=landing, 1=selfie, 2=id, 3=payment, 4=loading, 5=success

const ID_OPTIONS = [
  { id: 'passport', label: 'Passport' },
  { id: 'license', label: "Driver's License" },
  { id: 'national', label: 'National ID' },
];

export default function TrustUpgradePage() {
  const router = useRouter();
  const { user: firebaseUser } = useAuth();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<Step>(0);
  const [selectedId, setSelectedId] = useState<string>('license');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  function next() { setStep((s) => Math.min(5, (s + 1) as Step) as Step); }
  function back() { setStep((s) => Math.max(0, (s - 1) as Step) as Step); }

  function stopMediaStream(target: MediaStream | null) {
    target?.getTracks().forEach((track) => track.stop());
  }

  useEffect(() => {
    const existing = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (step !== 1) {
      setCameraReady(false);
      setStream((prev) => {
        stopMediaStream(prev);
        return null;
      });
      return;
    }

    if (selfiePreview) {
      setCameraReady(true);
      return;
    }

    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((nextStream) => {
        if (cancelled) {
          stopMediaStream(nextStream);
          return;
        }
        setStream((prev) => {
          stopMediaStream(prev);
          return nextStream;
        });
        if (videoRef.current) {
          videoRef.current.srcObject = nextStream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      })
      .catch(() => {
        setCameraError('Camera access denied. Please allow camera access and try again.');
      });

    return () => {
      cancelled = true;
      setStream((prev) => {
        stopMediaStream(prev);
        return null;
      });
    };
  }, [cameraSessionKey, selfiePreview, step]);

  useEffect(() => {
    return () => {
      stopMediaStream(stream);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview, stream]);

  async function complete() {
    setStep(4);
    try {
      if (!selfieBlob) throw new Error('Selfie required.');
      const selfieForm = new FormData();
      selfieForm.append('file', selfieBlob, 'selfie.webp');
      const selfieRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: selfieForm,
      });
      const selfieData = await selfieRes.json().catch(() => null);
      if (!selfieData?.ok || !selfieData?.data?.url) throw new Error('Selfie upload failed.');
      const selfieUrl = selfieData.data.url as string;

      if (!docFile) throw new Error('Document required.');
      const docForm = new FormData();
      docForm.append('file', docFile, docFile.name);
      const docRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: docForm,
      });
      const docData = await docRes.json().catch(() => null);
      if (!docData?.ok || !docData?.data?.url) throw new Error('Document upload failed.');
      const docUrl = docData.data.url as string;

      const orderRes = await fetch('/api/me/upgrade/order', { method: 'POST' });
      const orderData = await orderRes.json().catch(() => null);
      if (!orderData?.ok) {
        toast.push(orderData?.error?.message ?? 'Could not initiate payment.');
        setStep(3);
        return;
      }

      if (!window.Razorpay) {
        toast.push('Payment checkout is not ready. Please try again.');
        setStep(3);
        return;
      }

      const options: RazorpayOptions = {
        key: orderData.data.keyId,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'Shosha',
        description: 'Trust Badge — Identity Verification',
        order_id: orderData.data.orderId,
        handler: async (response: RazorpaySuccessPayload) => {
          try {
            const verifyRes = await fetch('/api/me/upgrade/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                selfieUrl,
                docUrl,
                docType: selectedId,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => null);
            if (verifyData?.ok) {
              setStep(5);
              setTimeout(() => {
                router.push('/profile');
                router.refresh();
              }, 1800);
            } else {
              toast.push(verifyData?.error?.message ?? 'Payment verification failed.');
              setStep(0);
            }
          } catch {
            toast.push('Payment verification failed.');
            setStep(0);
          }
        },
        prefill: {
          name: firebaseUser?.displayName ?? '',
          email: firebaseUser?.email ?? '',
        },
        theme: { color: '#000000' },
        modal: {
          ondismiss: () => {
            toast.push('Payment cancelled.');
            setStep(2);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not initiate payment.');
      setStep(2);
    }
  }

  return (
    <main className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/85 px-4 py-3 backdrop-blur-md">
        <Link href="/profile" className="text-muted-foreground hover:text-foreground" aria-label="Back to profile">
          <ChevronLeft size={24} />
        </Link>
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search people, impact, reports..."
              className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-4 text-[12px] outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="relative shrink-0">
          <Bell size={20} className="text-muted-foreground" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive border border-background" />
        </div>
      </header>

      {/* Landing card stack */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight">Trust Account Upgrade</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Unlock more impact. Earn more trust.</p>

        {/* Trust Badge banner */}
        <div className="mt-6 flex items-center gap-4 rounded-[24px] border border-border bg-card p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <ShieldCheck size={22} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold">Trust Badge</h2>
            <p className="text-[12px] text-muted-foreground">Verified you. Trusted by all.</p>
          </div>
        </div>

        {/* Section 1 — Daily report limit */}
        <SectionHeader index={1} title="Increase Daily Report Limit" />
        <div className="rounded-[24px] border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <Stat label="Current Limit" value="5" sub="reports per day" />
            <ArrowRight className="text-muted-foreground shrink-0" size={20} />
            <Stat
              label="Upgraded Limit"
              value={<span className="inline-flex items-center gap-1.5">20 <TrendingUp size={20} /></span>}
              sub="reports per day"
              highlight
            />
          </div>
          <ul className="mt-6 space-y-2">
            {['Report more', 'Reach more people', 'Create more impact'].map((b) => (
              <li key={b} className="flex items-center gap-2 text-[12px] font-medium">
                <CheckCircle2 size={14} className="text-primary" /> {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Section 2 — Selfie verification */}
        <SectionHeader index={2} title="Get Selfie Verification" subtitle="Verify your identity. Earn the Trust Badge." />
        <div className="rounded-[24px] border border-border bg-card p-6">
          <div className="grid grid-cols-3 gap-3">
            <FlowStep n={1} label="Take a selfie" Icon={User} active />
            <FlowStep n={2} label="Upload Govt. ID" Icon={Scan} />
            <FlowStep n={3} label="Get your Trust Badge" Icon={ShieldCheck} />
          </div>

          <div className="mt-6 rounded-[18px] border border-primary/15 bg-primary/5 p-4">
            <h4 className="mb-2 text-[13px] font-bold text-primary">Trust Badge Benefits</h4>
            <ul className="space-y-1.5">
              {['Higher credibility', 'More visibility', 'Priority in rankings', 'Access to higher limits'].map((b) => (
                <li key={b} className="flex items-center gap-2 text-[11px] font-bold">
                  <CheckCircle2 size={11} className="text-primary" /> {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 3 — Base credibility */}
        <SectionHeader index={3} title="Increase Base Credibility Score" subtitle="Stronger score. More weight. Greater impact." />
        <div className="rounded-[24px] border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <ScoreDial value={80} label="Current Score" />
            <ArrowRight className="text-muted-foreground shrink-0" size={20} />
            <ScoreDial value={100} label="Upgraded Score" highlight />
            <div className="hidden sm:flex flex-col items-center gap-1 opacity-70">
              <Star size={20} className="text-primary" />
              <p className="text-center text-[9px] font-bold leading-tight">
                Higher score.<br />More trust.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing CTA */}
        <div className="mt-8 flex items-center gap-4 rounded-[24px] border border-border bg-card p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-bold">Upgrade to Trust Account</h3>
            <p className="text-[11px] text-muted-foreground">All benefits. Instant unlock.</p>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-2">
            <div className="flex rounded-full border border-border p-0.5">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold transition',
                  currency === 'USD'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold transition',
                  currency === 'INR'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                ₹ INR
              </button>
            </div>
            <div>
              <div className="text-[20px] font-black tabular-nums">
                {currency === 'USD' ? `$${TRUST_BADGE_USD}.00` : `₹${TRUST_BADGE_INR}`}
              </div>
              <p className="text-[10px] text-muted-foreground">one time</p>
            </div>
            <p className="max-w-[11rem] text-right text-[10px] text-muted-foreground leading-snug">
              1 USD = ₹{USD_TO_INR_RATE} · charged in INR via Razorpay
            </p>
          </div>
          <button
            onClick={() => setStep(1)}
            className="shrink-0 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-bold text-background transition hover:opacity-90"
          >
            Upgrade Now
          </button>
        </div>

        {/* Trust strip */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-70">
          <TrustChip Icon={Users} top="Real people." bottom="Real impact." />
          <TrustChip Icon={ZapOff} top="No bots." bottom="No fake." />
          <TrustChip Icon={Target} top="Truth first." bottom="Always." />
          <TrustChip Icon={Lock} top="Your data." bottom="Always private." />
        </div>
      </div>

      {/* Verification flow modal — drives steps 1..5 */}
      <AnimatePresence>
        {step > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-background border border-border p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => (step > 1 && step < 4 ? back() : setStep(0))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={step > 1 && step < 4 ? 'Back' : 'Close'}
                >
                  {step > 1 && step < 4 ? <ChevronLeft size={22} /> : <X size={20} />}
                </button>
                <h2 className="text-[16px] font-bold">
                  {step === 1 && 'Take a Selfie'}
                  {step === 2 && 'Verify Your Identity'}
                  {step === 3 && 'Confirm & Pay'}
                  {step === 4 && 'Verifying...'}
                  {step === 5 && 'Verification Submitted'}
                </h2>
                <div className="w-6" />
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
                    <div className="mx-auto h-44 w-44 rounded-full border-4 border-primary/20 p-2">
                      <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-primary bg-muted">
                        {selfiePreview ? (
                          <img src={selfiePreview} alt="Selfie preview" className="h-full w-full object-cover" />
                        ) : (
                          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] text-muted-foreground">We need to make sure you&apos;re a real person.</p>
                    {cameraError ? (
                      <div className="space-y-3">
                        <p className="text-[12px] font-medium text-destructive">{cameraError}</p>
                        <button
                          onClick={() => {
                            setCameraError(null);
                            setSelfieBlob(null);
                            if (selfiePreview) URL.revokeObjectURL(selfiePreview);
                            setSelfiePreview(null);
                            setCameraSessionKey((v) => v + 1);
                          }}
                          className="w-full rounded-full border border-border py-3 text-[13px] font-bold text-foreground transition hover:bg-muted"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (selfiePreview) return;
                            const canvas = canvasRef.current;
                            const video = videoRef.current;
                            if (!canvas || !video || !video.videoWidth || !video.videoHeight) return;
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            canvas.getContext('2d')?.drawImage(video, 0, 0);
                            canvas.toBlob((blob) => {
                              if (!blob) return;
                              if (selfiePreview) URL.revokeObjectURL(selfiePreview);
                              setSelfieBlob(blob);
                              setSelfiePreview(URL.createObjectURL(blob));
                              setCameraReady(false);
                              setStream((prev) => {
                                stopMediaStream(prev);
                                return null;
                              });
                            }, 'image/webp', 0.9);
                          }}
                          disabled={!cameraReady || !!selfiePreview}
                          className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-50"
                        >
                          Take Selfie
                        </button>
                        {selfiePreview && (
                          <button
                            onClick={() => {
                              setSelfieBlob(null);
                              if (selfiePreview) URL.revokeObjectURL(selfiePreview);
                              setSelfiePreview(null);
                              setCameraSessionKey((v) => v + 1);
                            }}
                            className="w-full rounded-full border border-border py-3 text-[13px] font-bold text-foreground transition hover:bg-muted"
                          >
                            Retake
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={next}
                      disabled={!selfieBlob}
                      className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-50"
                    >
                      Continue
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                    <p className="text-[10px] text-muted-foreground italic">🔒 Your identity will remain private</p>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <p className="text-[13px] text-muted-foreground">Upload a government ID to verify your identity.</p>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Accepted IDs</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {ID_OPTIONS.map((opt) => {
                          const active = selectedId === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedId(opt.id)}
                              className={cn(
                                'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 transition-all',
                                active ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card opacity-70 hover:opacity-100'
                              )}
                            >
                              <Scan size={20} />
                              <span className="text-[10px] font-bold">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Upload ID</p>
                      <label className="flex aspect-[1.6/1] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card transition hover:bg-muted/50">
                        {docPreview ? (
                          <>
                            <CheckCircle2 size={28} className="text-primary" />
                            <p className="text-[12px] font-bold">{docPreview}</p>
                            <p className="text-[10px] text-muted-foreground">Tap to replace</p>
                          </>
                        ) : (
                          <>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                              <Smartphone size={22} className="text-muted-foreground" />
                            </div>
                            <p className="text-[13px] font-bold">Upload front side</p>
                            <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP (Max 10MB)</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setDocFile(file);
                            setDocPreview(file.name);
                          }}
                        />
                      </label>
                    </div>

                    <button
                      onClick={next}
                      disabled={!docFile}
                      className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-50"
                    >
                      Continue
                    </button>
                    <p className="text-center text-[10px] text-muted-foreground italic">🔒 Your identity will remain private</p>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Camera size={26} />
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Your selfie and ID will be uploaded securely before payment checkout opens.
                    </p>
                    <p className="text-[13px] font-bold">Proceed to payment to submit for review.</p>

                    <button
                      onClick={complete}
                      className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90"
                    >
                      Continue to Payment
                    </button>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-12 text-center">
                    <Loader2 size={42} className="animate-spin text-primary" />
                    <p className="text-[15px] font-bold">Verifying identity…</p>
                    <p className="text-[12px] text-muted-foreground">Hang tight, this only takes a moment.</p>
                  </motion.div>
                )}

                {step === 5 && (
                  <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-6 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-background">
                        <Check size={32} strokeWidth={3} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[20px] font-black text-primary">Submitted for Review</h3>
                      <p className="text-[12px] text-muted-foreground px-4">
                        Your identity is being verified. We&apos;ll update your profile once approved.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/profile')}
                      className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ index, title, subtitle }: { index: number; title: string; subtitle?: string }) {
  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold">{index}.</div>
        <h2 className="text-[15px] font-bold">{title}</h2>
      </div>
      {subtitle && <p className="ml-8 mt-1 text-[12px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: React.ReactNode; sub: string; highlight?: boolean }) {
  return (
    <div className="text-center min-w-0">
      <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1.5', highlight ? 'text-primary' : 'text-muted-foreground')}>{label}</p>
      <div className={cn('text-[30px] font-black leading-none tabular-nums flex items-center justify-center', highlight ? 'text-primary' : 'text-foreground')}>
        {value}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function ScoreDial({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="text-center min-w-0">
      <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1.5', highlight ? 'text-primary' : 'text-muted-foreground')}>{label}</p>
      <div className={cn('text-[24px] font-black leading-none tabular-nums', highlight ? 'text-primary' : 'text-foreground')}>{value}%</div>
      <div className="mx-auto mt-2 h-1 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full', highlight ? 'bg-primary' : 'bg-orange-400')}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function FlowStep({
  n, label, Icon, active,
}: { n: number; label: string; Icon: typeof User; active?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 text-center', !active && 'opacity-50')}>
      <div className="relative h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Icon size={20} className="text-muted-foreground" />
        {active && (
          <CheckCircle2 size={14} className="absolute -right-1 -bottom-1 text-primary bg-background rounded-full" />
        )}
      </div>
      <p className="text-[10px] font-bold">
        Step {n}
        <br />
        <span className="font-normal text-muted-foreground">{label}</span>
      </p>
    </div>
  );
}

function TrustChip({ Icon, top, bottom }: { Icon: typeof Users; top: string; bottom: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon size={18} />
      <p className="text-center text-[9px] font-bold leading-tight">{top}<br />{bottom}</p>
    </div>
  );
}
