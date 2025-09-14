#!/usr/bin/env node
/**
 * ContentStack AI Integration Test
 * Quick test script to verify the integration works
 */

// Load environment variables
require('dotenv').config();

import { ContentStackAIService } from '../src/services/contentstackAI';

async function testContentStackAI() {
  console.log('🧪 Testing ContentStack AI Integration...\n');

  // Test configuration (replace with your actual values)
  const testConfig = {
    query: "can you provide me the discord link mentioned in website ",
    tenantId: "test-tenant-001",
    apiKey: process.env.CONTENTSTACK_API_KEY || "blt483a005c4ad32b09",
    projectId:
      process.env.CONTENTSTACK_PROJECT_ID || "68a96ab5567b0b50bd700055", // Optional
    context: "Testing ContentStack MCP integration",
  };

  console.log('📋 Test Configuration:');
  console.log(`  Tenant ID: ${testConfig.tenantId}`);
  console.log(`  API Key: ${testConfig.apiKey.substring(0, 8)}...`);
  console.log(`  Project ID: ${testConfig.projectId || 'Not specified'}`);
  console.log(`  Query: "${testConfig.query}"`);
  console.log();

  try {
    console.log('🚀 Starting ContentStack AI query...');
    
    const startTime = Date.now();
    const result = await ContentStackAIService.processContentQuery(testConfig);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Query completed in ${duration}ms\n`);
    
    if (result.success) {
      console.log('📊 Success Response:');
      console.log(`  Response: ${result.response}`);
      if (result.contentData) {
        console.log(`  Content Data: ${JSON.stringify(result.contentData, null, 2)}`);
      }
    } else {
      console.log('❌ Error Response:');
      console.log(`  Error: ${result.error}`);
    }
    
  } catch (error: any) {
    console.error('💥 Test failed with exception:');
    console.error(error.message);
    console.error(error.stack);
  }

  console.log('\n🧹 Cleaning up MCP instances...');
  await ContentStackAIService.cleanup();
  
  console.log('✨ Test completed!');
  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testContentStackAI().catch(console.error);
}

export default testContentStackAI;
