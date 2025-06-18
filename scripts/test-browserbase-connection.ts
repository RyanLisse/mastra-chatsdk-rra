#!/usr/bin/env tsx

/**
 * Test Browserbase Connection Script
 * 
 * This script tests the connection to Browserbase using your API keys
 * and verifies that Stagehand can work with your configuration.
 */

import { config } from 'dotenv';
import { Browserbase } from '@browserbasehq/sdk';
import { Stagehand } from '@browserbasehq/stagehand';

// Load environment variables
config({ path: '.env.local' });

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

async function testBrowserbaseConnection(): Promise<TestResult> {
  try {
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      return {
        test: 'Browserbase Connection',
        success: false,
        message: 'Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID environment variables',
      };
    }

    console.log('🔑 Testing Browserbase connection...');
    console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`   Project ID: ${projectId}`);

    const browserbase = new Browserbase();
    
    // Test creating a session
    const session = await browserbase.sessions.create({
      projectId,
    });

    console.log(`✅ Session created: ${session.id}`);

    // Test getting session details
    const sessionDetails = await browserbase.sessions.retrieve(session.id);
    console.log(`✅ Session details retrieved: ${sessionDetails.status}`);

    // Clean up - end the session
    await browserbase.sessions.update(session.id, { status: 'REQUEST_RELEASE' });
    console.log(`✅ Session ended: ${session.id}`);

    return {
      test: 'Browserbase Connection',
      success: true,
      message: 'Successfully connected to Browserbase and created/managed session',
      data: {
        sessionId: session.id,
        status: sessionDetails.status,
      },
    };
  } catch (error) {
    return {
      test: 'Browserbase Connection',
      success: false,
      message: `Failed to connect to Browserbase: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function testStagehandWithBrowserbase(): Promise<TestResult> {
  try {
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || !projectId || !openaiKey) {
      return {
        test: 'Stagehand with Browserbase',
        success: false,
        message: 'Missing required environment variables (BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, OPENAI_API_KEY)',
      };
    }

    console.log('🤖 Testing Stagehand with Browserbase...');

    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey,
      projectId,
      verbose: 1,
      headless: true,
      domSettleTimeoutMs: 30000,
    });

    await stagehand.init();
    console.log('✅ Stagehand initialized with Browserbase');

    // Test navigation
    await stagehand.page.goto('https://docs.stagehand.dev/');
    console.log('✅ Successfully navigated to Stagehand docs');

    // Test extraction
    const result = await stagehand.page.extract({
      instruction: 'extract the main heading of the page',
      schema: {
        title: 'string',
      },
    });

    console.log(`✅ Successfully extracted data: ${JSON.stringify(result)}`);

    // Cleanup
    await stagehand.close();
    console.log('✅ Stagehand session closed');

    return {
      test: 'Stagehand with Browserbase',
      success: true,
      message: 'Successfully used Stagehand with Browserbase for web automation',
      data: result,
    };
  } catch (error) {
    return {
      test: 'Stagehand with Browserbase',
      success: false,
      message: `Failed to use Stagehand with Browserbase: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function testLocalStagehand(): Promise<TestResult> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey || openaiKey.startsWith('test-')) {
      return {
        test: 'Local Stagehand',
        success: false,
        message: 'Missing valid OPENAI_API_KEY for local Stagehand testing',
      };
    }

    console.log('🖥️  Testing Stagehand in LOCAL mode...');

    const stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      headless: true,
      domSettleTimeoutMs: 30000,
    });

    await stagehand.init();
    console.log('✅ Local Stagehand initialized');

    // Test navigation
    await stagehand.page.goto('https://docs.stagehand.dev/');
    console.log('✅ Successfully navigated to Stagehand docs (local)');

    // Test observation
    const actions = await stagehand.page.observe('find navigation links');
    console.log(`✅ Successfully observed ${actions.length} actions`);

    // Cleanup
    await stagehand.close();
    console.log('✅ Local Stagehand session closed');

    return {
      test: 'Local Stagehand',
      success: true,
      message: 'Successfully used Stagehand in LOCAL mode',
      data: {
        actionsFound: actions.length,
      },
    };
  } catch (error) {
    return {
      test: 'Local Stagehand',
      success: false,
      message: `Failed to use Stagehand in LOCAL mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function main(): Promise<void> {
  console.log('🧪 Testing Browserbase and Stagehand Configuration\n');

  const tests = [
    testBrowserbaseConnection,
    testStagehandWithBrowserbase,
    testLocalStagehand,
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      const result = await test();
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.test}: ${result.message}`);
      } else {
        console.log(`❌ ${result.test}: ${result.message}`);
      }
    } catch (error) {
      console.log(`💥 ${test.name} crashed: ${error}`);
      results.push({
        test: test.name,
        success: false,
        message: `Test crashed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\n✅ Working configurations:');
    successful.forEach(result => {
      console.log(`  • ${result.test}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed configurations:');
    failed.forEach(result => {
      console.log(`  • ${result.test}: ${result.message}`);
    });
  }

  console.log('\n💡 Next steps:');
  if (successful.length === results.length) {
    console.log('  • All tests passed! Your configuration is working correctly.');
    console.log('  • You can now use Stagehand in both LOCAL and BROWSERBASE modes.');
    console.log('  • Run `npm run setup:mcp` to configure Claude Desktop integration.');
  } else {
    console.log('  • Fix the failed configurations above.');
    console.log('  • Ensure all required environment variables are set in .env.local');
    console.log('  • Check your API keys and project IDs are correct.');
  }
}

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}
