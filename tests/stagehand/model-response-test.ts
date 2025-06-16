import { Stagehand } from '@stagehand/sdk';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

const TEST_PROMPT = "Hello! Please respond with just 'Model working' to confirm you're functioning.";
const RESPONSE_TIMEOUT = 30000; // 30 seconds per model test

describe('Model Response Testing with Stagehand', () => {
  let stagehand: Stagehand;
  let modelsTested: Array<{ model: string; success: boolean; response?: string; error?: string }> = [];

  beforeAll(async () => {
    // Initialize Stagehand
    stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      debugDom: true,
    });

    await stagehand.init();
    console.log('🚀 Stagehand initialized for model testing');
  });

  afterAll(async () => {
    await stagehand?.close();
    
    // Print comprehensive test results
    console.log('\n' + '='.repeat(80));
    console.log('🧪 MODEL RESPONSE TEST RESULTS');
    console.log('='.repeat(80));
    
    const successful = modelsTested.filter(m => m.success);
    const failed = modelsTested.filter(m => !m.success);
    
    console.log(`✅ Successful models: ${successful.length}/${modelsTested.length}`);
    console.log(`❌ Failed models: ${failed.length}/${modelsTested.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ Working Models:');
      successful.forEach(model => {
        console.log(`  • ${model.model}: ${model.response?.substring(0, 50)}...`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Models:');
      failed.forEach(model => {
        console.log(`  • ${model.model}: ${model.error}`);
      });
    }
    
    console.log('='.repeat(80));
  });

  it('should navigate to the chat application', async () => {
    await stagehand.page.goto('http://localhost:3000');
    await stagehand.page.waitForTimeout(3000);
    
    // Take initial screenshot
    await stagehand.screenshot({ name: 'initial-page-load' });
    
    // Check if we need to sign in or if we're already in chat
    const hasSignIn = await stagehand.page.locator('text=Sign in').isVisible().catch(() => false);
    
    if (hasSignIn) {
      console.log('🔐 Signing in as guest...');
      await stagehand.act({ action: 'Click the "Continue as Guest" button or sign in option' });
      await stagehand.page.waitForTimeout(2000);
    }
    
    // Verify we're on the chat page
    const hasChatInput = await stagehand.page.locator('[data-testid="chat-input"], textarea, input[placeholder*="message"]').isVisible().catch(() => false);
    expect(hasChatInput).toBe(true);
    
    console.log('✅ Successfully navigated to chat interface');
  }, { timeout: 60000 });

  it('should test all available models for responses', async () => {
    // Find and click the model selector
    console.log('🎯 Looking for model selector...');
    await stagehand.act({ action: 'Click the model selector button or dropdown' });
    await stagehand.page.waitForTimeout(2000);
    
    // Take screenshot of model selector
    await stagehand.screenshot({ name: 'model-selector-open' });
    
    // Get all available model options
    const modelElements = await stagehand.page.locator('[data-testid*="model-selector-item"], .model-option, [role="menuitem"]').all();
    
    if (modelElements.length === 0) {
      // Alternative approach - look for dropdown items
      const dropdownItems = await stagehand.page.locator('div[role="menuitem"], button[data-testid*="model"]').all();
      console.log(`📋 Found ${dropdownItems.length} model options via alternative selector`);
    }
    
    console.log(`📋 Found ${modelElements.length} model options to test`);
    
    // Test each model
    for (let i = 0; i < Math.min(modelElements.length, 10); i++) { // Limit to 10 models for performance
      try {
        console.log(`\n🧪 Testing model ${i + 1}/${Math.min(modelElements.length, 10)}...`);
        
        // Re-open model selector (it might close after each selection)
        const selectorVisible = await stagehand.page.locator('[data-testid="model-selector"]').isVisible().catch(() => false);
        if (!selectorVisible) {
          await stagehand.act({ action: 'Click the model selector button to open the dropdown' });
          await stagehand.page.waitForTimeout(1000);
        }
        
        // Get model name before clicking
        const modelElements = await stagehand.page.locator('[data-testid*="model-selector-item"]').all();
        if (i >= modelElements.length) break;
        
        const modelText = await modelElements[i].textContent() || `Model ${i + 1}`;
        const modelName = modelText.split('\n')[0].trim(); // Get first line as model name
        
        console.log(`🎯 Testing model: ${modelName}`);
        
        // Click the model
        await modelElements[i].click();
        await stagehand.page.waitForTimeout(1500);
        
        // Send test message
        console.log(`📝 Sending test message to ${modelName}...`);
        await stagehand.act({ 
          action: `Type "${TEST_PROMPT}" in the chat input field` 
        });
        await stagehand.page.waitForTimeout(1000);
        
        // Send the message
        await stagehand.act({ action: 'Press Enter or click the send button to send the message' });
        
        // Wait for response with timeout
        console.log(`⏳ Waiting for response from ${modelName}...`);
        let responseReceived = false;
        let responseText = '';
        
        // Wait up to 30 seconds for a response
        for (let attempts = 0; attempts < 30; attempts++) {
          await stagehand.page.waitForTimeout(1000);
          
          // Look for assistant response
          const responses = await stagehand.page.locator('.message, [data-role="assistant"], .assistant-message').all();
          if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            responseText = await lastResponse.textContent() || '';
            
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
            response: responseText
          });
        } else {
          console.log(`❌ ${modelName}: No response within timeout`);
          modelsTested.push({
            model: modelName,
            success: false,
            error: 'No response within 30 seconds'
          });
        }
        
        // Take screenshot of the chat with response
        await stagehand.screenshot({ name: `model-test-${i + 1}-${modelName.replace(/[^a-zA-Z0-9]/g, '-')}` });
        
        // Wait a bit before next test
        await stagehand.page.waitForTimeout(2000);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ Error testing model ${i + 1}: ${errorMessage}`);
        modelsTested.push({
          model: `Model ${i + 1}`,
          success: false,
          error: errorMessage
        });
      }
    }
    
    // Verify at least some models responded
    const successfulModels = modelsTested.filter(m => m.success);
    expect(successfulModels.length).toBeGreaterThan(0);
    
  }, { timeout: 600000 }); // 10 minutes total timeout

  it('should test specific provider models', async () => {
    console.log('\n🎯 Testing specific provider models...');
    
    const providersToTest = [
      { provider: 'OpenAI', model: 'GPT-4o' },
      { provider: 'Anthropic', model: 'Claude 4 Sonnet' },
      { provider: 'Google', model: 'Gemini 2.5 Flash' },
      { provider: 'Groq', model: 'LLaMA 3.3-70B' }
    ];
    
    for (const { provider, model } of providersToTest) {
      try {
        console.log(`\n🧪 Testing ${provider} - ${model}...`);
        
        // Open model selector
        await stagehand.act({ action: 'Click the model selector to open the dropdown' });
        await stagehand.page.waitForTimeout(2000);
        
        // Look for the specific model
        await stagehand.act({ action: `Click on the ${model} model option from ${provider}` });
        await stagehand.page.waitForTimeout(2000);
        
        // Send a provider-specific test
        const testMessage = `Hello ${provider}! Please respond with "I am ${model} and I'm working correctly."`;
        await stagehand.act({ action: `Type "${testMessage}" in the chat input` });
        await stagehand.page.waitForTimeout(1000);
        
        await stagehand.act({ action: 'Send the message' });
        
        // Wait for response
        let responseReceived = false;
        for (let attempts = 0; attempts < 20; attempts++) {
          await stagehand.page.waitForTimeout(1500);
          
          const responses = await stagehand.page.locator('.message, [data-role="assistant"]').all();
          if (responses.length > 0) {
            const responseText = await responses[responses.length - 1].textContent() || '';
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
        
        await stagehand.screenshot({ name: `provider-test-${provider.toLowerCase()}-${model.replace(/[^a-zA-Z0-9]/g, '-')}` });
        
      } catch (error) {
        console.log(`❌ Error testing ${provider} ${model}: ${error}`);
      }
    }
  }, { timeout: 300000 });
});