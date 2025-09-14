// Load environment variables first
require('dotenv').config();

// Simple test for ContentStack AI integration
import { contentStackMCPManager } from '../src/services/contentstackMCP';

async function testContentStackIntegration() {
  console.log('🧪 Testing ContentStack MCP Integration...\n');

  const config = {
    apiKey: process.env.CONTENTSTACK_API_KEY || "blt3535fd43f0763af7",
    groups: 'cma' as const
  };

  console.log('📋 Configuration:');
  console.log(`  API Key: ${config.apiKey.substring(0, 8)}...`);
  console.log(`  Groups: ${config.groups}\n`);

  try {
    // Get MCP instance
    const mcpService = contentStackMCPManager.getInstance('test-tenant', config);
    
    // Start MCP server
    console.log('🚀 Starting MCP server...');
    await mcpService.startMCPServer();
    console.log('✅ MCP server started\n');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test content types
    console.log('📡 Testing content types retrieval...');
    const contentTypesResult = await mcpService.getContentTypes();
    
    if (contentTypesResult.success) {
      console.log('✅ Content types retrieved successfully!');
      console.log('Data preview:', JSON.stringify(contentTypesResult.data, null, 2).substring(0, 500) + '...');
    } else {
      console.log('❌ Content types failed:', contentTypesResult.error);
    }

  } catch (error: any) {
    console.error('💥 Test failed:', error.message);
  } finally {
    console.log('\n🧹 Cleaning up...');
    // await contentStackMCPManager.cleanupAll();
    console.log('✨ Test completed!');
    process.exit(0);
  }
}

// Run the test
testContentStackIntegration().catch(console.error);
