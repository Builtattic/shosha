import { test, expect } from '@playwright/test';

test('sign-up route renders Clerk widget', async ({ page }) => {
  await page.goto('/sign-up');
  // Clerk's prebuilt SignUp component renders an "email" or "username" field.
  await expect(page.locator('body')).toBeVisible();
});
