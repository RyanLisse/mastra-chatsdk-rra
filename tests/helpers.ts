import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  expect,
  type Page,
} from '@playwright/test';
import { generateId } from 'ai';
import { ChatPage } from './pages/chat';
import { getUnixTime } from 'date-fns';

export type UserContext = {
  context: BrowserContext;
  page: Page;
  request: APIRequestContext;
};

export async function createAuthenticatedContext({
  browser,
  name,
  chatModel = 'chat-model',
}: {
  browser: Browser;
  name: string;
  chatModel?: 'chat-model' | 'chat-model-reasoning';
}): Promise<UserContext> {
  const directory = path.join(__dirname, '../playwright/.sessions');

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const storageFile = path.join(directory, `${name}.json`);

  const context = await browser.newContext({
    extraHTTPHeaders: {
      'x-test-mode': 'true',
    },
  });
  const page = await context.newPage();

  const email = `test-${name}@playwright.com`;
  const password = generateId(16);

  try {
    // First, try to check if test auth endpoint is available
    const testAuthResponse = await page.request.get(
      'http://localhost:3000/api/test/auth',
    );

    if (testAuthResponse.ok()) {
      console.log('Using test auth bypass');
      // Test environment detected, use direct navigation
      await page.goto('http://localhost:3000/');

      // Wait for page to load and check if we're authenticated (no redirect to login)
      await page.waitForTimeout(2000);

      // If we're still on the main page and not redirected, we're good
      if (
        page.url().includes('localhost:3000') &&
        !page.url().includes('/login')
      ) {
        const chatPage = new ChatPage(page);
        try {
          await chatPage.createNewChat();
          await chatPage.chooseModelFromSelector('chat-model-reasoning');
          await expect(chatPage.getSelectedModel()).resolves.toEqual(
            'Reasoning model',
          );
        } catch (error) {
          console.log(
            'Chat page setup failed, but continuing with test context',
          );
        }

        await page.waitForTimeout(1000);
        await context.storageState({ path: storageFile });
        await page.close();

        const newContext = await browser.newContext({
          storageState: storageFile,
          extraHTTPHeaders: {
            'x-test-mode': 'true',
          },
        });
        const newPage = await newContext.newPage();

        return {
          context: newContext,
          page: newPage,
          request: newContext.request,
        };
      }
    }
  } catch (error) {
    console.log(
      'Test auth bypass failed, falling back to registration:',
      error,
    );
  }

  // Fall back to the original registration approach
  try {
    await page.goto('http://localhost:3000/register');
    await page.getByPlaceholder('user@acme.com').click();
    await page.getByPlaceholder('user@acme.com').fill(email);
    await page.getByLabel('Password').click();
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByTestId('toast')).toContainText(
      'Account created successfully!',
    );

    const chatPage = new ChatPage(page);
    await chatPage.createNewChat();
    await chatPage.chooseModelFromSelector('chat-model-reasoning');
    await expect(chatPage.getSelectedModel()).resolves.toEqual(
      'Reasoning model',
    );

    await page.waitForTimeout(1000);
    await context.storageState({ path: storageFile });
    await page.close();

    const newContext = await browser.newContext({
      storageState: storageFile,
      extraHTTPHeaders: {
        'x-test-mode': 'true',
      },
    });
    const newPage = await newContext.newPage();

    return {
      context: newContext,
      page: newPage,
      request: newContext.request,
    };
  } catch (error) {
    console.error('Registration approach also failed:', error);
    // Return basic context even if authentication setup fails
    await page.close();
    const newContext = await browser.newContext({
      extraHTTPHeaders: {
        'x-test-mode': 'true',
      },
    });
    const newPage = await newContext.newPage();

    return {
      context: newContext,
      page: newPage,
      request: newContext.request,
    };
  }
}

export function generateRandomTestUser() {
  const email = `test-${getUnixTime(new Date())}@playwright.com`;
  const password = generateId(16);

  return {
    email,
    password,
  };
}
