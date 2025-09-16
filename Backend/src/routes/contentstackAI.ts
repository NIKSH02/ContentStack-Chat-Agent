import { Router } from 'express';
import ContentStackAIController from '../controllers/contentstackAIController';

const router = Router();

/**
 * ContentStack AI Routes
 * Provides endpoints for AI-powered ContentStack interactions
 */

// Health check
router.get('/health', ContentStackAIController.healthCheck);

// Enhanced natural language content queries with dual LLM strategy
router.post('/query', ContentStackAIController.processQuery);

// Streaming natural language content queries
router.post('/query-stream', ContentStackAIController.processQueryStream);

// Instance management (monitoring/debugging)
router.get('/instances', ContentStackAIController.getActiveInstances);

// Cleanup MCP instances
router.post('/cleanup', ContentStackAIController.cleanup);

export default router;
