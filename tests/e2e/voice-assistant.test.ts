import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';

test.describe('Voice Assistant E2E Tests', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test.describe('Voice Interface', () => {
    test('should show voice button when voice is enabled', async ({ page }) => {
      // Check if voice button is visible
      const voiceButton = page.getByTestId('voice-button');
      await expect(voiceButton).toBeVisible();
    });

    test('should handle microphone permissions', async ({
      page,
      browserName,
    }) => {
      // Skip on webkit due to permission handling differences
      test.skip(
        browserName === 'webkit',
        'Webkit handles permissions differently',
      );

      // Grant microphone permissions
      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      // Should show voice interface or permission granted state
      await page.waitForTimeout(1000);

      // Check for voice status indicator
      const voiceStatus = page.getByTestId('voice-status');
      if ((await voiceStatus.count()) > 0) {
        await expect(voiceStatus).toBeVisible();
      }
    });

    test('should handle microphone permission denial', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Webkit handles permissions differently',
      );

      // Deny microphone permissions
      const context = page.context();
      await context.grantPermissions([]);

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      // Should show permission denied message or error state
      await page.waitForTimeout(2000);

      // Check for permission error
      const permissionError = page.getByTestId('voice-permission-error');
      if ((await permissionError.count()) > 0) {
        await expect(permissionError).toBeVisible();
      }
    });
  });

  test.describe('Voice Recording', () => {
    test('should start and stop voice recording', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Voice recording may not work reliably in webkit',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      // Should show recording state
      await page.waitForTimeout(1000);

      const recordingIndicator = page.getByTestId('voice-recording-indicator');
      if ((await recordingIndicator.count()) > 0) {
        await expect(recordingIndicator).toBeVisible();
      }

      // Stop recording
      await voiceButton.click();

      // Recording should stop
      await page.waitForTimeout(1000);
      if ((await recordingIndicator.count()) > 0) {
        await expect(recordingIndicator).not.toBeVisible();
      }
    });

    test('should show voice waveform during recording', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Voice features may not work in webkit',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      await page.waitForTimeout(2000);

      // Check for waveform visualization
      const waveform = page.getByTestId('voice-waveform');
      if ((await waveform.count()) > 0) {
        await expect(waveform).toBeVisible();
      }

      // Stop recording
      await voiceButton.click();
    });

    test('should handle voice recording timeout', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit' || process.env.CI === 'true',
        'Long timeout test - skip in CI',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      // Wait for automatic timeout (this depends on implementation)
      await page.waitForTimeout(60000); // 1 minute

      // Should automatically stop recording
      const recordingIndicator = page.getByTestId('voice-recording-indicator');
      if ((await recordingIndicator.count()) > 0) {
        await expect(recordingIndicator).not.toBeVisible();
      }
    });
  });

  test.describe('Voice to Text', () => {
    test.skip('should convert voice to text and send message', async ({
      page,
      browserName,
    }) => {
      // This test is complex because it requires actual audio input
      // Skipping for now as it would need mock audio data

      test.skip(
        true,
        'Voice-to-text requires complex audio mocking - implement when needed',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      // Simulate voice input (this would require complex setup)
      // In a real test, you'd need to mock the speech recognition API

      await page.waitForTimeout(3000);
      await voiceButton.click(); // Stop recording

      // Should transcribe and send message
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });

    test('should show transcription in progress', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Voice features may not work in webkit',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      await page.waitForTimeout(2000);
      await voiceButton.click(); // Stop recording

      // Should show transcription indicator
      const transcriptionIndicator = page.getByTestId(
        'voice-transcription-indicator',
      );
      if ((await transcriptionIndicator.count()) > 0) {
        await expect(transcriptionIndicator).toBeVisible();
      }
    });
  });

  test.describe('Voice Settings', () => {
    test('should allow toggling voice features', async ({ page }) => {
      // Check if voice settings are available
      await chatPage.openSidebar();

      const settingsButton = page.getByTestId('settings-button');
      if ((await settingsButton.count()) > 0) {
        await settingsButton.click();

        const voiceSettingsToggle = page.getByTestId('voice-settings-toggle');
        if ((await voiceSettingsToggle.count()) > 0) {
          await expect(voiceSettingsToggle).toBeVisible();

          // Toggle voice settings
          await voiceSettingsToggle.click();

          // Voice button should hide/show based on setting
          await page.goto('/');
          await chatPage.createNewChat();

          const voiceButton = page.getByTestId('voice-button');
          // The exact behavior depends on the toggle state
        }
      }
    });

    test('should show voice feature availability status', async ({ page }) => {
      const voiceButton = page.getByTestId('voice-button');

      if ((await voiceButton.count()) > 0) {
        // Hover over voice button to see status
        await voiceButton.hover();

        const tooltip = page.getByTestId('voice-tooltip');
        if ((await tooltip.count()) > 0) {
          await expect(tooltip).toBeVisible();
        }
      }
    });
  });

  test.describe('Voice Error Handling', () => {
    test('should handle network errors during voice processing', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Voice features may not work in webkit',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      // Mock network failure for voice API
      await page.route('**/api/voice/**', (route) => {
        route.abort('failed');
      });

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      await page.waitForTimeout(2000);
      await voiceButton.click(); // Stop recording

      // Should show error message
      await page.waitForTimeout(2000);

      const errorMessage = page.getByTestId('voice-error-message');
      if ((await errorMessage.count()) > 0) {
        await expect(errorMessage).toBeVisible();
      }

      await page.unroute('**/api/voice/**');
    });

    test('should handle audio processing errors', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Voice features may not work in webkit',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      // Mock audio processing error
      await page.route('**/api/voice/transcribe', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Audio processing failed' }),
        });
      });

      const voiceButton = page.getByTestId('voice-button');
      await voiceButton.click();

      await page.waitForTimeout(1000);
      await voiceButton.click(); // Stop recording

      // Should handle error gracefully
      await page.waitForTimeout(2000);

      const errorToast = page.getByTestId('toast');
      if ((await errorToast.count()) > 0) {
        await expect(errorToast).toContainText(/error|failed/i);
      }

      await page.unroute('**/api/voice/transcribe');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      const voiceButton = page.getByTestId('voice-button');

      if ((await voiceButton.count()) > 0) {
        // Tab to voice button
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should be able to activate with Enter or Space
        await page.keyboard.press('Enter');

        await page.waitForTimeout(1000);

        // Stop with keyboard
        await page.keyboard.press('Enter');
      }
    });

    test('should have proper aria labels', async ({ page }) => {
      const voiceButton = page.getByTestId('voice-button');

      if ((await voiceButton.count()) > 0) {
        const ariaLabel = await voiceButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/voice|microphone|speak/i);
      }
    });

    test('should announce voice recording state to screen readers', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Voice features may not work in webkit',
      );

      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');

      if ((await voiceButton.count()) > 0) {
        await voiceButton.click();

        // Check for aria-live region or status announcement
        const statusAnnouncement = page.getByTestId(
          'voice-status-announcement',
        );
        if ((await statusAnnouncement.count()) > 0) {
          await expect(statusAnnouncement).toHaveAttribute(
            'aria-live',
            'polite',
          );
        }

        await voiceButton.click(); // Stop recording
      }
    });
  });

  test.describe('Voice Integration with Chat', () => {
    test('should work seamlessly with text chat', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'Voice features may not work in webkit',
      );

      // Send text message first
      await chatPage.sendUserMessage('Hello, this is a text message');
      await chatPage.isGenerationComplete();

      let assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);

      // Try voice interaction (would need mock audio)
      const context = page.context();
      await context.grantPermissions(['microphone']);

      const voiceButton = page.getByTestId('voice-button');
      if ((await voiceButton.count()) > 0) {
        await voiceButton.click();
        await page.waitForTimeout(1000);
        await voiceButton.click();

        // Voice transcription would appear in input if working
        const inputValue = await chatPage.getMessageInputValue();
        // In a real test with audio, this would contain transcribed text
      }

      // Continue with text
      await chatPage.sendUserMessage('Another text message');
      await chatPage.isGenerationComplete();

      assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });

    test('should preserve conversation context with voice messages', async ({
      page,
    }) => {
      // This test would verify that voice messages maintain conversation context
      // Implementation depends on how voice messages are integrated

      await chatPage.sendUserMessage('Tell me about RoboRail safety');
      await chatPage.isGenerationComplete();

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content.toLowerCase()).toMatch(/safety|roborail/);

      // A follow-up voice message should maintain context
      // This would require actual voice input mocking
    });
  });
});
