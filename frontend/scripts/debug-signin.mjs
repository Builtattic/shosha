import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/sign-in', { waitUntil: 'networkidle' });
const text = await page.content();
console.log('HAS_DEV_PREVIEW', text.includes('Enter as Dev Preview User'));
console.log('HAS_MOCKS_NOTE', text.includes('UI preview'));
await page.screenshot({ path: 'verify-output/sign-in.png', fullPage: true });
await browser.close();
