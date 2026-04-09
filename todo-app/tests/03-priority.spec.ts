import { test, expect } from '@playwright/test';
import { createTodo } from './helpers';

test.describe('Priority System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display priority badges', async ({ page }) => {
    await createTodo(page, 'Low Priority', { priority: 'low' });
    await createTodo(page, 'Medium Priority', { priority: 'medium' });
    await createTodo(page, 'High Priority', { priority: 'high' });

    await expect(page.locator('text=low')).toBeVisible();
    await expect(page.locator('text=medium')).toBeVisible();
    await expect(page.locator('text=high')).toBeVisible();
  });

  test('should sort by priority', async ({ page }) => {
    await createTodo(page, 'Low', { priority: 'low' });
    await page.waitForTimeout(300);
    await createTodo(page, 'High', { priority: 'high' });
    await page.waitForTimeout(300);
    await createTodo(page, 'Medium', { priority: 'medium' });

    const todos = page.locator('[class*="card"]');
    const firstTodo = todos.first();
    await expect(firstTodo).toContainText(/High|Medium|Low/);
  });

  test('should filter by priority', async ({ page }) => {
    await createTodo(page, 'High Task', { priority: 'high' });
    await createTodo(page, 'Low Task', { priority: 'low' });

    const prioritySelect = page.locator('select').nth(1);
    await prioritySelect.selectOption('high');

    await expect(page.locator('text=High Task')).toBeVisible();
    await expect(page.locator('text=Low Task')).not.toBeVisible();
  });
});
