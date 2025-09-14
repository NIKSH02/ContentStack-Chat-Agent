import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  initiateOAuth,
  handleCallback,
  connectTenant,
  getUserProjects,
  getStackTokens,
  refreshAccessToken,
  disconnectTenant,
  getConnectionStatus,
  clearOAuthCache
} from '../controllers/oauthController';

const router = Router();

/**
 * @route   GET /oauth/contentstack/initiate
 * @desc    Initiate ContentStack OAuth flow
 * @access  Public (returns auth URL)
 */
router.get('/contentstack/initiate', initiateOAuth);

/**
 * @route   GET /oauth/contentstack/callback
 * @desc    Handle ContentStack OAuth callback
 * @access  Public (ContentStack redirects here)
 */
router.get('/contentstack/callback', handleCallback);

/**
 * @route   POST /oauth/contentstack/clear-cache
 * @desc    Clear processed OAuth codes cache (for testing)
 * @access  Public
 */
router.post('/contentstack/clear-cache', clearOAuthCache);

/**
 * @route   GET /oauth/contentstack/projects
 * @desc    Get user's ContentStack projects and stacks
 * @access  Public (requires access_token in query)
 */
router.get('/contentstack/projects', getUserProjects);

/**
 * @route   GET /oauth/contentstack/stacks/:stackApiKey/tokens
 * @desc    Get delivery tokens for a specific stack
 * @access  Public (requires access_token in query)
 */
router.get('/contentstack/stacks/:stackApiKey/tokens', getStackTokens);

/**
 * @route   POST /oauth/contentstack/refresh
 * @desc    Refresh ContentStack access token
 * @access  Public (requires refresh_token in body)
 */
router.post('/contentstack/refresh', refreshAccessToken);

// Protected routes (require JWT authentication)

/**
 * @route   POST /oauth/contentstack/connect/:tenantId
 * @desc    Connect ContentStack to a tenant
 * @access  Private (requires JWT token)
 */
router.post('/contentstack/connect/:tenantId', authenticateToken, connectTenant);

/**
 * @route   DELETE /oauth/contentstack/disconnect/:tenantId
 * @desc    Disconnect ContentStack from a tenant
 * @access  Private (requires JWT token)
 */
router.delete('/contentstack/disconnect/:tenantId', authenticateToken, disconnectTenant);

/**
 * @route   GET /oauth/contentstack/status/:tenantId
 * @desc    Get ContentStack connection status for a tenant
 * @access  Private (requires JWT token)
 */
router.get('/contentstack/status/:tenantId', authenticateToken, getConnectionStatus);

export default router;
