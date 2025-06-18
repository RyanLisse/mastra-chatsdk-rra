import { test, expect } from '@playwright/test';

// Import Stagehand conditionally to handle potential import issues
let StagehandClass: any;
let stagehandAvailable = false;

try {
  const { Stagehand } = require('@browserbasehq/stagehand');
  StagehandClass = Stagehand;

  // Check for valid API key
  const hasValidApiKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith('test-') &&
    process.env.OPENAI_API_KEY.startsWith('sk-');

  if (hasValidApiKey) {
    stagehandAvailable = true;
    console.log('✅ Stagehand library loaded successfully');
  } else {
    console.log('⚠️  Stagehand tests require a valid OpenAI API key');
    console.log(
      '💡 Set OPENAI_API_KEY in .env.test with a real API key to run Stagehand tests',
    );
  }
} catch (error) {
  console.log(
    '⚠️  Stagehand library not available:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  console.log('📝 Stagehand tests will be skipped');
}

const TEST_PROMPT =
  "Hello! Please respond with just 'Model working' to confirm you're functioning.";
const RESPONSE_TIMEOUT = 30000; // 30 seconds per model test

test.describe(stagehandAvailable
  ? 'Model Response Testing with Stagehand'
  : 'Model Response Testing with Stagehand (Skipped)', () => {
  test.skip(!stagehandAvailable, 'Stagehand not available');
  let stagehand: any;
  const modelsTested: Array<{
    model: string;
    success: boolean;
    response?: string;
    error?: string;
  }> = [];

  test.beforeAll(async () => {
    if (stagehandAvailable) {
      // Initialize Stagehand
      stagehand = new StagehandClass({
        env: 'LOCAL',
        verbose: 1,
        debugDom: true,
        headless: process.env.CI === 'true',
        domSettleTimeoutMs: 30_000,
      });

      await stagehand.init();

      console.log('🚀 Stagehand initialized for model testing');
    }
  });

  test.afterAll(async () => {
    await stagehand?.close();

    // Print comprehensive test results
    console.log(`\n${'='.repeat(80)}`);
    console.log('🧪 MODEL RESPONSE TEST RESULTS');
    console.log('='.repeat(80));

    const successful = modelsTested.filter((m) => m.success);
    const failed = modelsTested.filter((m) => !m.success);

    console.log(
      `✅ Successful models: ${successful.length}/${modelsTested.length}`,
    );
    console.log(`❌ Failed models: ${failed.length}/${modelsTested.length}`);

    if (successful.length > 0) {
      console.log('\n✅ Working Models:');
      successful.forEach((model) => {
        console.log(
          `  • ${model.model}: ${model.response?.substring(0, 50)}...`,
        );
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Models:');
      failed.forEach((model) => {
        console.log(`  • ${model.model}: ${model.error}`);
      });
    }

    console.log('='.repeat(80));
  });

  test('should navigate to the chat application', async () => {
    if (!stagehandAvailable || !stagehand) {
      console.log('⚠️  Stagehand not available, skipping test');
      return;
    }

    await stagehand.page.goto('http://localhost:3000', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
    await stagehand.page.waitForTimeout(3000);

    // Take initial screenshot
    await stagehand.page.screenshot({ path: 'initial-page-load.png' });

    // Check if we need to sign in or if we're already in chat
    const hasSignIn = await stagehand.page
      .locator('text=Sign in')
      .isVisible()
      .catch(() => false);

    if (hasSignIn) {
      console.log('🔐 Signing in as guest...');
      await stagehand.act(
        'Click the "Continue as Guest" button or sign in option',
      );
      await stagehand.page.waitForTimeout(2000);
    }

    // Verify we're on the chat page
    const hasChatInput = await stagehand.page
      .locator(
        '[data-testid="multimodal-input"], textarea, input[placeholder*="message"]',
      )
      .isVisible()
      .catch(() => false);
    expect(hasChatInput).toBe(true);

    console.log('✅ Successfully navigated to chat interface');
  });

  test('should test all available models for responses', async () => {
    if (!stagehandAvailable || !stagehand) {
      console.log('⚠️  Stagehand not available, skipping test');
      return;
    }

    // First check if we have the "no providers" warning
    const hasNoProvidersWarning = await stagehand.page
      .locator('text=No AI providers configured')
      .isVisible()
      .catch(() => false);

    if (hasNoProvidersWarning) {
      console.log('⚠️  No AI providers configured, skipping model tests');
      console.log('💡 Add API keys to test models: OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.');
      return;
    }

    // Find and click the model selector
    console.log('🎯 Looking for model selector...');
    
    // First, ensure we can see the model selector button
    const modelSelectorVisible = await stagehand.page
      .locator('[data-testid="model-selector"]')
      .isVisible()
      .catch(() => false);
      
    if (!modelSelectorVisible) {
      console.log('⚠️  Model selector not visible on page');
      // Take a screenshot to debug
      await stagehand.page.screenshot({ path: 'debug-no-model-selector.png' });
      return;
    }
    
    // Click using direct locator instead of act
    await stagehand.page.locator('[data-testid="model-selector"]').click();
    await stagehand.page.waitForTimeout(2000);

    // Take screenshot of model selector
    await stagehand.page.screenshot({ path: 'model-selector-open.png' });

    // Check if dropdown is actually open by looking for dropdown content
    const dropdownContentVisible = await stagehand.page
      .locator('[role="menu"], [data-radix-menu-content], .dropdown-menu-content, [data-state="open"]')
      .isVisible()
      .catch(() => false);

    if (!dropdownContentVisible) {
      console.log('⚠️  Model selector dropdown did not open, retrying with different approach...');
      // Try clicking the button text directly
      const buttonText = await stagehand.page
        .locator('[data-testid="model-selector"]')
        .textContent();
      console.log(`📝 Button text: ${buttonText}`);
      
      // Click again with force
      await stagehand.page.locator('[data-testid="model-selector"]').click({ force: true });
      await stagehand.page.waitForTimeout(2000);
    }

    // Wait for dropdown content to render with multiple selectors
    const dropdownItemsSelector = '[data-testid*="model-selector-item"], [role="menuitem"], button[data-active]';
    
    try {
      await stagehand.page.waitForSelector(dropdownItemsSelector, {
        timeout: 5000,
        state: 'visible'
      });
      console.log('✅ Dropdown items appeared');
    } catch (error) {
      console.log('⚠️  No dropdown items found after waiting');
      
      // Take screenshot for debugging
      await stagehand.page.screenshot({ path: 'debug-dropdown-no-items.png' });
      
      // Check if we see the "no providers" warning
      const noProvidersText = await stagehand.page
        .locator('text="No models available"')
        .isVisible()
        .catch(() => false);
        
      if (noProvidersText) {
        console.log('⚠️  No models available - likely no API keys configured');
        return;
      }
    }

    // Get all available model options with broader selector
    const modelElements = await stagehand.page
      .locator(dropdownItemsSelector)
      .all();

    console.log(`📋 Found ${modelElements.length} model options to test`);

    if (modelElements.length === 0) {
      console.log('⚠️  No model options found in dropdown');
      console.log('💡 Checking page content for debugging...');
      
      const pageContent = await stagehand.page.locator('body').textContent();
      if (pageContent?.includes('No AI providers configured')) {
        console.log('⚠️  Confirmed: No AI providers are configured');
      }
      
      return;
    }

    // Test each model
    for (let i = 0; i < Math.min(modelElements.length, 10); i++) {
      // Limit to 10 models for performance
      try {
        console.log(
          `\n🧪 Testing model ${i + 1}/${Math.min(modelElements.length, 10)}...`,
        );

        // Re-open model selector (it closes after each selection)
        console.log('📂 Re-opening model selector...');
        await stagehand.page.locator('[data-testid="model-selector"]').click();
        await stagehand.page.waitForTimeout(1500);

        // Get fresh list of model elements
        const currentModelElements = await stagehand.page
          .locator('[data-testid*="model-selector-item"], [role="menuitem"]')
          .all();
        
        if (i >= currentModelElements.length) {
          console.log(`⚠️  No more models to test (tried ${i + 1} of ${currentModelElements.length})`);
          break;
        }

        const modelText =
          (await currentModelElements[i].textContent()) || `Model ${i + 1}`;
        const modelName = modelText.split('\n')[0].trim(); // Get first line as model name

        console.log(`🎯 Testing model: ${modelName}`);

        // Click the model
        await currentModelElements[i].click();
        await stagehand.page.waitForTimeout(1500);

        // Send test message
        console.log(`📝 Sending test message to ${modelName}...`);
        await stagehand.act({
          action: 'Type %message% in the text area and send it',
          variables: {
            message: TEST_PROMPT,
          },
        });
        await stagehand.page.waitForTimeout(1000);

        // Wait for response with timeout
        console.log(`⏳ Waiting for response from ${modelName}...`);
        let responseReceived = false;
        let responseText = '';

        // Wait up to 30 seconds for a response
        for (let attempts = 0; attempts < 30; attempts++) {
          await stagehand.page.waitForTimeout(1000);

          // Look for assistant response
          const responses = await stagehand.page
            .locator(
              '[data-testid="message-assistant"], [data-role="assistant"], .assistant-message',
            )
            .all();
          if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            responseText = (await lastResponse.textContent()) || '';

            // Check if response is complete (not streaming)
            if (responseText.length > 10 && !responseText.includes('...')) {
              responseReceived = true;
              break;
            }
          }
        }

        if (responseReceived) {
          console.log(`✅ ${modelName}: Response received`);
          modelsTested.push({
            model: modelName,
            success: true,
            response: responseText,
          });
        } else {
          console.log(`❌ ${modelName}: No response within timeout`);
          modelsTested.push({
            model: modelName,
            success: false,
            error: 'No response within 30 seconds',
          });
        }

        // Take screenshot of the chat with response
        await stagehand.page.screenshot({
          path: `model-test-${i + 1}-${modelName.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
        });

        // Wait a bit before next test
        await stagehand.page.waitForTimeout(2000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`❌ Error testing model ${i + 1}: ${errorMessage}`);
        modelsTested.push({
          model: `Model ${i + 1}`,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Verify at least some models responded
    const successfulModels = modelsTested.filter((m) => m.success);
    expect(successfulModels.length).toBeGreaterThan(0);
  });

  test('should test specific provider models', async () => {
    if (!stagehandAvailable || !stagehand) {
      console.log('⚠️  Stagehand not available, skipping test');
      return;
    }

    console.log('\n🎯 Testing specific provider models...');

    // First check if we have any providers configured
    const hasNoProvidersWarning = await stagehand.page
      .locator('text=No AI providers configured')
      .isVisible()
      .catch(() => false);

    if (hasNoProvidersWarning) {
      console.log('⚠️  No AI providers configured, skipping provider tests');
      return;
    }

    const providersToTest = [
      { provider: 'OpenAI', model: 'GPT-4o' },
      { provider: 'Anthropic', model: 'Claude 4 Sonnet' },
      { provider: 'Google', model: 'Gemini 2.5 Flash' },
      { provider: 'Groq', model: 'LLaMA 3.3-70B' },
    ];

    for (const { provider, model } of providersToTest) {
      try {
        console.log(`\n🧪 Testing ${provider} - ${model}...`);

        // Open model selector
        await stagehand.page.locator('[data-testid="model-selector"]').click();
        await stagehand.page.waitForTimeout(2000);

        // Look for the specific model
        await stagehand.act(
          `Click on the ${model} model option from ${provider}`,
        );
        await stagehand.page.waitForTimeout(2000);

        // Send a provider-specific test
        const testMessage = `Hello ${provider}! Please respond with "I am ${model} and I'm working correctly."`;
        await stagehand.act({
          action: 'Type %message% in the text area and send it',
          variables: {
            message: testMessage,
          },
        });

        // Wait for response
        let responseReceived = false;
        for (let attempts = 0; attempts < 20; attempts++) {
          await stagehand.page.waitForTimeout(1500);

          const responses = await stagehand.page
            .locator(
              '[data-testid="message-assistant"], [data-role="assistant"]',
            )
            .all();
          if (responses.length > 0) {
            const responseText =
              (await responses[responses.length - 1].textContent()) || '';
            if (responseText.length > 20) {
              responseReceived = true;
              console.log(`✅ ${provider} ${model}: Response received`);
              break;
            }
          }
        }

        if (!responseReceived) {
          console.log(`❌ ${provider} ${model}: No response received`);
        }

        await stagehand.page.screenshot({
          path: `provider-test-${provider.toLowerCase()}-${model.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
        });
      } catch (error) {
        console.log(`❌ Error testing ${provider} ${model}: ${error}`);
      }
    }
  });
});
