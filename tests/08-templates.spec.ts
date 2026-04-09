import { test, expect } from '@playwright/test';

test.describe('Templates API', () => {
  test('GET /api/templates returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/templates');
    expect(response.status()).toBe(401);
  });

  test('POST /api/templates returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/templates', {
      data: { name: 'Template', title_template: 'Test', priority: 'medium' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/templates/:id/use returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/templates/1/use', {
      data: {},
    });
    expect(response.status()).toBe(401);
  });

  test('DELETE /api/templates/:id returns 401 without auth', async ({ request }) => {
    const response = await request.delete('/api/templates/1');
    expect(response.status()).toBe(401);
  });
});
