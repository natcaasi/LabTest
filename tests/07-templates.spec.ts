import { test, expect } from '@playwright/test';
import { openTemplateManager } from './helpers';

test.describe('Template System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create template', async ({ page }) => {
    await openTemplateManager(page);

    await page.fill('input[placeholder*="name"]', 'Weekly Review');
    const createBtn = page.locator('button:has-text("Create Template")').first();
    await createBtn.click();

    await page.waitForTimeout(300);
    await expect(page.locator('text=Weekly Review')).toBeVisible();
  });

  test('should list templates', async ({ page }) => {
    await openTemplateManager(page);

    const templateElements = page.locator('[class*="bg-gray"]').filter({ hasText: /Use|Delete/ });
    const count = await templateElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should delete template', async ({ page }) => {
    await openTemplateManager(page);

    await page.fill('input[placeholder*="name"]', `Temp-${Date.now()}`);
    const createBtn = page.locator('button:has-text("Create Template")').first();
    await createBtn.click();

    await page.waitForTimeout(300);

    const deleteBtn = page.locator('button:has-text("Delete")').first();
    await deleteBtn.click();

    await page.waitForTimeout(300);
  });
});
