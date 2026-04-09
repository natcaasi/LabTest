import { test, expect } from '@playwright/test';

test.describe('Subtasks API', () => {
  test('should return 401 when creating subtask without auth', async ({ request }) => {
    const response = await request.post('/api/todos/1/subtasks', {
      data: { title: 'Subtask' },
    });
    expect(response.status()).toBe(401);
  });

  test('should return 401 when updating subtask without auth', async ({ request }) => {
    const response = await request.put('/api/subtasks/1', {
      data: { completed: 1 },
    });
    expect(response.status()).toBe(401);
  });

  test('should return 401 when deleting subtask without auth', async ({ request }) => {
    const response = await request.delete('/api/subtasks/1');
    expect(response.status()).toBe(401);
  });
});
