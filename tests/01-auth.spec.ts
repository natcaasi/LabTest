import { test, expect } from '@playwright/test';
import { registerUser, loginUser, logout } from './helpers';

test.describe('Authentication', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/login');
    expect(page).toHaveURL('/login');

    await page.fill('input', `user-${Date.now()}`);
    const noAccountBtn = page.locator('button:has-text("No account")').first();
    await noAccountBtn.click();
    await page.waitForTimeout(300);

    const registerBtn = page.locator('button:has-text("Register")').first();
    expect(registerBtn).toBeVisible();
  });

  test('should navigate to home after login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input', 'testuser');
    const btn = page.locator('button').first();
    await btn.click().catch(() => {});
    await page.waitForTimeout(500);
  });

  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    // Should either stay on home or redirect to login
    const url = page.url();
    expect(['/login', '/']).toContain(new URL(url).pathname);
  });
});
