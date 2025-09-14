#!/usr/bin/env node
/**
 * Simple ContentStack MCP Debug Test
 */

require('dotenv').config();
import { ContentStackMCPService } from '../src/services/contentstackMCP';

async function debugMCP() {
  console.log('🔍 ContentStack MCP Debug Test...\n');

  const config = {
    apiKey: process.env.CONTENTSTACK_API_KEY || "blt3535fd43f0763af7",
    groups: 'cma' as const
  };

  console.log('📋 Configuration:');
  console.log(`  API Key: ${config.apiKey.substring(0, 8)}...`);
  console.log(`  Groups: ${config.groups}`);
  console.log();

  const mcpService = new ContentStackMCPService(config);

  try {
    console.log('🚀 Starting MCP server...');
    await mcpService.startMCPServer();
    console.log('✅ MCP server started successfully');

    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📡 Testing tools/list...');
    
    // Try to list available tools first
    const toolsListResult = await mcpService.sendRequest('tools/list', {});
    console.log('Tools list result:', JSON.stringify(toolsListResult, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🧹 Stopping MCP server...');
    await mcpService.stopMCPServer();
    console.log('✨ Test completed!');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  process.exit(0);
});

debugMCP().catch(console.error);
