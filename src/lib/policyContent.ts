import fs from 'fs';
import path from 'path';

/**
 * Maps route slug keys (subsection/slug) to the actual filename inside
 * content/legal-policies/. Filenames were supplied by the user and don't
 * always match the URL slug exactly.
 */
const FILE_MAP: Record<string, string> = {
  // Trust & Safety
  'trust-safety/community-guidelines':              'trust-safety/community-guidelines.md',
  'trust-safety/platform-safety-content-integrity': 'trust-safety/platform-safety-content-integrity-policy.md',
  'trust-safety/report-appeals-takedown':           'trust-safety/report-appeals-takedown-policy.md',
  'trust-safety/public-figure-profile-claim':       'trust-safety/public-figure-profile-claim-policy.md',
  'trust-safety/verification-trust':                'trust-safety/verification-trust-policy.md',

  // Legal
  'legal/terms-of-service':    'legal/terms-of-service.md',
  'legal/privacy-policy':      'legal/privacy-policy.md',
  'legal/cookie-policy':       'legal/cookie-policy.md',
  'legal/disclaimer-reputation': 'legal/disclaimer-reputation-policy.md',
  'legal/copyright-ip':        'legal/copyright-ip-policy.md',
  'legal/platform-positioning': 'legal/shosha-platform-positioning.md',
};

/**
 * Reads the markdown body for a given policy document.
 * Returns an empty string if the file is not found.
 */
export function getPolicyContent(subsection: string, slug: string): string {
  const key = `${subsection}/${slug}`;
  const filename = FILE_MAP[key];
  if (!filename) return '';

  const filepath = path.join(process.cwd(), 'content', 'legal-policies', filename);
  try {
    return fs.readFileSync(filepath, 'utf-8');
  } catch {
    return '';
  }
}
