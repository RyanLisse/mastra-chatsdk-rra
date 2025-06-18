#!/usr/bin/env tsx

/**
 * Stagehand Demo Script
 *
 * This script demonstrates Stagehand capabilities following best practices:
 * - Atomic and specific actions
 * - Proper error handling and cleanup
 * - Use of observe() before act()
 * - Variables for sensitive data
 * - Support for both LOCAL and BROWSERBASE environments
 */

import {
  createBrowserbaseSession,
  extractData,
  initializeStagehand,
  navigateToUrl,
  observeActions,
  takeScreenshot,
} from '../lib/stagehand/utils';

import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config({ path: '.env.local' });

// Demo configuration schema
const DemoConfigSchema = z.object({
  url: z.string().url().default('https://docs.stagehand.dev/'),
  useRemote: z.boolean().default(false),
  takeScreenshots: z.boolean().default(true),
  verbose: z.boolean().default(true),
});

type DemoConfig = z.infer<typeof DemoConfigSchema>;

async function runDemo(demoConfig: DemoConfig): Promise<void> {
  const { url, useRemote, takeScreenshots, verbose } = demoConfig;

  if (verbose) {
    console.log('🚀 Starting Stagehand Demo...');
    console.log(`📍 Target URL: ${url}`);
    console.log(`🌐 Environment: ${useRemote ? 'BROWSERBASE' : 'LOCAL'}`);
  }

  let sessionId: string | undefined;

  // Create Browserbase session if using remote environment
  if (useRemote) {
    try {
      const session = await createBrowserbaseSession();
      sessionId = session.sessionId;

      if (verbose) {
        console.log(`✅ Browserbase session created: ${sessionId}`);
        if (session.debugUrl) {
          console.log(`🔍 Debug URL: ${session.debugUrl}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to create Browserbase session:', error);
      return;
    }
  }

  // Initialize Stagehand
  const { stagehand, cleanup } = await initializeStagehand(sessionId, {
    env: useRemote ? 'BROWSERBASE' : 'LOCAL',
    verbose: verbose ? 1 : 0,
  });

  try {
    // Step 1: Navigate to the target URL
    if (verbose) console.log('\n📍 Step 1: Navigating to target URL...');
    await navigateToUrl(stagehand, url);

    if (takeScreenshots) {
      await takeScreenshot(stagehand, 'demo-01-initial-page.png');
    }

    // Step 2: Observe available actions
    if (verbose) console.log('\n👀 Step 2: Observing available actions...');
    const allActions = await observeActions(stagehand);

    if (verbose) {
      console.log(`Found ${allActions.length} possible actions:`);
      allActions.slice(0, 5).forEach((action, index) => {
        console.log(`  ${index + 1}. ${action.description || action.action}`);
      });
      if (allActions.length > 5) {
        console.log(`  ... and ${allActions.length - 5} more`);
      }
    }

    // Step 3: Look for specific elements (e.g., navigation links)
    if (verbose) console.log('\n🔍 Step 3: Looking for navigation links...');
    const navActions = await observeActions(stagehand, {
      instruction: 'find navigation links and buttons',
    });

    if (verbose) {
      console.log(`Found ${navActions.length} navigation elements`);
    }

    // Step 4: Extract page information
    if (verbose) console.log('\n📄 Step 4: Extracting page information...');

    const pageInfoSchema = z.object({
      title: z.string(),
      description: z.string().optional(),
      mainHeading: z.string().optional(),
    });

    type PageInfo = z.infer<typeof pageInfoSchema>;

    try {
      const pageInfo = (await extractData(stagehand, {
        instruction: 'extract the page title, description, and main heading',
        schema: pageInfoSchema,
      })) as PageInfo;

      if (verbose) {
        console.log('📋 Page Information:');
        console.log(`  Title: ${pageInfo.title}`);
        if (pageInfo.description) {
          console.log(`  Description: ${pageInfo.description}`);
        }
        if (pageInfo.mainHeading) {
          console.log(`  Main Heading: ${pageInfo.mainHeading}`);
        }
      }
    } catch (error) {
      if (verbose) {
        console.log('⚠️  Could not extract page information:', error);
      }
    }

    // Step 5: Perform a specific action (if quickstart link exists)
    if (verbose) console.log('\n🎯 Step 5: Looking for quickstart link...');

    const quickstartActions = await observeActions(stagehand, {
      instruction: 'find quickstart or getting started link',
    });

    if (quickstartActions.length > 0) {
      if (verbose) console.log('✅ Found quickstart link, clicking it...');

      // Use the observed action directly (best practice)
      await stagehand.page.act(quickstartActions[0]);

      // Wait for navigation
      await stagehand.page.waitForTimeout(3000);

      if (takeScreenshots) {
        await takeScreenshot(stagehand, 'demo-02-quickstart-page.png');
      }

      // Extract information from the new page
      try {
        const quickstartSchema = z.object({
          heading: z.string(),
          firstParagraph: z.string().optional(),
        });

        type QuickstartInfo = z.infer<typeof quickstartSchema>;

        const quickstartInfo = (await extractData(stagehand, {
          instruction: 'extract the main heading and first paragraph',
          schema: quickstartSchema,
        })) as QuickstartInfo;

        if (verbose) {
          console.log('📋 Quickstart Page Information:');
          console.log(`  Heading: ${quickstartInfo.heading}`);
          if (quickstartInfo.firstParagraph) {
            console.log(
              `  First Paragraph: ${quickstartInfo.firstParagraph.slice(0, 100)}...`,
            );
          }
        }
      } catch (error) {
        if (verbose) {
          console.log('⚠️  Could not extract quickstart information:', error);
        }
      }
    } else {
      if (verbose) console.log('ℹ️  No quickstart link found');
    }

    // Step 6: Demonstrate form interaction (if available)
    if (verbose)
      console.log('\n📝 Step 6: Looking for interactive elements...');

    const formActions = await observeActions(stagehand, {
      instruction: 'find input fields, search boxes, or forms',
    });

    if (formActions.length > 0) {
      if (verbose) {
        console.log(`Found ${formActions.length} interactive elements`);
        console.log(
          'ℹ️  Demo complete - interactive elements detected but not modified',
        );
      }
    } else {
      if (verbose) console.log('ℹ️  No interactive elements found');
    }

    if (takeScreenshots) {
      await takeScreenshot(stagehand, 'demo-03-final-state.png');
    }

    if (verbose) {
      console.log('\n✅ Demo completed successfully!');
      console.log('\n📸 Screenshots saved:');
      console.log('  - demo-01-initial-page.png');
      if (quickstartActions.length > 0) {
        console.log('  - demo-02-quickstart-page.png');
      }
      console.log('  - demo-03-final-state.png');
    }
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  } finally {
    // Always cleanup
    await cleanup();
    if (verbose) {
      console.log('🧹 Cleanup completed');
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const config: Partial<DemoConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--url':
        config.url = args[++i];
        break;
      case '--remote':
        config.useRemote = true;
        break;
      case '--local':
        config.useRemote = false;
        break;
      case '--no-screenshots':
        config.takeScreenshots = false;
        break;
      case '--quiet':
        config.verbose = false;
        break;
      case '--help':
        console.log(`
Stagehand Demo Script

Usage: npm run stagehand:demo [options]

Options:
  --url <url>         Target URL to demo (default: https://docs.stagehand.dev/)
  --remote            Use Browserbase remote environment
  --local             Use local browser environment (default)
  --no-screenshots    Skip taking screenshots
  --quiet             Reduce output verbosity
  --help              Show this help message

Examples:
  npm run stagehand:demo
  npm run stagehand:demo -- --url https://example.com --remote
  npm run stagehand:demo -- --local --no-screenshots
        `);
        return;
    }
  }

  // Validate and run demo
  try {
    const demoConfig = DemoConfigSchema.parse(config);
    await runDemo(demoConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid configuration:', error.errors);
    } else {
      console.error('❌ Demo failed:', error);
    }
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}
