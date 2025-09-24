import { Router } from 'express';
import { mcpOAuthController } from '../controllers/mcpOAuthController';

const router = Router();

router.get('/start', async (req, res) => {
  await mcpOAuthController.startOAuthFlow(req, res);
});

router.get('/callback', async (req, res) => {
  await mcpOAuthController.handleOAuthCallback(req, res);
});

router.post('/refresh', async (req, res) => {
  await mcpOAuthController.refreshToken(req, res);
});

router.get('/status/:sessionId', async (req, res) => {
  await mcpOAuthController.getOAuthStatus(req, res);
});

router.post('/logout', async (req, res) => {
  await mcpOAuthController.logout(req, res);
});

// @route GET /api/mcp/oauth/check/:sessionId - @desc Check OAuth completion status - @access Public - @param {string} sessionId - Session ID for the OAuth configuration - @returns {object} OAuth completion status - /

// extra created by chomu claude will remove later console 
router.get('/check/:sessionId', async (req, res) => {
  await mcpOAuthController.checkOAuthCompletion(req, res);
});

// @route GET /api/mcp/oauth/headers/:sessionId - @desc Get authentication headers for MCP API calls - @access Public - @param {string} sessionId - Session ID for the OAuth configuration - @returns {object} Authentication headers - /
router.get('/headers/:sessionId', async (req, res) => {
  await mcpOAuthController.getAuthHeaders(req, res);
});

export default router;