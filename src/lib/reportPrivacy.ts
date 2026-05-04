import type { ReportRecord } from '@/lib/repos/reports';

type ReportPrivacyShape = Pick<ReportRecord, 'publicAnonymous' | 'reporterId'>;

export function hidesReporterOnPublicSurfaces(report: ReportPrivacyShape) {
  return report.publicAnonymous !== false || !report.reporterId;
}

export function redactPublicReporter<T extends ReportRecord & { reporter?: unknown | null }>(report: T): T {
  if (!hidesReporterOnPublicSurfaces(report)) return report;
  const redacted = {
    ...report,
    reporterId: null,
    anonymousTag: 'Anonymous',
  };
  if ('reporter' in redacted) {
    return { ...redacted, reporter: null } as T;
  }
  return redacted as T;
}
