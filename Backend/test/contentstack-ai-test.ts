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

    // 🤖 LLM Provider Options (only models you have access to):
    //responseProvider: "groq",
    //responseModel: "llama-3.3-70b-versatile",
    //responseProvider: "openrouter",
    //responseModel: "openai/gpt-oss-20b:free",
    
    responseProvider: "gemini", // Testing fixed Gemini implementation
    responseModel: "gemini-2.5-flash"
  };

  console.log('📋 Test Configuration:');
  console.log(`  Tenant ID: ${testConfig.tenantId}`);
  console.log(`  API Key: ${testConfig.apiKey.substring(0, 8)}...`);
  console.log(`  Project ID: ${testConfig.projectId || 'Not specified'}`);
  console.log(`  Query: "${testConfig.query}"`);
  console.log(`  🧠 Tool Selection: Groq (fixed)`);
  console.log(`  🎯 Response Generation: ${testConfig.responseProvider}:${testConfig.responseModel}`);
  console.log();

  try {
    console.log('🚀 Starting ContentStack AI streaming query...');
    
    const startTime = Date.now();
    let response = '';
    
    await ContentStackAIService.processContentQueryStream(testConfig, (chunk: string) => {
      response += chunk;
      process.stdout.write(chunk);
    });
    
    const duration = Date.now() - startTime;
    console.log(`\n\n✅ Query completed in ${duration}ms\n`);
    console.log('📊 Complete Response:');
    console.log(`  Response: ${response}`);
    
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
