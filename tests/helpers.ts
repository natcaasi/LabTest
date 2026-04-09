import { Page } from '@playwright/test';

export async function registerUser(page: Page, username: string) {
  await page.goto('/login');
  await page.fill('input[placeholder*="Username"]', username);

  // Start registration
  await page.click('text=No account');

  // Get registration options
  const registerButton = page.locator('button:has-text("Register")').first();
  await registerButton.click();

  // Wait for redirect to home
  await page.waitForURL('/');
}

export async function loginUser(page: Page, username: string) {
  await page.goto('/login');
  await page.fill('input[placeholder*="Username"]', username);

  const loginButton = page.locator('button:has-text("Login")').first();
  await loginButton.click();

  await page.waitForURL('/');
}

export async function createTodo(
  page: Page,
  title: string,
  options?: {
    priority?: 'high' | 'medium' | 'low';
    description?: string;
  }
) {
  await page.fill('input[placeholder*="What needs"]', title);

  if (options?.priority) {
    await page.selectOption('select', options.priority);
  }

  if (options?.description) {
    await page.fill('textarea', options.description);
  }

  await page.click('button:has-text("Create Todo")');
  await page.waitForTimeout(500);
}

export async function deleteTodo(page: Page, title: string) {
  const todoElement = page.locator(`text=${title}`).first();
  await todoElement.hover();
  const deleteButton = todoElement.locator('..').locator('button:has-text("Delete")');
  await deleteButton.click();
  await page.click('button:has-text("OK")').catch(() => {});
  await page.waitForTimeout(300);
}

export async function toggleTodo(page: Page, title: string) {
  const todoElement = page.locator(`text=${title}`).first();
  const checkbox = todoElement.locator('input[type="checkbox"]');
  await checkbox.click();
  await page.waitForTimeout(300);
}

export async function logout(page: Page) {
  await page.click('button:has-text("Logout")');
  await page.waitForURL('/login');
}

export async function openTagManager(page: Page) {
  await page.click('button:has-text("Tags")');
  await page.waitForTimeout(300);
}

export async function openTemplateManager(page: Page) {
  await page.click('button:has-text("Templates")');
  await page.waitForTimeout(300);
}

export async function navigateToCalendar(page: Page) {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle');
}
