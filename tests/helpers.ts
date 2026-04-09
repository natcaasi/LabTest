import { type Page } from '@playwright/test';

export class TodoHelper {
  constructor(private page: Page) {}

  async registerAndLogin(username: string = 'testuser') {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    // Try register first
    const usernameInput = this.page.locator('input[placeholder*="Username"]').first();
    await usernameInput.fill(username);
    await this.page.locator('button:has-text("Register")').click();

    // Wait for navigation to home or try login if register fails
    try {
      await this.page.waitForURL('/', { timeout: 10000 });
    } catch {
      // If register fails (user exists), try login
      await this.page.goto('/login');
      await usernameInput.fill(username);
      await this.page.locator('button:has-text("Login")').click();
      await this.page.waitForURL('/', { timeout: 10000 });
    }
  }

  async createTodo(title: string, options?: { priority?: string; dueDate?: string }) {
    await this.page.locator('input[placeholder*="What needs to be done"]').fill(title);
    if (options?.priority) {
      await this.page.locator('form select').first().selectOption(options.priority);
    }
    if (options?.dueDate) {
      await this.page.locator('input[type="datetime-local"]').first().fill(options.dueDate);
    }
    await this.page.locator('button:has-text("Add")').click();
    await this.page.waitForTimeout(500);
  }

  async addSubtask(todoTitle: string, subtaskTitle: string) {
    // Find the todo and expand subtasks
    const todo = this.page.locator(`text=${todoTitle}`).first().locator('..').locator('..');
    await todo.locator('button:has-text("Subtasks")').click();
    await this.page.locator('input[placeholder="Add subtask..."]').last().fill(subtaskTitle);
    await this.page.locator('button:has-text("Add")').last().click();
    await this.page.waitForTimeout(300);
  }

  async createTag(name: string, color?: string) {
    await this.page.locator('button:has-text("Manage Tags")').click();
    await this.page.waitForTimeout(300);
    await this.page.locator('input[placeholder="Tag name"]').fill(name);
    if (color) {
      await this.page.locator('input[type="color"]').first().fill(color);
    }
    await this.page.locator('.fixed button:has-text("Create Tag")').click();
    await this.page.waitForTimeout(300);
    await this.page.locator('.fixed button:has-text("Close")').click();
  }
}
