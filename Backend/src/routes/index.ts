import { Router } from 'express';
import authRoutes from './auth';
import tenantRoutes from './tenants';
import chatRoutes from './chat';
import oauthRoutes from './oauth';
import contentstackAIRoutes from './contentstackAI';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/chat', chatRoutes);
router.use('/oauth', oauthRoutes);
router.use('/contentstack', contentstackAIRoutes);

export default router;
