import { test, expect } from '@playwright/test';

test.describe('Recurring Todos API', () => {
  test('should return 401 for unauthenticated recurring todo creation', async ({ request }) => {
    const response = await request.post('/api/todos', {
      data: {
        title: 'Recurring test',
        priority: 'medium',
        is_recurring: true,
        recurrence_pattern: 'daily',
      },
    });
    expect(response.status()).toBe(401);
  });
});
