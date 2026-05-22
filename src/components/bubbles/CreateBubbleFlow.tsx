'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  ArrowLeft, 
  Camera, 
  Upload, 
  Users, 
  Settings, 
  CheckCircle2, 
  Plus,
  Search,
  ChevronLeft,
  ChevronRight, 
  Globe, 
  Lock,
  Heart,
  GraduationCap,
  Briefcase,
  Trophy,
  MoreHorizontal,
  MessageCircle,
  Facebook,
  Send,
  Link2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { BubbleType, BubbleVisibility } from '@/lib/repos/bubbles';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Members' },
  { id: 3, label: 'Settings' },
  { id: 4, label: 'Review' }
];

const BUBBLE_TYPES = [
  { id: 'family', label: 'Family', icon: Heart },
  { id: 'friend_group', label: 'Friend Group', icon: Users },
  { id: 'college_group', label: 'College Group', icon: GraduationCap },
  { id: 'work_group', label: 'Work Group', icon: Briefcase },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'sports_group', label: 'Sports Group', icon: Trophy },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

const MIN_CROP = 32;
const MAX_CROP_DISPLAY_W = 480;
const MAX_CROP_DISPLAY_H = 360;

function cropDisplaySize(nw: number, nh: number) {
  let displayW = Math.min(nw, MAX_CROP_DISPLAY_W);
  let displayH = (displayW * nh) / nw;
  if (displayH > MAX_CROP_DISPLAY_H) {
    displayH = MAX_CROP_DISPLAY_H;
    displayW = (displayH * nw) / nh;
  }
  return { displayW, displayH, scale: displayW / nw };
}

type CropRect = { x: number; y: number; w: number; h: number };

type HandleMode = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type CropState = {
  type: 'cover' | 'image';
  objectUrl: string;
  aspect: number;
};

function maxCenteredRect(nw: number, nh: number, aspect: number): CropRect {
  let w = nw;
  let h = w / aspect;
  if (h > nh) {
    h = nh;
    w = h * aspect;
  }
  return { x: (nw - w) / 2, y: (nh - h) / 2, w, h };
}

function clampMove(rect: CropRect, nw: number, nh: number): CropRect {
  const x = Math.max(0, Math.min(rect.x, nw - rect.w));
  const y = Math.max(0, Math.min(rect.y, nh - rect.h));
  return { ...rect, x, y };
}

