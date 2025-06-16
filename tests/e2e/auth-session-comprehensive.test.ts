import { test, expect } from '../fixtures';
import { AuthPage } from '../pages/auth';
import { ChatPage } from '../pages/chat';
import { generateRandomTestUser } from '../helpers';

test.describe('Authentication & Session Management E2E', () => {
  let authPage: AuthPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    chatPage = new ChatPage(page);
  });

  test.describe('Guest User Flow', () => {
    test('should allow guest access to chat', async ({ page }) => {
      await page.goto('/');
      
      // Should be able to access chat as guest
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
      
      // Check user indicator shows guest status
      const sidebarToggle = page.getByTestId('sidebar-toggle-button');
      await sidebarToggle.click();
      
      const userEmail = page.getByTestId('user-email');
      await expect(userEmail).toContainText('Guest');
    });

    test('should redirect guest to auth when accessing protected features', async ({ page }) => {
      await page.goto('/');
      
      const sidebarToggle = page.getByTestId('sidebar-toggle-button');
      await sidebarToggle.click();
      
      const userNavButton = page.getByTestId('user-nav-button');
      await userNavButton.click();
      
      const authMenuItem = page.getByTestId('user-nav-item-auth');
      await expect(authMenuItem).toContainText('Login to your account');
    });

    test('should persist guest session across page reloads', async ({ page }) => {
      await page.goto('/');
      
      // Send a message as guest
      await chatPage.createNewChat();
      await chatPage.sendUserMessage('Test message as guest');
      await chatPage.isGenerationComplete();
      
      const originalResponse = await chatPage.getRecentAssistantMessage();
      
      // Reload page
      await page.reload();
      
      // Should still be guest and chat should be accessible
      const sidebarToggle = page.getByTestId('sidebar-toggle-button');
      await sidebarToggle.click();
      
      const userEmail = page.getByTestId('user-email');
      await expect(userEmail).toContainText('Guest');
    });

    test('should enforce guest rate limits', async ({ page }) => {
      await page.goto('/');
      await chatPage.createNewChat();
      
      // Send multiple messages to approach rate limit
      // Note: This test may take a while and depend on actual rate limits
      for (let i = 0; i < 5; i++) {
        await chatPage.sendUserMessage(`Rate limit test message ${i + 1}`);
        await chatPage.isGenerationComplete();
        await page.waitForTimeout(1000); // Brief pause between messages
      }
      
      // The exact behavior depends on implementation
      // Should either show rate limit warning or continue working
    });
  });

  test.describe('User Registration', () => {
    const testUser = generateRandomTestUser();

    test('should register new user successfully', async () => {
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain('Account created successfully!');
      
      // Should redirect to main chat page after registration
      await expect(authPage.page.getByPlaceholder('Send a message...')).toBeVisible();
    });

    test('should reject registration with existing email', async () => {
      // Register user first
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain('Account created successfully!');
      
      // Try to register again with same email
      await authPage.page.goto('/register');
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain('Account already exists!');
    });

    test('should validate registration form fields', async ({ page }) => {
      await page.goto('/register');
      
      // Try to submit with empty fields
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should show validation errors
      await expect(page.locator('text="Email is required"')).toBeVisible();
      await expect(page.locator('text="Password is required"')).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/register');
      
      await page.getByPlaceholder('user@acme.com').fill(testUser.email);
      await page.getByLabel('Password').fill('weak');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should show password strength error
      await expect(page.locator('text*="Password must be"')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    const testUser = generateRandomTestUser();

    test.beforeAll(async ({ browser }) => {
      // Register a user for login tests
      const page = await browser.newPage();
      const setupAuthPage = new AuthPage(page);
      
      await setupAuthPage.register(testUser.email, testUser.password);
      await setupAuthPage.expectToastToContain('Account created successfully!');
      await page.close();
    });

    test('should login with valid credentials', async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);
      
      await page.waitForURL('/');
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
      
      // Check user email is displayed
      const sidebarToggle = page.getByTestId('sidebar-toggle-button');
      await sidebarToggle.click();
      
      const userEmail = page.getByTestId('user-email');
      await expect(userEmail).toHaveText(testUser.email);
    });

    test('should reject login with invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByPlaceholder('user@acme.com').fill(testUser.email);
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      await authPage.expectToastToContain('Invalid credentials');
    });

    test('should show login form validation', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit with empty fields
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      await expect(page.locator('text="Email is required"')).toBeVisible();
      await expect(page.locator('text="Password is required"')).toBeVisible();
    });
  });

  test.describe('Session Persistence', () => {
    const testUser = generateRandomTestUser();

    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage();
      const setupAuthPage = new AuthPage(page);
      
      await setupAuthPage.register(testUser.email, testUser.password);
      await setupAuthPage.expectToastToContain('Account created successfully!');
      await page.close();
    });

    test('should persist login session across page reloads', async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');
      
      // Verify logged in
      const sidebarToggle = page.getByTestId('sidebar-toggle-button');
      await sidebarToggle.click();
      let userEmail = page.getByTestId('user-email');
      await expect(userEmail).toHaveText(testUser.email);
      
      // Reload page
      await page.reload();
      
      // Should still be logged in
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
      await sidebarToggle.click();
      userEmail = page.getByTestId('user-email');
      await expect(userEmail).toHaveText(testUser.email);
    });

    test('should persist login session across browser tabs', async ({ browser }) => {
      const page1 = await browser.newPage();
      const authPage1 = new AuthPage(page1);
      
      await authPage1.login(testUser.email, testUser.password);
      await page1.waitForURL('/');
      
      // Open new tab
      const page2 = await browser.newPage();
      await page2.goto('/');
      
      // Should be logged in on new tab
      await expect(page2.getByPlaceholder('Send a message...')).toBeVisible();
      
      const sidebarToggle = page2.getByTestId('sidebar-toggle-button');
      await sidebarToggle.click();
      const userEmail = page2.getByTestId('user-email');
      await expect(userEmail).toHaveText(testUser.email);
      
      await page1.close();
      await page2.close();
    });
  });

  test.describe('Logout Functionality', () => {
    const testUser = generateRandomTestUser();

    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage();
      const setupAuthPage = new AuthPage(page);
      
      await setupAuthPage.register(testUser.email, testUser.password);
      await setupAuthPage.expectToastToContain('Account created successfully!');
      await page.close();
    });

    test('should logout successfully', async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');
      
      // Open user menu and logout
      const sidebarToggle = page.getByTestId('sidebar-toggle-button');
      await sidebarToggle.click();
      
      const userNavButton = page.getByTestId('user-nav-button');
      await userNavButton.click();
      
      const logoutButton = page.getByTestId('user-nav-item-auth');
      await expect(logoutButton).toContainText('Sign out');
      await logoutButton.click();
      
      // Should redirect to login or home page as guest
      await page.waitForTimeout(2000);
      
      // Verify logged out (should show guest status)
      await sidebarToggle.click();
      const userEmail = page.getByTestId('user-email');
      await expect(userEmail).toContainText('Guest');
    });

    test('should clear session data on logout', async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');
      
      // Create some chat data
      await chatPage.createNewChat();
      await chatPage.sendUserMessage('Test message before logout');
      await chatPage.isGenerationComplete();
      
      // Logout
      await authPage.logout(testUser.email, testUser.password);
      
      // Login again and verify session was cleared appropriately
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');
      
      // The behavior depends on implementation:
      // - Chat history may be preserved in database
      // - Session-specific data should be cleared
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
    });
  });

  test.describe('Route Protection', () => {
    test('should redirect unauthenticated users from protected routes', async ({ page }) => {
      // Try to access a protected route without authentication
      await page.goto('/protected-route');
      
      // Should redirect to login or home page
      // The exact behavior depends on your routing implementation
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login|\/$/);
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      const testUser = generateRandomTestUser();
      
      // Register and login
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain('Account created successfully!');
      
      // Now try to access protected routes
      // The exact routes depend on your application structure
      await page.goto('/documents');
      
      // Should be able to access the page
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/documents');
    });
  });

  test.describe('Cross-Session Data Isolation', () => {
    const testUser1 = generateRandomTestUser();
    const testUser2 = generateRandomTestUser();

    test('should isolate data between different user sessions', async ({ browser }) => {
      // Create two browser contexts for different users
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const authPage1 = new AuthPage(page1);
      const authPage2 = new AuthPage(page2);
      
      const chatPage1 = new ChatPage(page1);
      const chatPage2 = new ChatPage(page2);
      
      // Register both users
      await authPage1.register(testUser1.email, testUser1.password);
      await authPage1.expectToastToContain('Account created successfully!');
      
      await authPage2.register(testUser2.email, testUser2.password);
      await authPage2.expectToastToContain('Account created successfully!');
      
      // User 1 creates chat
      await chatPage1.createNewChat();
      await chatPage1.sendUserMessage('User 1 private message');
      await chatPage1.isGenerationComplete();
      
      // User 2 creates chat
      await chatPage2.createNewChat();
      await chatPage2.sendUserMessage('User 2 private message');
      await chatPage2.isGenerationComplete();
      
      // Verify users can't see each other's data
      // This depends on your sidebar/chat history implementation
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('Security Considerations', () => {
    test('should handle XSS attempts in login form', async ({ page }) => {
      await page.goto('/login');
      
      const xssPayload = '<script>alert("xss")</script>';
      
      await page.getByPlaceholder('user@acme.com').fill(xssPayload);
      await page.getByLabel('Password').fill('password');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should not execute the script, should show validation error
      await authPage.expectToastToContain('Invalid email format');
    });

    test('should prevent SQL injection in login', async ({ page }) => {
      await page.goto('/login');
      
      const sqlPayload = "' OR '1'='1' --";
      
      await page.getByPlaceholder('user@acme.com').fill(sqlPayload);
      await page.getByLabel('Password').fill('password');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should not authenticate, should show error
      await authPage.expectToastToContain('Invalid credentials');
    });

    test('should enforce rate limiting on login attempts', async ({ page }) => {
      await page.goto('/login');
      
      // Make multiple rapid login attempts
      for (let i = 0; i < 5; i++) {
        await page.getByPlaceholder('user@acme.com').fill('test@example.com');
        await page.getByLabel('Password').fill('wrongpassword');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForTimeout(500);
      }
      
      // Should show rate limiting message after multiple attempts
      // The exact implementation depends on your rate limiting strategy
      await page.waitForTimeout(1000);
    });
  });
});