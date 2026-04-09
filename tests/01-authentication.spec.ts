import { test, expect } from '@playwright/test';

test.describe('Authentication - WebAuthn', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login form with username input', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[placeholder*="Username"]')).toBeVisible();
    await expect(page.locator('button:has-text("Register")')).toBeVisible();
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('should show error for empty username', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button:has-text("Register")').click();
    await expect(page.locator('text=Please enter a username')).toBeVisible();
  });

  test('should protect calendar route', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
  });
});
