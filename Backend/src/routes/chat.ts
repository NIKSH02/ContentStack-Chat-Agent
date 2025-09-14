import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

// Chat session management
router.post('/sessions', chatController.createChatSession);
router.get('/tenants/:tenantId/sessions', chatController.getChatSessions);
router.get('/sessions/:sessionId', chatController.getChatSession);
router.put('/sessions/:sessionId', chatController.updateChatSession);
router.delete('/sessions/:sessionId', chatController.deleteChatSession);

// Chat messaging
router.post('/sessions/:sessionId/messages', chatController.sendMessage);

// Analytics
router.get('/tenants/:tenantId/analytics', chatController.getChatAnalytics);

export default router;
