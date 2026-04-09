import { test, expect } from '@playwright/test';
import { createTodo } from './helpers';

test.describe('Search & Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should search by title', async ({ page }) => {
    await createTodo(page, 'Buy groceries');
    await createTodo(page, 'Call dentist');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('groceries');

    await expect(page.locator('text=Buy groceries')).toBeVisible();
    await expect(page.locator('text=Call dentist')).not.toBeVisible();
  });

  test('should clear search', async ({ page }) => {
    await createTodo(page, 'Todo A');
    await createTodo(page, 'Todo B');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('A');

    await expect(page.locator('text=Todo A')).toBeVisible();

    const clearBtn = page.locator('button:has-text("Clear Filters")');
    await clearBtn.click();

    await page.waitForTimeout(300);
    await expect(page.locator('text=Todo B')).toBeVisible();
  });

  test('should be case insensitive', async ({ page }) => {
    await createTodo(page, 'Finish Project');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('finish');

    await expect(page.locator('text=Finish Project')).toBeVisible();
  });
});
