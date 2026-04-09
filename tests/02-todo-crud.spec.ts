import { test, expect } from '@playwright/test';
import { createTodo, toggleTodo } from './helpers';

test.describe('Todo CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a todo', async ({ page }) => {
    await createTodo(page, 'Test Todo');
    const todoElement = page.locator('text=Test Todo');
    await expect(todoElement).toBeVisible();
  });

  test('should create todo with priority', async ({ page }) => {
    await page.fill('input[placeholder*="What needs"]', 'High Priority Todo');
    await page.selectOption('select', 'high');
    await page.click('button:has-text("Create Todo")');
    await page.waitForTimeout(500);

    const todoElement = page.locator('text=High Priority Todo');
    await expect(todoElement).toBeVisible();
  });

  test('should toggle todo completion', async ({ page }) => {
    await createTodo(page, 'Completable Todo');
    await toggleTodo(page, 'Completable Todo');
    const todoElement = page.locator('text=Completable Todo');
    const checkbox = todoElement.locator('..').locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
  });

  test('should delete a todo', async ({ page }) => {
    const uniqueTitle = `Delete Test ${Date.now()}`;
    await createTodo(page, uniqueTitle);

    const todoElement = page.locator(`text=${uniqueTitle}`).first();
    await todoElement.hover();
    const deleteBtn = todoElement.locator('..').locator('button:has-text("Delete")');
    await deleteBtn.click();

    await page.waitForTimeout(300);
    await expect(page.locator(`text=${uniqueTitle}`)).not.toBeVisible();
  });
});
