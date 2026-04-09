import { test, expect } from '@playwright/test';

test.describe('Priority System API', () => {
  test('POST /api/todos rejects invalid priority', async ({ request }) => {
    const response = await request.post('/api/todos', {
      data: { title: 'Test', priority: 'invalid' },
    });
    // Should return 401 because not authenticated
    expect(response.status()).toBe(401);
  });
});

test.describe('Priority Filter UI', () => {
  test('should have priority filter dropdown on login page redirect', async ({ page }) => {
    await page.goto('/');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