function resizeFromHandle(
  mode: HandleMode,
  startRect: CropRect,
  dx: number,
  dy: number,
  aspect: number,
  nw: number,
  nh: number
): CropRect {
  if (mode === 'move') {
    return clampMove({ ...startRect, x: startRect.x + dx, y: startRect.y + dy }, nw, nh);
  }

  let x = startRect.x;
  let y = startRect.y;
  let w = startRect.w;
  let h = startRect.h;

  if (mode === 'se') {
    w = Math.max(MIN_CROP, startRect.w + dx);
    h = w / aspect;
    if (x + w > nw) {
      w = nw - x;
      h = w / aspect;
    }
    if (y + h > nh) {
      h = nh - y;
      w = h * aspect;
    }
  } else if (mode === 'nw') {
    const brx = startRect.x + startRect.w;
    const bry = startRect.y + startRect.h;
    w = Math.max(MIN_CROP, startRect.w - dx);
    h = w / aspect;
    x = brx - w;
    y = bry - h;
    if (x < 0) {
      x = 0;
      w = brx;
      h = w / aspect;
    }
    if (y < 0) {
      y = 0;
      h = bry;
      w = h * aspect;
      x = brx - w;
    }
  } else if (mode === 'ne') {
    const bry = startRect.y + startRect.h;
    w = Math.max(MIN_CROP, startRect.w + dx);
    h = w / aspect;
    y = bry - h;
    if (x + w > nw) {
      w = nw - x;
      h = w / aspect;
      y = bry - h;
    }
    if (y < 0) {
      y = 0;
      h = bry;
      w = h * aspect;
    }
  } else if (mode === 'sw') {
    const brx = startRect.x + startRect.w;
    w = Math.max(MIN_CROP, startRect.w - dx);
    h = w / aspect;
    x = brx - w;
    y = startRect.y;
    if (x < 0) {
      x = 0;
      w = brx;
      h = w / aspect;
    }
    if (y + h > nh) {
      h = nh - y;
      w = h * aspect;
      x = brx - w;
    }
  } else if (mode === 'e') {
    w = Math.max(MIN_CROP, startRect.w + dx);
    h = w / aspect;
    const cy = startRect.y + startRect.h / 2;
    y = cy - h / 2;
    if (x + w > nw) {
      w = nw - x;
      h = w / aspect;
      y = cy - h / 2;
    }
    if (y < 0) y = 0;
    if (y + h > nh) y = nh - h;
  } else if (mode === 'w') {
    const brx = startRect.x + startRect.w;
    w = Math.max(MIN_CROP, startRect.w - dx);
    h = w / aspect;
    x = brx - w;
    const cy = startRect.y + startRect.h / 2;
    y = cy - h / 2;
    if (x < 0) {
      x = 0;
      w = brx;
      h = w / aspect;
      y = cy - h / 2;
    }
    if (y < 0) y = 0;
    if (y + h > nh) y = nh - h;
  } else if (mode === 's') {
    h = Math.max(MIN_CROP, startRect.h + dy);
    w = h * aspect;
    const cx = startRect.x + startRect.w / 2;
    x = cx - w / 2;
    y = startRect.y;
    if (y + h > nh) {
      h = nh - y;
      w = h * aspect;
      x = cx - w / 2;
    }
    if (x < 0) x = 0;
    if (x + w > nw) x = nw - w;
  } else if (mode === 'n') {
    const bry = startRect.y + startRect.h;
    h = Math.max(MIN_CROP, startRect.h - dy);
    w = h * aspect;
    const cx = startRect.x + startRect.w / 2;
    x = cx - w / 2;
    y = bry - h;
    if (y < 0) {
      y = 0;
      h = bry;
      w = h * aspect;
      x = cx - w / 2;
    }
    if (x < 0) x = 0;
    if (x + w > nw) x = nw - w;
  }

  w = Math.max(MIN_CROP, w);
  h = Math.max(MIN_CROP, w / aspect);

  return clampMove({ x, y, w, h }, nw, nh);
}

const HANDLES: { mode: HandleMode; cursor: string; style: CSSProperties }[] = [
  { mode: 'nw', cursor: 'nw-resize', style: { top: -5, left: -5 } },
  { mode: 'n', cursor: 'n-resize', style: { top: -5, left: '50%', marginLeft: -5 } },
  { mode: 'ne', cursor: 'ne-resize', style: { top: -5, right: -5 } },
  { mode: 'e', cursor: 'e-resize', style: { top: '50%', right: -5, marginTop: -5 } },
  { mode: 'se', cursor: 'se-resize', style: { bottom: -5, right: -5 } },
  { mode: 's', cursor: 's-resize', style: { bottom: -5, left: '50%', marginLeft: -5 } },
  { mode: 'sw', cursor: 'sw-resize', style: { bottom: -5, left: -5 } },
  { mode: 'w', cursor: 'w-resize', style: { top: '50%', left: -5, marginTop: -5 } },
];

