import { Resend } from 'resend';

// Lazy client — Resend's constructor throws when the key is missing, which
// blows up Next.js page-data collection at build time on Vercel.
let cached: Resend | null = null;
function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

// Primary notification recipients. Add future emails to this array.
const ADMIN_NOTIFY_EMAILS = [
  'yap@noshosha.com',
  'sreshtha@builtattic.com',
  'titiksha@builtattic.com',
  'tushar@builtattic.com',
];

export async function sendIssueReportEmail(report: {
  name: string;
  email: string;
  issueType: string;
  page: string;
  title: string;
  details: string;
  attachmentUrls?: string[];
  device?: string;
  browser?: string;
  severity?: string;
  createdAt: string;
  reportId: string;
}): Promise<void> {
  const attachmentsHtml = report.attachmentUrls?.length
    ? `<p><strong>Attachments:</strong><br>${report.attachmentUrls
        .map((url) => `<a href="${url}">${url}</a>`)
        .join('<br>')}</p>`
    : '';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const html = `
    <h2>New Issue Report — ${report.title}</h2>
    <table>
      <tr><td><strong>Report ID</strong></td><td>${report.reportId}</td></tr>
      <tr><td><strong>Submitted</strong></td><td>${report.createdAt}</td></tr>
      <tr><td><strong>Name</strong></td><td>${report.name}</td></tr>
      <tr><td><strong>Email</strong></td><td>${report.email}</td></tr>
      <tr><td><strong>Issue Type</strong></td><td>${report.issueType}</td></tr>
      <tr><td><strong>Page/Section</strong></td><td>${report.page}</td></tr>
      <tr><td><strong>Severity</strong></td><td>${report.severity ?? 'Not specified'}</td></tr>
      <tr><td><strong>Device</strong></td><td>${report.device ?? 'Not specified'}</td></tr>
      <tr><td><strong>Browser</strong></td><td>${report.browser ?? 'Not specified'}</td></tr>
    </table>
    <h3>Details</h3>
    <p style="white-space:pre-wrap">${report.details}</p>
    ${attachmentsHtml}
    <hr>
    <p><a href="${siteUrl}/admin/issues">View in Admin Dashboard</a></p>
  `;

  const resend = getResend();
  if (!resend) {
    console.error('[issue-report] RESEND_API_KEY is not set — skipping email send.');
    return;
  }

  try {
    const result = await resend.emails.send({
      from: 'noreply@noshosha.com',
      to: ADMIN_NOTIFY_EMAILS,
      subject: `[Shosha Issue] ${report.severity ? `[${report.severity}] ` : ''}${report.title}`,
      html,
    });

    if (result.error) {
      console.error('[issue-report] Resend API rejected the send:', {
        name: result.error.name,
        message: result.error.message,
        from: 'noreply@noshosha.com',
        to: ADMIN_NOTIFY_EMAILS,
      });
      return;
    }

    console.log('[issue-report] Resend email queued. id=', result.data?.id, 'to=', ADMIN_NOTIFY_EMAILS);
  } catch (err) {
    // Email failure must never fail the API response.
    console.error('[issue-report] Resend email threw:', err);
  }
}
