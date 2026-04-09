import { test, expect } from '@playwright/test';

test.describe('Export/Import API', () => {
  test('GET /api/todos/export returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/todos/export');
    expect(response.status()).toBe(401);
  });

  test('GET /api/todos/export?format=csv returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/todos/export?format=csv');
    expect(response.status()).toBe(401);
  });

  test('POST /api/todos/import returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/todos/import', {
      data: [],
    });
    expect(response.status()).toBe(401);
  });
});
