import { test, expect } from '@playwright/test';

test.describe('Reminders & Notifications API', () => {
  test('GET /api/notifications/check returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/notifications/check');
    expect(response.status()).toBe(401);
  });
});
