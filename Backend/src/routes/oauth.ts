import { Router } from 'express';
import {
  initiateOAuth,
  handleCallback,
  getUserProjects,
  // getStackTokens,
  refreshAccessToken,
  clearOAuthCache,
  handleInstallWebhook
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
// router.get('/contentstack/stacks/:stackApiKey/tokens', getStackTokens);

/**
 * @route   POST /oauth/contentstack/refresh
 * @desc    Refresh ContentStack access token
 * @access  Public (requires refresh_token in body)
 */
router.post('/contentstack/refresh', refreshAccessToken);

/**
 * @route   POST /oauth/contentstack/webhook/install
 * @desc    Handle app installation webhook from ContentStack
 * @access  Public (ContentStack webhook endpoint)
 */
router.post('/contentstack/webhook/install', handleInstallWebhook);

export default router;
