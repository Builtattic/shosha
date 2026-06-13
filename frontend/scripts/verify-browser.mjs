/**
 * Temporary browser verification for billing redirect + PDF export.
 * Run: npx playwright install chromium (first time), then node scripts/verify-browser.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'verify-output');
fs.mkdirSync(outDir, { recursive: true });

const base = 'http://localhost:5173';

const mockUser = {
  uid: 'fb_dev_preview',
  email: 'dev@shosha.local',
  displayName: 'Dev Preview',
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.addInitScript((user) => {
    localStorage.setItem('mock_fb_user', JSON.stringify(user));
  }, mockUser);
  const page = await context.newPage();

  const results = {};

  // Authenticate via dev preview (mock mode)
  await page.goto(`${base}/sign-in`, { waitUntil: 'networkidle' });
  const devBtn = page.getByRole('button', { name: /Enter as Dev Preview User/i });
  if (await devBtn.isVisible().catch(() => false)) {
    await devBtn.click();
    await page.waitForURL(/\/(dashboard|profile)/, { timeout: 10000 });
  }

  // Billing redirect (authenticated)
  await page.goto(`${base}/billing`, { waitUntil: 'networkidle' });
  results.billing = {
    finalUrl: page.url(),
    pass: page.url().includes('/profile/upgrade'),
  };

  // PDF export
  await page.goto(`${base}/profile`, { waitUntil: 'networkidle' });
  const shareBtn = page.getByRole('button', { name: /share/i }).first();
  const shareVisible = await shareBtn.isVisible().catch(() => false);
  results.pdf = { shareButtonVisible: shareVisible };

  if (shareVisible) {
    await shareBtn.click();
    const pdfBtn = page.getByRole('button', { name: /^PDF$/i });
    await pdfBtn.waitFor({ state: 'visible', timeout: 5000 });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      pdfBtn.click(),
    ]);
    const suggested = download.suggestedFilename();
    const savePath = path.join(outDir, suggested);
    await download.saveAs(savePath);
    const stat = fs.statSync(savePath);
    results.pdf = {
      shareButtonVisible: true,
      filename: suggested,
      bytes: stat.size,
      pass: suggested.endsWith('.pdf') && stat.size > 1000,
    };
  } else {
    results.pdf.pass = false;
    results.pdf.note = 'Share button not visible (may need auth / mocks)';
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
