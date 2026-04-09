import { test, expect } from '@playwright/test';
import { openTagManager, createTodo } from './helpers';

test.describe('Tag System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create tags', async ({ page }) => {
    await openTagManager(page);

    await page.fill('input[placeholder*="Tag name"]', 'Work');
    const createBtn = page.locator('button:has-text("Create Tag")').first();
    await createBtn.click();

    await page.waitForTimeout(300);
    await expect(page.locator('text=Work')).toBeVisible();
  });

  test('should delete tags', async ({ page }) => {
    await openTagManager(page);

    await page.fill('input[placeholder*="Tag name"]', `Tag-${Date.now()}`);
    const createBtn = page.locator('button:has-text("Create Tag")').first();
    await createBtn.click();

    await page.waitForTimeout(300);

    const deleteBtn = page.locator('button:has-text("Delete")').first();
    await deleteBtn.click();

    await page.waitForTimeout(300);
  });

  test('should assign colors to tags', async ({ page }) => {
    await openTagManager(page);

    const colorInput = page.locator('input[type="color"]');
    await colorInput.fill('#FF0000');

    await page.fill('input[placeholder*="Tag name"]', 'Red Tag');
    const createBtn = page.locator('button:has-text("Create Tag")').first();
    await createBtn.click();

    await page.waitForTimeout(300);
    await expect(page.locator('text=Red Tag')).toBeVisible();
  });
});
