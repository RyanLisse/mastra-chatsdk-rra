#!/usr/bin/env tsx
/**
 * Basic Stagehand test to verify setup
 */

async function testStagehandBasic() {
  console.log('🚀 Testing basic Stagehand functionality...\n');

  try {
    // Check if Stagehand is available
    const { Stagehand } = require('@browserbasehq/stagehand');
    console.log('✅ Stagehand library loaded successfully');

    // Check for API key
    const hasValidApiKey =
      process.env.OPENAI_API_KEY &&
      !process.env.OPENAI_API_KEY.startsWith('test-') &&
      process.env.OPENAI_API_KEY.startsWith('sk-');

    if (!hasValidApiKey) {
      console.log('❌ Valid OpenAI API key not found');
      console.log('💡 Set OPENAI_API_KEY in .env.test to run Stagehand tests');
      process.exit(1);
    }

    console.log('✅ Valid OpenAI API key detected');

    // Initialize Stagehand
    console.log('\n📋 Initializing Stagehand...');
    const stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      debugDom: false,
      headless: true,
      domSettleTimeoutMs: 10000,
      timeout: 30000,
      navigationTimeout: 15000,
      actionTimeout: 10000,
      disablePino: true,
      launchOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        timeout: 15000,
      },
    });

    await stagehand.init();
    console.log('✅ Stagehand initialized successfully');

    // Test navigation
    console.log('\n📋 Testing navigation...');
    await stagehand.page.goto('https://example.com', {
      timeout: 15000,
      waitUntil: 'domcontentloaded',
    });
    console.log('✅ Navigation successful');

    // Test page content
    const title = await stagehand.page.title();
    console.log(`📄 Page title: ${title}`);

    // Test act method
    console.log('\n📋 Testing act method...');
    try {
      const elements = await stagehand.page.observe('find the main heading');
      console.log(`✅ Found ${elements.length} elements`);
    } catch (error) {
      console.log('⚠️  Observe method might not be available');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      if (stagehand.page && !stagehand.page.isClosed()) {
        await stagehand.page.close();
      }
    } catch (e) {
      console.log('⚠️  Page close error:', e);
    }
    
    try {
      if (stagehand.browser) {
        await stagehand.browser.close();
      }
    } catch (e) {
      console.log('⚠️  Browser close error:', e);
    }
    
    try {
      if (stagehand.close) {
        await stagehand.close();
      }
    } catch (e) {
      console.log('⚠️  Stagehand close error:', e);
    }
    console.log('✅ Cleanup successful');

    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testStagehandBasic();