#!/usr/bin/env tsx

// Test script for LangSmith observability integration
import { createRoboRailAgent } from '../lib/ai/agents/roborail-agent';
import { createRoboRailVoiceAgent } from '../lib/ai/agents/roborail-voice-agent';
import { getLangSmithClient } from '../lib/mastra/langsmith';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
if (!process.env.POSTGRES_URL || !process.env.COHERE_API_KEY) {
  config({ path: '.env' });
}

async function testLangSmithIntegration() {
  console.log('🔍 Testing LangSmith Observability Integration\n');

  // Test 1: Check LangSmith client initialization
  console.log('1. Testing LangSmith Client Initialization...');
  const client = getLangSmithClient();
  if (client) {
    console.log('✅ LangSmith client initialized successfully');
    console.log(`   Project: ${process.env.LANGSMITH_PROJECT}`);
  } else {
    console.log(
      '⚠️  LangSmith client not initialized (this is OK if not configured)',
    );
    console.log(
      '   Set LANGSMITH_API_KEY and LANGSMITH_PROJECT to enable tracing',
    );
  }
  console.log();

  // Test 2: Test RoboRail Agent with tracing
  console.log('2. Testing RoboRail Agent with LangSmith Tracing...');
  try {
    const agent = createRoboRailAgent({
      sessionId: `test-session-${Date.now()}`,
      selectedChatModel: 'title-model', // Uses gpt-4o-mini
    });

    console.log('   Generating test response...');
    const response = await agent.generate(
      'What are the safety protocols for RoboRail operations?',
    );

    console.log('✅ Agent generation completed successfully');
    console.log(`   Response length: ${response.text.length} characters`);
    console.log(`   Session ID: ${agent.getSessionId()}`);

    // Clean up test session
    await agent.clearMemory();
    console.log('   Test session memory cleared');
  } catch (error) {
    console.error(
      '❌ Agent test failed:',
      error instanceof Error ? error.message : error,
    );
  }
  console.log();

  // Test 3: Test Voice Agent initialization (without actual connection)
  console.log('3. Testing RoboRail Voice Agent Initialization...');
  try {
    const voiceAgent = createRoboRailVoiceAgent({
      sessionId: `voice-test-session-${Date.now()}`,
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('✅ Voice agent initialized successfully');
    console.log(`   Session ID: ${voiceAgent.getSessionId()}`);
    console.log(`   Connection status: ${voiceAgent.isVoiceConnected()}`);

    // Clean up test session
    await voiceAgent.clearMemory();
    console.log('   Voice test session memory cleared');
  } catch (error) {
    console.error(
      '❌ Voice agent test failed:',
      error instanceof Error ? error.message : error,
    );
  }
  console.log();

  // Test 4: Verify environment variables
  console.log('4. Environment Variables Check...');
  const requiredEnvVars = ['POSTGRES_URL', 'OPENAI_API_KEY', 'COHERE_API_KEY'];

  const optionalEnvVars = ['LANGSMITH_API_KEY', 'LANGSMITH_PROJECT'];

  let allRequired = true;
  requiredEnvVars.forEach((envVar) => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Configured`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      allRequired = false;
    }
  });

  optionalEnvVars.forEach((envVar) => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Configured (for LangSmith tracing)`);
    } else {
      console.log(`⚠️  ${envVar}: Not configured (tracing disabled)`);
    }
  });

  console.log();
  if (allRequired) {
    console.log('🎉 All required environment variables are configured!');
  } else {
    console.log('⚠️  Some required environment variables are missing.');
  }

  // Test 5: Package verification
  console.log('\n5. Package Dependencies Check...');
  try {
    const packageInfo = require('../package.json');
    const langsmithVersion = packageInfo.dependencies?.langsmith;

    if (langsmithVersion) {
      console.log(`✅ LangSmith package installed: ${langsmithVersion}`);
    } else {
      console.log('❌ LangSmith package not found in dependencies');
    }

    const mastraCore = packageInfo.dependencies?.['@mastra/core'];
    if (mastraCore) {
      console.log(`✅ Mastra Core package: ${mastraCore}`);
    }

    const mastraVoice =
      packageInfo.dependencies?.['@mastra/voice-openai-realtime'];
    if (mastraVoice) {
      console.log(`✅ Mastra Voice package: ${mastraVoice}`);
    }
  } catch (error) {
    console.error('❌ Error reading package.json:', error);
  }

  console.log('\n🔍 LangSmith Integration Test Complete!');

  if (client) {
    console.log('\n📊 Check your LangSmith dashboard for traces:');
    console.log(`   Project: ${process.env.LANGSMITH_PROJECT}`);
    console.log('   URL: https://smith.langchain.com/');
  } else {
    console.log('\n💡 To enable LangSmith tracing:');
    console.log('   1. Sign up at https://smith.langchain.com/');
    console.log('   2. Create a project and get your API key');
    console.log(
      '   3. Set LANGSMITH_API_KEY and LANGSMITH_PROJECT in your .env file',
    );
  }
}

// Run the test
testLangSmithIntegration().catch(console.error);
