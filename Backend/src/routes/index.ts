import { Router } from 'express';
import oauthRoutes from './oauth';
import contentstackAIRoutes from './contentstackAI';
import mcpOAuthRoutes from './mcpOAuth';

const router = Router();

// Mount route modules
router.use('/oauth', oauthRoutes);
router.use('/contentstack', contentstackAIRoutes);
router.use('/mcp/oauth', mcpOAuthRoutes);

export default router;
