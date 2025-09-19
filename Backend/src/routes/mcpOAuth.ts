import { Router } from 'express';
import { mcpOAuthController } from '../controllers/mcpOAuthController';

const router = Router();

/**
 * @route GET /api/mcp/oauth/start
 * @desc Start MCP OAuth flow and get authorization URL
 * @access Public
 * @query {string} [redirectUri] - Optional custom redirect URI
 * @returns {object} Authorization URL and session ID
 */
router.get('/start', async (req, res) => {
  await mcpOAuthController.startOAuthFlow(req, res);
});

/**
 * @route GET /api/mcp/oauth/callback
 * @desc Handle OAuth callback and exchange code for tokens
 * @access Public
 * @query {string} code - Authorization code from ContentStack
 * @query {string} state - State parameter (session ID)
 * @query {string} [error] - Error parameter if authorization failed
 * @query {string} [format] - Response format ('json' or 'html')
 * @returns {object|html} Token data or success HTML page
 */
router.get('/callback', async (req, res) => {
  await mcpOAuthController.handleOAuthCallback(req, res);
});

/**
 * @route POST /api/mcp/oauth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 * @body {string} sessionId - Session ID for the OAuth configuration
 * @returns {object} New token data
 */
router.post('/refresh', async (req, res) => {
  await mcpOAuthController.refreshToken(req, res);
});

/**
 * @route GET /api/mcp/oauth/status/:sessionId
 * @desc Get current OAuth status and token information
 * @access Public
 * @param {string} sessionId - Session ID for the OAuth configuration
 * @returns {object} Authentication status and token info
 */
router.get('/status/:sessionId', async (req, res) => {
  await mcpOAuthController.getOAuthStatus(req, res);
});

/**
 * @route POST /api/mcp/oauth/logout
 * @desc Logout and revoke OAuth tokens
 * @access Public
 * @body {string} sessionId - Session ID for the OAuth configuration
 * @returns {object} Logout confirmation
 */
router.post('/logout', async (req, res) => {
  await mcpOAuthController.logout(req, res);
});

/**
 * @route GET /api/mcp/oauth/check/:sessionId
 * @desc Check OAuth completion status
 * @access Public
 * @param {string} sessionId - Session ID for the OAuth configuration
 * @returns {object} OAuth completion status
 */

// extra created by chomu claude will remove later console 
router.get('/check/:sessionId', async (req, res) => {
  await mcpOAuthController.checkOAuthCompletion(req, res);
});

/**
 * @route GET /api/mcp/oauth/headers/:sessionId
 * @desc Get authentication headers for MCP API calls
 * @access Public
 * @param {string} sessionId - Session ID for the OAuth configuration
 * @returns {object} Authentication headers
 */
router.get('/headers/:sessionId', async (req, res) => {
  await mcpOAuthController.getAuthHeaders(req, res);
});

export default router;