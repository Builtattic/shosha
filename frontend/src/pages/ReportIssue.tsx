import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/apiClient';
import { uploadMedia } from '@/api/media';
import { useToast } from '@/components/ui/Toast';

const ISSUE_TYPES = [
  'Bug',
  'UI Issue',
  'Performance Problem',
  'Incorrect Score/Calculation',
  'Broken Feature',
  'Report Abuse',
  'Security Concern',
  'Other',
] as const;

const PAGE_OPTIONS = [
  'Profile',
  'Feed',
  'People',
  'Ranks',
  'Impact',
  'Create Report',
  'Notifications',
  'Admin',
  'Other',
] as const;

const DEVICE_OPTIONS = ['iPhone', 'Android', 'Desktop', 'Tablet', 'Other'] as const;
const BROWSER_OPTIONS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'] as const;
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;

type FormState = {
  name: string;
  email: string;
  issue_type: string;
  page: string;
  title: string;
  details: string;
  device: string;
  browser: string;
  severity: string;
};

export default function ReportIssue() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    issue_type: '',
    page: '',
    title: '',
    details: '',
    device: '',
    browser: '',
    severity: '',
  });
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        name: profile.display_name ?? profile.username ?? prev.name,
        email: profile.email ?? prev.email,
      }));
    }
  }, [profile]);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.email.trim() &&
        form.issue_type &&
        form.page &&
        form.title.trim() &&
        form.details.trim() &&
        !submitting,
    );
  }, [form, submitting]);

  const isPriority = form.severity === 'High' || form.severity === 'Critical';

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || attachmentUrls.length >= 5) return;

    if (!profile) {
      toast.push('Sign in to attach files');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const res = await uploadMedia(file);
      if (res.ok && res.data?.url) {
        setAttachmentUrls((prev) => [...prev, res.data!.url]);
      } else {
        toast.push(res.error ?? 'Upload failed');
      }
    } catch {
      toast.push('Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await apiClient.post('/report-issue', {
        name: form.name.trim(),
        email: form.email.trim(),
        issue_type: form.issue_type,
        page: form.page,
        title: form.title.trim(),
        details: form.details.trim(),
        attachment_urls: attachmentUrls,
        device: form.device || undefined,
        browser: form.browser || undefined,
        severity: form.severity || undefined,
      });
      setSubmitted(true);
    } catch {
      toast.push('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <div>
      <main className="max-w-2xl mx-auto px-4 py-10 safe-bottom pb-20">
        <div className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h1 className="text-[22px] font-black mb-2">Report an Issue</h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Help us improve Shosha™ by reporting bugs, broken functionality, incorrect calculations,
            or abusive content. Please provide as much detail as possible — including steps to
            reproduce and screenshots where relevant.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-[20px] font-black mb-2">Report Submitted</h2>
            <p className="text-[14px] text-muted-foreground">
              Thank you for helping improve Shosha. Our team has been notified and will review your
              report shortly.
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 rounded-full border border-border bg-background px-6 py-2.5 text-[13px] font-semibold transition hover:bg-muted"
            >
              Go Back
            </button>
          </div>
        ) : (
          <form className="rounded-2xl border border-border bg-card p-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-foreground">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-foreground">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-foreground">Issue Type</span>
                <select
                  value={form.issue_type}
                  onChange={(e) => setField('issue_type', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                  required
                >
                  <option value="">Select issue type</option>
                  {ISSUE_TYPES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-foreground">Page/Section</span>
                <select
                  value={form.page}
                  onChange={(e) => setField('page', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                  required
                >
                  <option value="">Select page/section</option>
                  {PAGE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1.5 block">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-foreground">Issue Title</span>
                <span className="text-[11px] text-muted-foreground">{form.title.length}/150</span>
              </div>
              <input
                type="text"
                maxLength={150}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                required
              />
            </label>

            <label className="space-y-1.5 block">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-foreground">Details</span>
                <span className="text-[11px] text-muted-foreground">{form.details.length}/5000</span>
              </div>
              <textarea
                maxLength={5000}
                value={form.details}
                onChange={(e) => setField('details', e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px] min-h-[140px]"
                required
              />
            </label>

            <div className="space-y-2">
              <span className="text-[12px] font-bold text-foreground block">Screenshot/Attachment</span>
              {!profile && (
                <p className="text-[12px] text-muted-foreground">Sign in to attach files. You can still submit without attachments.</p>
              )}
              {profile && attachmentUrls.length < 5 && (
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleAttachment}
                  className="block w-full text-[13px]"
                />
              )}
              {uploading && <p className="text-[12px] text-muted-foreground">Uploading...</p>}
              {attachmentUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachmentUrls.map((url) => (
                    <span
                      key={url}
                      className="inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground"
                    >
                      <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">{url}</a>
                      <button
                        type="button"
                        onClick={() => setAttachmentUrls((prev) => prev.filter((u) => u !== url))}
                        className="text-[12px] leading-none"
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-foreground">Device</span>
                <select
                  value={form.device}
                  onChange={(e) => setField('device', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                >
                  <option value="">Not specified</option>
                  {DEVICE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-foreground">Browser</span>
                <select
                  value={form.browser}
                  onChange={(e) => setField('browser', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                >
                  <option value="">Not specified</option>
                  {BROWSER_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-foreground">Severity</span>
                <select
                  value={form.severity}
                  onChange={(e) => setField('severity', e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px]"
                >
                  <option value="">Not specified</option>
                  {SEVERITY_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            {isPriority && (
              <span className="inline-flex rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-bold text-red-500">
                We&apos;ll prioritize this
              </span>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-full bg-foreground py-3 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          For urgent security issues, contact us directly at{' '}
          <a href="mailto:tech@noshosha.com" className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80">
            tech@noshosha.com
          </a>
        </p>
      </main>
    </div>
  );
}
