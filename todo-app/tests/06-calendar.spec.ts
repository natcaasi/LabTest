import { test, expect } from '@playwright/test';
import { navigateToCalendar } from './helpers';

test.describe('Calendar View', () => {
  test('should load calendar page', async ({ page }) => {
    await navigateToCalendar(page);
    await expect(page).toHaveURL('/calendar');
    await expect(page.locator('text=Calendar')).toBeVisible();
  });

  test('should have month navigation', async ({ page }) => {
    await navigateToCalendar(page);

    const prevBtn = page.locator('button:has-text("Previous")');
    const nextBtn = page.locator('button:has-text("Next")');
    const todayBtn = page.locator('button:has-text("Today")');

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    await expect(todayBtn).toBeVisible();
  });

  test('should navigate months', async ({ page }) => {
    await navigateToCalendar(page);

    const monthDisplay = page.locator('h2');
    const initialMonth = await monthDisplay.textContent();

    await page.click('button:has-text("Next")');
    await page.waitForTimeout(300);

    const nextMonth = await monthDisplay.textContent();
    expect(initialMonth).not.toEqual(nextMonth);
  });

  test('should go to today', async ({ page }) => {
    await navigateToCalendar(page);

    await page.click('button:has-text("Next")');
    await page.waitForTimeout(300);

    await page.click('button:has-text("Today")');
    await page.waitForTimeout(300);

    const monthDisplay = page.locator('h2');
    const month = await monthDisplay.textContent();
    expect(month).toBeTruthy();
  });
});
