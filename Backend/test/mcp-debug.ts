#!/usr/bin/env node
/**
 * Debug MCP Communication - Enhanced
 */
require('dotenv').config();

import { ContentStackMCPService } from '../src/services/contentstackMCP';

async function debugMCP() {
  console.log('🔧 Enhanced MCP Debug...\n');

  const config = {
    apiKey: process.env.CONTENTSTACK_API_KEY || "blt483a005c4ad32b09",
    projectId: process.env.CONTENTSTACK_PROJECT_ID || "68a96ab5567b0b50bd700055",
    groups: 'cma' as 'launch' | 'cma' | 'both',
    region: 'EU'
  };

  console.log('Config:', config);
  
  const mcpService = new ContentStackMCPService(config);
  
  try {
    console.log('1. Starting MCP server...');
    await mcpService.startMCPServer();
    
    console.log('2. Waiting for server to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer
    
    console.log('3. Testing tools/list first...');
    const toolsList = await mcpService.listAvailableTools();
    console.log('Tools list success:', toolsList.success);
    if (toolsList.success && toolsList.data?.tools) {
      console.log('Number of tools available:', toolsList.data.tools.length);
      const toolNames = toolsList.data.tools.map((tool: any) => tool.name);
      console.log('First 10 tool names:', toolNames.slice(0, 10));
      console.log('Has get_all_entries?', toolNames.includes('get_all_entries'));
      console.log('Has get_all_content_types?', toolNames.includes('get_all_content_types'));
    } else {
      console.log('Tools list failed:', toolsList);
    }
    
    console.log('\n4. Testing direct tool call to get_all_content_types...');
    const contentTypes = await mcpService.getContentTypes();
    console.log('Content types result:', contentTypes.success ? 'SUCCESS' : 'FAILED');
    if (!contentTypes.success) {
      console.log('Error details:', contentTypes.error);
    }
    
    console.log('\n5. Testing direct tool call to get_all_entries with page...');
    const entries = await mcpService.fetchContent('page');
    console.log('Entries result:', entries.success ? 'SUCCESS' : 'FAILED');
    if (!entries.success) {
      console.log('Error details:', entries.error);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    console.log('\nStopping MCP server...');
    await mcpService.stopMCPServer();
  }
}

debugMCP().catch(console.error);
