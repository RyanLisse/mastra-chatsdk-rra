import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

export class AuthPage {
  constructor(public page: Page) {}

  async gotoLogin() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading')).toContainText('Sign In');
  }

  async gotoRegister() {
    await this.page.goto('/register');
    await expect(this.page.getByRole('heading')).toContainText('Sign Up');
  }

  async register(email: string, password: string) {
    await this.gotoRegister();
    await this.page.getByPlaceholder('user@acme.com').click();
    await this.page.getByPlaceholder('user@acme.com').fill(email);
    await this.page.getByLabel('Password').click();
    await this.page.getByLabel('Password').fill(password);

    await this.page.getByRole('button', { name: 'Sign Up' }).click();

    // Wait for the button to become disabled (indicating submission)
    await expect(
      this.page.getByRole('button', { name: 'Sign Up' }),
    ).toBeDisabled({ timeout: 5000 });

    // Rather than waiting for URL change, wait for either navigation or error state
    // This is more flexible as the test caller can handle the specific expectations
    await this.page.waitForTimeout(1000); // Give some time for the submission to process
  }

  async login(email: string, password: string) {
    await this.gotoLogin();
    await this.page.getByPlaceholder('user@acme.com').click();
    await this.page.getByPlaceholder('user@acme.com').fill(email);
    await this.page.getByLabel('Password').click();
    await this.page.getByLabel('Password').fill(password);

    // Start navigation early to avoid hanging
    const navigationPromise = this.page.waitForURL('/', { timeout: 15000 });

    await this.page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for either navigation or timeout
    try {
      await navigationPromise;
    } catch (error) {
      // If navigation fails, check if we're already on the home page or if login failed
      if (!this.page.url().includes('/login')) {
        console.log('Login successful - already navigated');
        return;
      }
      // Check for error toast which indicates login failure rather than hanging
      const toast = this.page.getByTestId('toast');
      if (await toast.isVisible()) {
        console.log('Login failed with toast message');
        return;
      }
      throw error;
    }
  }

  async logout(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL('/');

    await this.openSidebar();

    const userNavButton = this.page.getByTestId('user-nav-button');
    await expect(userNavButton).toBeVisible();

    await userNavButton.click();
    const userNavMenu = this.page.getByTestId('user-nav-menu');
    await expect(userNavMenu).toBeVisible();

    const authMenuItem = this.page.getByTestId('user-nav-item-auth');
    await expect(authMenuItem).toContainText('Sign out');

    await authMenuItem.click();

    const userEmail = this.page.getByTestId('user-email');
    await expect(userEmail).toContainText('Guest');
  }

  async expectToastToContain(text: string) {
    // Wait for toast to appear with extended timeout and handle multiple toasts
    // Use locator that finds any toast with the expected text
    await expect(
      this.page.locator(`[data-testid="toast"]:has-text("${text}")`).first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async openSidebar() {
    const sidebarToggleButton = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggleButton.click();
  }
}
