import { Router } from 'express';
import ContentStackAIController from '../controllers/contentstackAIController';

const router = Router();

/**
 * ContentStack AI Routes
 * Provides endpoints for AI-powered ContentStack interactions
 */

// Health check
router.get('/health', ContentStackAIController.healthCheck);

// Natural language content queries
router.post('/query', ContentStackAIController.processQuery);

// Get available content types
router.post('/content-types', ContentStackAIController.getContentTypes);

// Create content with AI assistance
router.post('/create-content', ContentStackAIController.createContent);

// Instance management (monitoring/debugging)
router.get('/instances', ContentStackAIController.getActiveInstances);

// Cleanup MCP instances
router.post('/cleanup', ContentStackAIController.cleanup);

export default router;
