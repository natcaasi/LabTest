import { test, expect } from '@playwright/test';

test.describe('Tags API', () => {
  test('GET /api/tags returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/tags');
    expect(response.status()).toBe(401);
  });

  test('POST /api/tags returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/tags', {
      data: { name: 'Work', color: '#3B82F6' },
    });
    expect(response.status()).toBe(401);
  });

  test('PUT /api/tags/:id returns 401 without auth', async ({ request }) => {
    const response = await request.put('/api/tags/1', {
      data: { name: 'Updated', color: '#EF4444' },
    });
    expect(response.status()).toBe(401);
  });

  test('DELETE /api/tags/:id returns 401 without auth', async ({ request }) => {
    const response = await request.delete('/api/tags/1');
    expect(response.status()).toBe(401);
  });
});
