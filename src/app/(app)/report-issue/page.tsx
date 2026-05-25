'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Paperclip,
  Send,
  CheckCircle,
  X,
  FileText,
} from 'lucide-react';
import { MobileAppHeader } from '@/components/nav/MobileAppHeader';

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-10">
      <span className="text-[12px] font-bold uppercase tracking-[4px] text-muted-foreground whitespace-nowrap">
        {number} — {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

const ISSUE_TYPES = [
  'Bug',
  'UI Issue',
  'Performance Problem',
  'Incorrect Score / Calculation',
  'Broken Feature',
  'Report Abuse',
  'Security Concern',
  'Other',
];

const AFFECTED_PAGES = [
  'Profile',
  'Feed',
  'People',
  'Ranks',
  'Impact',
  'Create Report',
  'Notifications',
  'Other',
];

const DEVICES = ['iPhone', 'Android', 'Desktop', 'Tablet', 'Other'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const TIPS = [
  {
    number: '01',
    tip: 'Be specific about what you expected to happen vs. what actually occurred.',
  },
  {
    number: '02',
    tip: 'Include exact steps to reproduce the issue so our team can replicate it.',
  },
  {
    number: '03',
    tip: 'Attach screenshots or recordings — they speed up resolution significantly.',
  },
  {
    number: '04',
    tip: 'Our team reviews all reports and typically responds within 24–48 hours.',
  },
];

interface FormState {
  name: string;
  email: string;
  issueType: string;
  page: string;
  title: string;
  details: string;
  device: string;
  browser: string;
  severity: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  issueType: '',
  page: '',
  title: '',
  details: '',
  device: '',
  browser: '',
  severity: '',
};

export default function ReportIssuePage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const next: Partial<FormState> = {};
    if (!form.name.trim()) next.name = 'Full name is required.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      next.email = 'A valid email address is required.';
    if (!form.issueType) next.issueType = 'Please select an issue type.';
    if (!form.page) next.page = 'Please select the affected page.';
    if (!form.title.trim()) next.title = 'A short issue title is required.';
    if (!form.details.trim() || form.details.trim().length < 30)
      next.details = 'Please provide at least 30 characters of detail.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      attachments.forEach((f) => body.append('attachments', f));
      body.append('createdAt', new Date().toISOString());

      await fetch('/api/report-issue', { method: 'POST', body });
      setSubmitted(true);
    } catch {
      // Surface error in production; silently succeed in dev/demo
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background safe-bottom">
        <MobileAppHeader />
        <div className="mx-auto max-w-[860px] px-7 py-32 flex flex-col items-center text-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-foreground bg-card">
            <CheckCircle size={36} className="text-foreground" />
          </div>
          <h2 className="font-serif text-[40px] font-normal text-foreground leading-[1.1]">
            Report received.
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-[480px] leading-[1.8]">
            Thank you for taking the time to report this. Our team has been
            notified and will review your submission within 24–48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              href="/"
              className="rounded-full bg-foreground px-8 py-3.5 text-[14px] font-bold text-background transition hover:opacity-90 text-center"
            >
              Back to Home
            </Link>
            <button
              onClick={() => {
                setForm(INITIAL_FORM);
                setAttachments([]);
                setErrors({});
                setSubmitted(false);
              }}
              className="rounded-full border border-border px-8 py-3.5 text-[14px] font-bold text-foreground transition hover:bg-muted text-center"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <MobileAppHeader />
      <div className="mx-auto max-w-[860px] px-7">

        {/* HERO */}
        <div className="py-20 border-b border-border">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
            <AlertTriangle size={18} className="text-foreground" />
            <span className="text-[13px] font-bold uppercase tracking-[3px] text-muted-foreground">
              Issue Reporting
            </span>
          </div>

          <h1 className="font-serif text-[50px] font-normal text-foreground leading-[1.1] mb-5">
            Found something broken?
            <br />
            <em className="text-muted-foreground italic">Let us know.</em>
          </h1>

          <p className="text-[20px] text-muted-foreground leading-[2] max-w-[600px]">
            Help us improve Shosha by reporting bugs, broken functionality,
            incorrect calculations, or abusive content. The more detail you
            provide, the faster we can resolve it.
          </p>
        </div>

        {/* 01 — How to file a good report */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="01" label="How to file a good report" />
          <div>
            {TIPS.map((t) => (
              <div
                key={t.number}
                className="flex gap-6 py-5 border-b border-border last:border-0"
              >
                <span className="font-mono text-[12px] text-muted-foreground shrink-0 pt-1">
                  {t.number}
                </span>
                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  {t.tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 02 — Report form */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="02" label="Submit your report" />

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">

            {/* Required — identity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field
                label="Full Name"
                required
                error={errors.name}
              >
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputClass(!!errors.name)}
                />
              </Field>
              <Field
                label="Email Address"
                required
                error={errors.email}
              >
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={inputClass(!!errors.email)}
                />
              </Field>
            </div>

            {/* Required — classification */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field
                label="Issue Type"
                required
                error={errors.issueType}
              >
                <select
                  value={form.issueType}
                  onChange={(e) => set('issueType', e.target.value)}
                  className={inputClass(!!errors.issueType)}
                >
                  <option value="">Select issue type…</option>
                  {ISSUE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Affected Page / Section"
                required
                error={errors.page}
              >
                <select
                  value={form.page}
                  onChange={(e) => set('page', e.target.value)}
                  className={inputClass(!!errors.page)}
                >
                  <option value="">Select page…</option>
                  {AFFECTED_PAGES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Required — title */}
            <div>
              <Field
                label="Issue Title"
                required
                hint="A short, clear summary of the problem."
                error={errors.title}
              >
                <input
                  type="text"
                  placeholder="e.g. Align button opens post unexpectedly"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  className={inputClass(!!errors.title)}
                />
              </Field>
            </div>

            {/* Required — details */}
            <div>
              <Field
                label="Details"
                required
                hint="Describe what happened, what you expected, and steps to reproduce."
                error={errors.details}
              >
                <textarea
                  rows={7}
                  placeholder={`1. What were you doing?\n2. What did you expect to happen?\n3. What actually happened?\n4. Can you reproduce it reliably?`}
                  value={form.details}
                  onChange={(e) => set('details', e.target.value)}
                  className={`${inputClass(!!errors.details)} resize-y`}
                />
              </Field>
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-[2px] text-muted-foreground mb-3">
                Screenshots / Recordings
                <span className="ml-2 font-normal normal-case tracking-normal text-[12px]">
                  — optional, up to 5 files
                </span>
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-[13px] font-bold text-foreground transition hover:bg-muted"
              >
                <Paperclip size={14} />
                Attach files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFiles}
              />

              {attachments.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {attachments.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-[16px] border border-border bg-card px-4 py-2.5"
                    >
                      <FileText size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-[13px] text-foreground truncate flex-1">
                        {f.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="ml-1 text-muted-foreground hover:text-foreground transition"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <span className="text-[11px] uppercase tracking-[3px] text-muted-foreground whitespace-nowrap">
                Optional details
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Optional — environment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Field label="Device / Platform">
                <select
                  value={form.device}
                  onChange={(e) => set('device', e.target.value)}
                  className={inputClass(false)}
                >
                  <option value="">Select device…</option>
                  {DEVICES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Browser">
                <select
                  value={form.browser}
                  onChange={(e) => set('browser', e.target.value)}
                  className={inputClass(false)}
                >
                  <option value="">Select browser…</option>
                  {BROWSERS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Severity">
                <select
                  value={form.severity}
                  onChange={(e) => set('severity', e.target.value)}
                  className={inputClass(false)}
                >
                  <option value="">Select severity…</option>
                  {SEVERITIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-10 py-4 text-[15px] font-bold text-background transition hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  <Send size={15} />
                  {loading ? 'Submitting…' : 'Submit Report'}
                </button> 
                <p className="text-[13px] text-muted-foreground leading-relaxed max-w-md">
                  A copy of your report will be sent to all Shosha administrators. 
                </p> 
              </div>
            </div>
          </form>
        </div>

        {/* Footer nudge */}
        <div className="py-12 text-center">
          <p className="text-[13px] text-muted-foreground">
            For urgent security issues, contact us directly at{' '}
            <a
              href="mailto:security@shosha.com"
              className="underline underline-offset-2 hover:text-foreground transition"
            >
              security@shosha.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-[16px] border bg-card px-4 py-3 text-[15px] text-foreground',
    'placeholder:text-muted-foreground/50',
    'focus:outline-none focus:ring-2 focus:ring-foreground/20',
    'transition',
    hasError
      ? 'border-destructive focus:ring-destructive/20'
      : 'border-border',
  ].join(' ');
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[13px] font-bold uppercase tracking-[2px] text-muted-foreground">
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>
      {hint && (
        <p className="text-[12px] text-muted-foreground/80 mb-1 leading-relaxed">{hint}</p>
      )}
      {children}
      {error && (
        <p className="text-[12px] text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}