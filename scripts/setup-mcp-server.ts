#!/usr/bin/env tsx

/**
 * MCP Server Setup Script
 *
 * This script helps set up the Stagehand MCP server for Claude Desktop integration.
 * It follows the Stagehand MCP server documentation and best practices.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface MCPConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  };
}

const CLAUDE_CONFIG_PATHS = {
  macos: join(
    homedir(),
    'Library/Application Support/Claude/claude_desktop_config.json',
  ),
  windows: join(homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json'),
  linux: join(homedir(), '.config/claude/claude_desktop_config.json'),
};

function getPlatform(): 'macos' | 'windows' | 'linux' {
  const platform = process.platform;
  if (platform === 'darwin') return 'macos';
  if (platform === 'win32') return 'windows';
  return 'linux';
}

function getClaudeConfigPath(): string {
  const platform = getPlatform();
  return CLAUDE_CONFIG_PATHS[platform];
}

function loadClaudeConfig(): MCPConfig {
  const configPath = getClaudeConfigPath();

  if (!existsSync(configPath)) {
    console.log('📝 Claude Desktop config not found, creating new one...');
    return { mcpServers: {} };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to parse Claude Desktop config:', error);
    throw error;
  }
}

function saveClaudeConfig(config: MCPConfig): void {
  const configPath = getClaudeConfigPath();

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Claude Desktop config saved to: ${configPath}`);
  } catch (error) {
    console.error('❌ Failed to save Claude Desktop config:', error);
    throw error;
  }
}

function getEnvironmentVariables(): Record<string, string> {
  const requiredVars = [
    'BROWSERBASE_API_KEY',
    'BROWSERBASE_PROJECT_ID',
    'OPENAI_API_KEY',
  ];

  const optionalVars = [
    'STAGEHAND_ENV',
    'STAGEHAND_VERBOSE',
    'STAGEHAND_DEBUG_DOM',
    'STAGEHAND_HEADLESS',
  ];

  const env: Record<string, string> = {};

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      console.error(`❌ Required environment variable ${varName} is not set`);
      console.log('💡 Please set this variable in your .env.local file');
      process.exit(1);
    }
    env[varName] = value;
  }

  // Add optional variables with defaults
  env.STAGEHAND_ENV = process.env.STAGEHAND_ENV || 'BROWSERBASE';
  env.STAGEHAND_VERBOSE = process.env.STAGEHAND_VERBOSE || '1';
  env.STAGEHAND_DEBUG_DOM = process.env.STAGEHAND_DEBUG_DOM || 'false';
  env.STAGEHAND_HEADLESS = process.env.STAGEHAND_HEADLESS || 'true';

  return env;
}

function setupMCPServer(): void {
  console.log('🚀 Setting up Stagehand MCP Server for Claude Desktop...\n');

  // Load current Claude config
  const config = loadClaudeConfig();

  // Get environment variables
  const env = getEnvironmentVariables();

  // Add Browserbase MCP server configuration
  config.mcpServers['mcp-browserbase'] = {
    command: 'node',
    args: [
      '/Users/neo/Developer/mcp_servers/mcp-server-browserbase/browserbase/dist/index.js',
    ],
    env: {
      BROWSERBASE_API_KEY: env.BROWSERBASE_API_KEY,
      BROWSERBASE_PROJECT_ID: env.BROWSERBASE_PROJECT_ID,
    },
  };

  // Add Stagehand MCP server configuration
  config.mcpServers['mcp-stagehand'] = {
    command: 'node',
    args: [
      '/Users/neo/Developer/mcp_servers/mcp-server-browserbase/stagehand/dist/index.js',
    ],
    env,
  };

  // Save updated config
  saveClaudeConfig(config);

  console.log('\n✅ Stagehand MCP Server setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Restart Claude Desktop application');
  console.log(
    '2. Look for the 🔨 icon in Claude Desktop to access Stagehand tools',
  );
  console.log('3. Available tools:');
  console.log('   - stagehand_navigate: Navigate to any URL');
  console.log('   - stagehand_act: Perform actions on web pages');
  console.log('   - stagehand_extract: Extract data from web pages');
  console.log('   - stagehand_observe: Observe possible actions on pages');
  console.log('\n🔧 Configuration:');
  console.log(`   Environment: ${env.STAGEHAND_ENV}`);
  console.log(`   Verbose: ${env.STAGEHAND_VERBOSE}`);
  console.log(`   Headless: ${env.STAGEHAND_HEADLESS}`);
  console.log(`   Debug DOM: ${env.STAGEHAND_DEBUG_DOM}`);
}

function main(): void {
  try {
    setupMCPServer();
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
