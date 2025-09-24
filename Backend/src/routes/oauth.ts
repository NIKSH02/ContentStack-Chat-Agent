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

router.get('/contentstack/initiate', initiateOAuth);

router.get('/contentstack/callback', handleCallback);

router.post('/contentstack/clear-cache', clearOAuthCache);

router.get('/contentstack/projects', getUserProjects);

// router.get('/contentstack/stacks/:stackApiKey/tokens', getStackTokens);

// @route   POST /oauth/contentstack/refresh - @desc    Refresh ContentStack access token - @access  Public (requires refresh_token in body) - /
router.post('/contentstack/refresh', refreshAccessToken);

// @route   POST /oauth/contentstack/webhook/install - @desc    Handle app installation webhook from ContentStack - @access  Public (ContentStack webhook endpoint) - /
router.post('/contentstack/webhook/install', handleInstallWebhook);

export default router;