function CropModal({
  cropState,
  onCancel,
  onConfirm,
  uploading,
}: {
  cropState: CropState;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  uploading?: boolean;
}) {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropRectRef = useRef<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const scaleRef = useRef(1);
  const nwRef = useRef(0);
  const nhRef = useRef(0);
  const displayWRef = useRef(0);
  const displayHRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: HandleMode;
    startX: number;
    startY: number;
    startRect: CropRect;
  } | null>(null);

  const aspectLabel =
    Math.abs(cropState.aspect - 16 / 6) < 0.01 ? '16:6' : '1:1';

  useEffect(() => {
    setReady(false);
    const img = new Image();
    imgRef.current = img;
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      nwRef.current = nw;
      nhRef.current = nh;
      const { displayW, displayH, scale } = cropDisplaySize(nw, nh);
      displayWRef.current = displayW;
      displayHRef.current = displayH;
      scaleRef.current = scale;
      cropRectRef.current = maxCenteredRect(nw, nh, cropState.aspect);
      setReady(true);
      setVersion((v) => v + 1);
    };
    img.onerror = () => {
      toast.push('Failed to load image.');
      onCancel();
    };
    img.src = cropState.objectUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when image URL changes
  }, [cropState.objectUrl, cropState.aspect]);

  const scale = scaleRef.current;
  const rect = cropRectRef.current;
  void version;

  const overlayStyle = ready
    ? {
        left: rect.x * scale,
        top: rect.y * scale,
        width: rect.w * scale,
        height: rect.h * scale,
      }
    : { left: 0, top: 0, width: 0, height: 0 };

  const syncOverlayDom = () => {
    const el = cropOverlayRef.current;
    if (!el) return;
    const s = scaleRef.current;
    const r = cropRectRef.current;
    el.style.left = `${r.x * s}px`;
    el.style.top = `${r.y * s}px`;
    el.style.width = `${r.w * s}px`;
    el.style.height = `${r.h * s}px`;
  };

  const onPointerDown = (mode: HandleMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...cropRectRef.current },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / scaleRef.current;
    const dy = (e.clientY - drag.startY) / scaleRef.current;
    cropRectRef.current = resizeFromHandle(
      drag.mode,
      drag.startRect,
      dx,
      dy,
      cropState.aspect,
      nwRef.current,
      nhRef.current
    );
    syncOverlayDom();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    dragRef.current = null;
    setVersion((v) => v + 1);
  };

  const handleCropAndUpload = () => {
    const img = imgRef.current;
    if (!img || !ready) return;
    const { x, y, w, h } = cropRectRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.push('Could not crop image.');
      return;
    }
    ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.push('Could not crop image.');
          return;
        }
        URL.revokeObjectURL(cropState.objectUrl);
        onConfirm(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="mx-auto flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col rounded-2xl bg-background p-6 shadow-xl">
        <h2 className="shrink-0 text-lg font-black">Crop image</h2>
        <p className="mt-1 shrink-0 text-sm text-muted-foreground">Aspect ratio: {aspectLabel}</p>

        <div className="mt-4 flex min-h-0 flex-1 justify-center overflow-auto">
          {ready ? (
            <div
              ref={containerRef}
              className="relative overflow-hidden"
              style={{
                width: displayWRef.current,
                height: displayHRef.current,
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img
                src={cropState.objectUrl}
                alt="Crop preview"
                draggable={false}
                className="block select-none"
                style={{
                  width: displayWRef.current,
                  height: displayHRef.current,
                }}
              />
              <div
                ref={cropOverlayRef}
                className="absolute touch-none"
                style={{
                  ...overlayStyle,
                  border: '2px solid white',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  cursor: 'move',
                }}
                onPointerDown={onPointerDown('move')}
              >
                {HANDLES.map(({ mode, cursor, style }) => (
                  <div
                    key={mode}
                    role="presentation"
                    className="absolute z-10 bg-white"
                    style={{
                      width: 10,
                      height: 10,
                      cursor,
                      ...style,
                    }}
                    onPointerDown={onPointerDown(mode)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        <div className="mt-6 flex shrink-0 gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || uploading}
            onClick={handleCropAndUpload}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Crop & Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateBubbleFlow() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'image' | null>(null);
  const [cropState, setCropState] = useState<CropState | null>(null);

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    description: '',
    type: 'friend_group' as BubbleType,
    category: '',
    coverImageUrl: '',
    imageUrl: '',
    visibility: 'public' as BubbleVisibility,
  });

  const [invited, setInvited] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const executeUpload = async (blob: Blob, type: 'cover' | 'image') => {
    setUploading(type);
    const formData = new FormData();
    formData.append('file', blob, `${type}-${Date.now()}.jpg`);

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Upload failed');

      setForm((prev) => ({
        ...prev,
        [type === 'cover' ? 'coverImageUrl' : 'imageUrl']: payload.data.url,
      }));
      toast.push('Image uploaded successfully!');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropState({
      type,
      objectUrl: URL.createObjectURL(file),
      aspect: type === 'cover' ? 16 / 6 : 1,
    });
    e.target.value = '';
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/accounts/search?q=${encodeURIComponent(q)}`);
      const payload = await res.json();
      if (payload.ok) {
        setSearchResults(payload.data.candidates || []);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const toggleInvite = (user: any) => {
    if (invited.find(i => i.username === user.username)) {
      setInvited(prev => prev.filter(i => i.username !== user.username));
    } else {
      setInvited(prev => [...prev, user]);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bubbles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          invitedUsernames: invited.map((user) => user.username).filter(Boolean),
        }),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Failed to create bubble');
      
      toast.push('Bubble created successfully! Redirecting...');
      setTimeout(() => {
        router.push(`/bubbles/${payload.data._id}`);
      }, 1500);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Creation failed');
      setLoading(false);
    }
  };

  const canContinue = () => {
    if (step === 1) {
      return form.name.length >= 2 && form.description.length >= 10;
    }
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  return (
    <>
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex flex-col items-center border-b bg-background/80 backdrop-blur-md px-4 py-4 md:py-6">
        <div className="flex w-full max-w-5xl items-center justify-between">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-transform active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-[18px] md:text-[22px] font-black leading-tight">Create Bubble</h1>
            <p className="text-[12px] md:text-[13px] text-muted-foreground">Build your community. Set your impact.</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Steps Progress */}
        <div className="mt-6 flex w-full max-w-2xl items-center justify-between px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="relative flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full text-[12px] md:text-[14px] font-black transition-all",
                  step >= s.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : "bg-muted text-muted-foreground"
                )}>
                  {s.id}
                </div>
                <span className={cn(
                  "mt-1 text-[10px] md:text-[11px] font-bold transition-colors",
                  step === s.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "mx-2 h-[2px] flex-1 -translate-y-2.5 md:-translate-y-3.5",
                  step > s.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-8 lg:grid-cols-2"
            >
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-[20px] md:text-[24px] font-black">Bubble Identity</h2>
                  <p className="text-[13px] md:text-[14px] text-muted-foreground">Add the basics about your community.</p>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Cover Image <span className="text-muted-foreground">(Recommended)</span></label>
                  <label className="relative block cursor-pointer">
                    <div className="relative flex aspect-[16/6] w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-muted/30 transition-all hover:bg-muted/50 group">
                      {uploading === 'cover' ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <p className="text-[12px] font-bold">Uploading...</p>
                        </div>
                      ) : (
                        <>
                          <Upload size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          <p className="mt-2 text-[13px] font-bold">Upload cover image</p>
                          <p className="text-[11px] text-muted-foreground">Recommended size: 1600 x 600 px</p>
                        </>
                      )}
                      {form.coverImageUrl && <img src={form.coverImageUrl} alt="Cover" className="absolute inset-0 h-full w-full rounded-[24px] object-cover" />}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'cover')} />
                  </label>
                </div>

                <div className="grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] gap-4">
                  {/* Bubble Image Upload */}
                  <div className="space-y-2">
                    <label className="text-[12px] font-black uppercase tracking-wider">Bubble Image <span className="text-muted-foreground">(Recommended)</span></label>
                    <label className="relative block cursor-pointer">
                      <div className="relative flex aspect-square w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-muted/30 transition-all hover:bg-muted/50 group">
                        {uploading === 'image' ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <>
                            <Users size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            <p className="mt-1 text-center text-[10px] md:text-[11px] font-bold leading-tight">Upload Image</p>
                          </>
                        )}
                        {form.imageUrl && <img src={form.imageUrl} alt="Bubble" className="absolute inset-0 h-full w-full rounded-[24px] object-cover" />}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'image')} />
                    </label>
                  </div>

                  <div className="space-y-4">
                    {/* Bubble Name */}
                    <div className="space-y-2">
                      <label className="text-[12px] font-black uppercase tracking-wider">Bubble Name <span className="text-red-500">*</span></label>
                      <input 
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        placeholder="e.g. Dream Chasers"
                        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] md:text-[15px] outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <div className="text-right text-[10px] text-muted-foreground">{form.name.length}/50</div>
                    </div>

                    {/* Tagline */}
                    <div className="space-y-2">
                      <label className="text-[12px] font-black uppercase tracking-wider">Tagline <span className="text-muted-foreground">(Optional)</span></label>
                      <input 
                        value={form.tagline}
                        onChange={e => setForm({...form, tagline: e.target.value})}
                        placeholder="e.g. Building a better future, together."
                        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] md:text-[15px] outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <div className="text-right text-[10px] text-muted-foreground">{form.tagline.length}/80</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Description <span className="text-red-500">*</span></label>
                  <textarea 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Describe your bubble, its purpose and what members can expect."
                    className="min-h-[120px] lg:min-h-[220px] w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] md:text-[15px] outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                  <div className="text-right text-[10px] text-muted-foreground">{form.description.length}/300</div>
                </div>

                {/* Type Selection (Icon Grid) */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Bubble Type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 gap-2">
                    {BUBBLE_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setForm({...form, type: t.id as BubbleType})}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl border px-2 py-3 transition-all",
                          form.type === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/50"
                        )}
                      >
                        <t.icon size={20} className={form.type === t.id ? "text-primary" : "text-muted-foreground"} />
                        <span className="mt-2 text-center text-[10px] font-bold leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              <div className="text-center">
                <h2 className="text-[20px] md:text-[24px] font-black">Invite Members</h2>
                <p className="text-[13px] md:text-[14px] text-muted-foreground">Every community starts with a core team.</p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or handle..."
                    className="h-14 w-full rounded-[24px] bg-muted/50 pl-12 pr-4 text-sm md:text-base font-medium outline-none transition-all focus:bg-muted focus:ring-2 focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {searching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-[300px] overflow-y-auto rounded-[24px] border border-border bg-background p-2 shadow-xl shadow-black/5">
                    {searchResults.map((user) => (
                      <button
                        key={user.username}
                        onClick={() => toggleInvite(user)}
                        className="flex w-full items-center gap-3 rounded-[16px] p-2 transition-all hover:bg-muted active:scale-[0.98]"
                      >
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                          {user.displayName?.[0]}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm md:text-base font-bold">{user.displayName}</p>
                          <p className="text-[11px] md:text-[12px] text-muted-foreground">@{user.username}</p>
                        </div>
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                          invited.find(i => i.username === user.username) ? "bg-primary border-primary scale-110" : "border-muted-foreground/30"
                        )}>
                          {invited.find(i => i.username === user.username) && <Plus size={14} className="text-white rotate-45" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[12px] font-black uppercase tracking-wider px-1">Invited Members ({invited.length})</label>
                  <div className="flex flex-wrap gap-2 rounded-[24px] border border-dashed border-border p-4 bg-muted/10 min-h-[100px]">
                    {invited.map((user) => (
                      <motion.div 
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={user.username} 
                        className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20"
                      >
                        <span className="text-[12px] md:text-[13px] font-bold">{user.displayName}</span>
                        <button onClick={() => toggleInvite(user)} className="text-primary hover:text-red-500 transition-colors">
                          <Plus size={14} className="rotate-45" />
                        </button>
                      </motion.div>
                    ))}
                    {invited.length === 0 && (
                      <div className="flex flex-col items-center justify-center w-full text-center space-y-1 py-4">
                        <Users size={24} className="text-muted-foreground/40" />
                        <p className="text-[12px] text-muted-foreground">No one invited yet. Search and add your core members.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              <div className="text-center">
                <h2 className="text-[20px] md:text-[24px] font-black">Bubble Settings</h2>
                <p className="text-[13px] md:text-[14px] text-muted-foreground">Configure how your community operates.</p>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-border bg-card p-6 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-black">Private Bubble</p>
                      <p className="text-[12px] text-muted-foreground">Only invited members can join.</p>
                    </div>
                    <button 
                      onClick={() => setForm({...form, visibility: form.visibility === 'public' ? 'private' : 'public'})}
                      className={cn(
                        "h-7 w-14 rounded-full transition-all relative outline-none ring-offset-background focus:ring-2 focus:ring-primary/20",
                        form.visibility === 'private' ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow-sm",
                        form.visibility === 'private' ? "left-8" : "left-1"
                      )} />
                    </button>
                  </div>
                  <div className="border-t border-border pt-6 flex items-center justify-between">
                    <div>
                      <p className="text-base font-black">Allow Member Invites</p>
                      <p className="text-[12px] text-muted-foreground">Members can invite others to join.</p>
                    </div>
                    <div className="h-7 w-14 rounded-full bg-primary relative cursor-not-allowed opacity-50">
                      <div className="absolute top-1 left-8 h-5 w-5 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-muted/30 p-6 border border-border/50">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Settings size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-[14px] font-black">Admin Oversight</p>
                      <p className="text-[12px] md:text-[13px] text-muted-foreground leading-relaxed">
                        As the creator, you have full control over members and settings. 
                        You can promote others to admin roles once the bubble is established.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              <div className="text-center">
                <h2 className="text-[20px] md:text-[24px] font-black">Final Review</h2>
                <p className="text-[13px] md:text-[14px] text-muted-foreground">Make sure everything is perfect.</p>
              </div>

              <div className="space-y-6">
                <div className="overflow-hidden rounded-[24px] border border-border bg-background shadow-xl shadow-black/5">
                  <div className="relative h-32 md:h-48 w-full bg-muted">
                    {form.coverImageUrl && <img src={form.coverImageUrl} alt="Cover" className="h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <div className="flex gap-4 p-6">
                    <div className="relative -mt-14 h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-[24px] border-4 border-background bg-muted shadow-2xl">
                      {form.imageUrl && <img src={form.imageUrl} alt="Bubble" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl md:text-2xl font-black">{form.name || 'Unnamed Bubble'}</h4>
                      <p className="text-[14px] md:text-[16px] font-bold text-primary">{form.tagline || 'No tagline set'}</p>
                    </div>
                  </div>
                  <div className="border-t border-border p-6 bg-muted/5">
                    <p className="text-[13px] md:text-[14px] text-muted-foreground leading-relaxed italic">&quot;{form.description}&quot;</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] bg-muted/30 p-5 border border-border/50">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Visibility</p>
                    <p className="text-base font-bold capitalize flex items-center gap-2">
                      {form.visibility === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                      {form.visibility}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-muted/30 p-5 border border-border/50">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Invitations</p>
                    <p className="text-base font-bold flex items-center gap-2">
                      <Users size={16} />
                      {invited.length} members
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex gap-3 mx-auto max-w-2xl">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex h-14 items-center justify-center rounded-[24px] border-2 border-border px-8 text-sm md:text-base font-black transition-all hover:bg-muted active:scale-95"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue() || loading}
            className="flex h-14 flex-1 items-center justify-center rounded-[24px] bg-primary text-sm md:text-base font-black text-white transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : step === 4 ? (
              'Create Bubble'
            ) : (
              'Continue'
            )}
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          By creating a bubble, you agree to the ShoSha community guidelines and impact standards.
        </p>
      </main>
    </div>
    {cropState && (
      <CropModal
        cropState={cropState}
        uploading={uploading === cropState.type}
        onCancel={() => {
          URL.revokeObjectURL(cropState.objectUrl);
          setCropState(null);
        }}
        onConfirm={(blob) => {
          executeUpload(blob, cropState.type);
          setCropState(null);
        }}
      />
    )}
    </>
  );
}
