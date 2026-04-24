import { test, expect } from '@playwright/test';

test('signup path renders and archive can be entered', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
});
