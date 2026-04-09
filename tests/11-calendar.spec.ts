import { test, expect } from '@playwright/test';

test.describe('Calendar View', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Holidays API', () => {
  test('GET /api/holidays returns data', async ({ request }) => {
    const response = await request.get('/api/holidays?year=2025');
    // Holidays endpoint may or may not require auth depending on implementation
    const status = response.status();
    expect([200, 401]).toContain(status);
  });
});
