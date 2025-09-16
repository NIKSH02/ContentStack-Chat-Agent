import { Router } from 'express';
import ContentStackAIController from '../controllers/contentstackAIController';

const router = Router();

/**
 * ContentStack AI Routes
 * Provides endpoints for AI-powered ContentStack interactions
 */

// Health check
router.get('/health', ContentStackAIController.healthCheck);

// Streaming natural language content queries
router.post('/query-stream', ContentStackAIController.processQueryStream);

// Cleanup MCP instances
router.post('/cleanup', ContentStackAIController.cleanup);

export default router;
