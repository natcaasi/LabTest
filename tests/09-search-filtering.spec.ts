import { test, expect } from '@playwright/test';

test.describe('Search & Filtering', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
