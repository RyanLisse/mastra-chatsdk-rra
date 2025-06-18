import * as fs from 'node:fs';
import * as path from 'node:path';
import { chatModels } from '../../lib/ai/models';
import { expect, type Page } from '@playwright/test';

export class ChatPage {
  constructor(public page: Page) {}

  public get sendButton() {
    return this.page.getByTestId('send-button');
  }

  public get stopButton() {
    return this.page.getByTestId('stop-button');
  }

  public get multimodalInput() {
    return this.page.getByTestId('multimodal-input');
  }

  public get scrollContainer() {
    return this.page.locator('.overflow-y-scroll');
  }

  public get scrollToBottomButton() {
    return this.page.getByTestId('scroll-to-bottom-button');
  }

  async createNewChat() {
    await this.page.goto('/');
  }

  public getCurrentURL(): string {
    return this.page.url();
  }

  async sendUserMessage(message: string) {
    await this.multimodalInput.click();
    await this.multimodalInput.fill(message);
    await this.sendButton.click();
  }

  async isGenerationComplete() {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/chat'),
    );

    await response.finished();
  }

  async isVoteComplete() {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/vote'),
    );

    await response.finished();
  }

  async hasChatIdInUrl() {
    await expect(this.page).toHaveURL(
      /^http:\/\/localhost:3000\/chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  }

  async sendUserMessageFromSuggestion() {
    await this.page
      .getByRole('button', { name: 'What are the advantages of' })
      .click();
  }

  async isElementVisible(elementId: string) {
    await expect(this.page.getByTestId(elementId)).toBeVisible();
  }

  async isElementNotVisible(elementId: string) {
    await expect(this.page.getByTestId(elementId)).not.toBeVisible();
  }

  async addImageAttachment() {
    this.page.on('filechooser', async (fileChooser) => {
      const filePath = path.join(
        process.cwd(),
        'public',
        'images',
        'mouth of the seine, monet.jpg',
      );
      const imageBuffer = fs.readFileSync(filePath);

      await fileChooser.setFiles({
        name: 'mouth of the seine, monet.jpg',
        mimeType: 'image/jpeg',
        buffer: imageBuffer,
      });
    });

    await this.page.getByTestId('attachments-button').click();
  }

  public async getSelectedModel() {
    const modelId = await this.page.getByTestId('model-selector').innerText();
    return modelId;
  }

  public async chooseModelFromSelector(chatModelId: string) {
    const chatModel = chatModels.find(
      (chatModel) => chatModel.id === chatModelId,
    );

    if (!chatModel) {
      throw new Error(`Model with id ${chatModelId} not found`);
    }

    await this.page.getByTestId('model-selector').click();
    await this.page.getByTestId(`model-selector-item-${chatModelId}`).click();
    expect(await this.getSelectedModel()).toBe(chatModel.name);
  }

  public async getSelectedVisibility() {
    const visibilityId = await this.page
      .getByTestId('visibility-selector')
      .innerText();
    return visibilityId;
  }

  public async chooseVisibilityFromSelector(
    chatVisibility: 'public' | 'private',
  ) {
    await this.page.getByTestId('visibility-selector').click();
    await this.page
      .getByTestId(`visibility-selector-item-${chatVisibility}`)
      .click();
    expect(await this.getSelectedVisibility()).toBe(chatVisibility);
  }

  async getRecentAssistantMessage() {
    const messageElements = await this.page
      .getByTestId('message-assistant')
      .all();

    if (messageElements.length === 0) {
      throw new Error('No assistant messages found');
    }

    const lastMessageElement = messageElements[messageElements.length - 1];

    if (!lastMessageElement) {
      throw new Error('No assistant message element found');
    }

    const content = await lastMessageElement
      .getByTestId('message-content')
      .innerText()
      .catch(() => '');

    const reasoningElement = await lastMessageElement
      .getByTestId('message-reasoning')
      .isVisible()
      .then(async (visible) =>
        visible
          ? await lastMessageElement
              .getByTestId('message-reasoning')
              .innerText()
          : null,
      )
      .catch(() => null);

    return {
      element: lastMessageElement,
      content,
      reasoning: reasoningElement,
      async toggleReasoningVisibility() {
        await lastMessageElement
          .getByTestId('message-reasoning-toggle')
          .click();
      },
      async upvote() {
        await lastMessageElement.getByTestId('message-upvote').click();
      },
      async downvote() {
        await lastMessageElement.getByTestId('message-downvote').click();
      },
    };
  }

  async getRecentUserMessage() {
    const messageElements = await this.page.getByTestId('message-user').all();
    const lastMessageElement = messageElements[messageElements.length - 1];

    if (!lastMessageElement) {
      throw new Error('No user message found');
    }

    const content = await lastMessageElement
      .getByTestId('message-content')
      .innerText()
      .catch(() => '');

    const hasAttachments = await lastMessageElement
      .getByTestId('message-attachments')
      .isVisible()
      .catch(() => false);

    const attachments = hasAttachments
      ? await lastMessageElement.getByTestId('message-attachments').all()
      : [];

    const page = this.page;

    return {
      element: lastMessageElement,
      content,
      attachments,
      async edit(newMessage: string) {
        await page.getByTestId('message-edit-button').click();
        await page.getByTestId('message-editor').fill(newMessage);
        await page.getByTestId('message-editor-send-button').click();
        await expect(
          page.getByTestId('message-editor-send-button'),
        ).not.toBeVisible();
      },
    };
  }

  async expectToastToContain(text: string) {
    await expect(this.page.getByTestId('toast')).toContainText(text);
  }

  async openSideBar() {
    const sidebarToggleButton = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggleButton.click();

    // Wait for sidebar animation to complete
    await this.page.waitForTimeout(300);
  }

  public async isScrolledToBottom(): Promise<boolean> {
    return this.scrollContainer.evaluate(
      (el) => Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 1,
    );
  }

  public async waitForScrollToBottom(timeout = 5_000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await this.isScrolledToBottom()) return;
      await this.page.waitForTimeout(100);
    }

    throw new Error(`Timed out waiting for scroll bottom after ${timeout}ms`);
  }

  public async sendMultipleMessages(
    count: number,
    makeMessage: (i: number) => string,
  ) {
    for (let i = 0; i < count; i++) {
      await this.sendUserMessage(makeMessage(i));
      await this.isGenerationComplete();
    }
  }

  public async scrollToTop(): Promise<void> {
    await this.scrollContainer.evaluate((element) => {
      element.scrollTop = 0;
    });
  }

  // Additional methods for comprehensive testing
  async getAllMessages() {
    const userMessages = await this.page.getByTestId('message-user').all();
    const assistantMessages = await this.page
      .getByTestId('message-assistant')
      .all();

    const allMessages = [];

    for (const msg of userMessages) {
      const content = await msg
        .getByTestId('message-content')
        .innerText()
        .catch(() => '');
      allMessages.push({ role: 'user', content, element: msg });
    }

    for (const msg of assistantMessages) {
      const content = await msg
        .getByTestId('message-content')
        .innerText()
        .catch(() => '');
      allMessages.push({ role: 'assistant', content, element: msg });
    }

    return allMessages;
  }

  async focusMessageInput() {
    await this.multimodalInput.click();
  }

  async clearMessageInput() {
    await this.multimodalInput.fill('');
  }

  async getMessageInputValue() {
    return await this.multimodalInput.inputValue();
  }

  async isAtScrollBottom() {
    return await this.isScrolledToBottom();
  }

  async waitForElementToAppear(testId: string, timeout = 10000) {
    await this.page.waitForSelector(`[data-testid="${testId}"]`, { timeout });
  }

  async waitForElementToDisappear(testId: string, timeout = 10000) {
    await this.page.waitForSelector(`[data-testid="${testId}"]`, {
      state: 'detached',
      timeout,
    });
  }

  async getToastMessage() {
    return await this.page.getByTestId('toast').innerText();
  }

  async uploadFile(filePath: string, mimeType: string, buffer: Buffer) {
    this.page.on('filechooser', async (fileChooser) => {
      await fileChooser.setFiles({
        name: path.basename(filePath),
        mimeType: mimeType,
        buffer: buffer,
      });
    });

    await this.page.getByTestId('attachments-button').click();
  }

  async openSidebar() {
    const sidebarToggle = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggle.click();

    // Wait for sidebar animation to complete
    await this.page.waitForTimeout(300);
  }

  async closeSidebar() {
    // Click outside sidebar or on close button if available
    await this.page.click('main'); // Click on main content area
  }

  async ensureSidebarIsVisible() {
    // Click toggle to open sidebar
    const sidebarToggle = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggle.click();

    // Wait for sidebar animation to complete
    await this.page.waitForTimeout(300);

    // Wait for the session to load - the loading state should disappear
    // and user-nav-button should appear
    const userNavButton = this.page.getByTestId('user-nav-button');
    await expect(userNavButton).toBeVisible({ timeout: 10000 });

    // Now check if user-email is visible
    const userEmail = this.page.getByTestId('user-email');
    await expect(userEmail).toBeVisible({ timeout: 5000 });
  }

  async setSidebarOpenState(open = true) {
    // Set sidebar cookie to ensure consistent state
    await this.page.context().addCookies([
      {
        name: 'sidebar:state',
        value: open ? 'true' : 'false',
        domain: 'localhost',
        path: '/',
      },
    ]);
  }
}
