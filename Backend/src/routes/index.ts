import { Router } from 'express';
import oauthRoutes from './oauth';
import contentstackAIRoutes from './contentstackAI';

const router = Router();

// Mount route modules
router.use('/oauth', oauthRoutes);
router.use('/contentstack', contentstackAIRoutes);

export default router;
