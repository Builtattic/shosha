'use client';

import { useState } from 'react';
import { Check, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { MediaUploader, type UploadedMedia } from '@/components/report/MediaUploader';
import { cn } from '@/lib/utils';

export function ReportModal({
  accountId,
  open,
  onClose
}: {
  accountId: string;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'positive' | 'negative' | null>(null);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [description, setDescription] = useState('');
  const [feelings, setFeelings] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<null | {
    aiVerdict: { valid: boolean; confidence: number; proposedImpact: number; reasoning: string; abuseFlags: string[] };
    status: string;
  }>(null);

  async function submit() {
    if (!type || !media || description.length < 10 || feelings.length < 10) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, type, media, description, feelings })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error.message);
      setVerdict(payload.data);
      toast.push('AI adjudication attached to the filing.');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'The filing could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setStep(1);
    setType(null);
    setMedia(null);
    setDescription('');
    setFeelings('');
    setVerdict(null);
    onClose();
  }

  return (
    <Modal open={open} title="File report" onClose={close}>
      <div className="mb-4 grid grid-cols-3 gap-2 text-xs uppercase text-muted">
        {[1, 2, 3].map((item) => (
          <div key={item} className={cn('border border-border p-2 text-center', step === item && 'border-accent text-accent')}>
            Step {item}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          {(['positive', 'negative'] as const).map((option) => {
            const Icon = option === 'positive' ? ThumbsUp : ThumbsDown;
            return (
              <button
                key={option}
                type="button"
                className={cn(
                  'flex min-h-24 w-full items-center gap-4 border border-border bg-raised p-4 text-left',
                  type === option && 'border-accent'
                )}
                onClick={() => setType(option)}
              >
                <Icon className="text-accent" />
                <span>
                  <span className="block font-serif text-3xl capitalize">{option}</span>
                  <span className="text-xs uppercase text-muted">
                    {option === 'positive' ? 'Can raise the Shosha Score' : 'Can lower the Shosha Score'}
                  </span>
                </span>
              </button>
            );
          })}
          <Button className="w-full" disabled={!type} onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <MediaUploader value={media} onChange={setMedia} />
          <div>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              placeholder="what happened"
            />
            <p className="mt-1 text-right text-xs text-muted">{description.length}/500</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!media || description.length < 10} onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <Textarea
              value={feelings}
              onChange={(event) => setFeelings(event.target.value)}
              maxLength={500}
              placeholder="how it felt"
            />
            <p className="mt-1 text-right text-xs text-muted">{feelings.length}/500</p>
          </div>
          {verdict ? (
            <div className="border border-accent bg-dim p-4">
              <p className="text-xs uppercase text-muted">AI verdict</p>
              <p className="mt-2 font-serif text-3xl">{verdict.aiVerdict.valid ? 'Valid filing' : 'Flagged filing'}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{verdict.aiVerdict.reasoning}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs uppercase">
                <span>Confidence {Math.round(verdict.aiVerdict.confidence * 100)}%</span>
                <span>Impact {verdict.aiVerdict.proposedImpact}</span>
              </div>
              <Button className="mt-4 w-full" onClick={close}>
                <Check size={16} />
                Confirm filed
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={submitting || feelings.length < 10} onClick={submit}>
                {submitting ? 'Adjudicating' : 'Submit'}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
