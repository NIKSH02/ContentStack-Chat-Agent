import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import contentstackOAuthService from '../services/contentstackOAuth';

// Define AuthRequest interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
    userId?: string;
  };
}

export const initiateOAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Generate state for CSRF protection
    const state = contentstackOAuthService.generateState();
    
    // Store state in session or temporary storage (you might want to use Redis)
    // For now, we'll include it in the URL and validate it later
    const authUrl = contentstackOAuthService.generateAuthUrl(state);
    
    res.json({
      success: true,
      authUrl,
      state,
      message: 'Redirect user to this URL to authorize ContentStack access'
    });
  } catch (error: any) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate OAuth flow',
      error: error.message
    });
  }
};

// Simple in-memory cache to prevent code reuse
const processedCodes = new Set<string>();

export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description, location, region } = req.query;

    console.log('OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state,
      error,
      error_description,
      location,
      region
    });

    // Check if this code has already been processed
    if (code && processedCodes.has(code as string)) {
      console.warn('Authorization code has already been processed:', code);
      res.status(400).json({
        success: false,
        message: 'Authorization code has already been used'
      });
      return;
    }

    // Check for OAuth errors
    if (error) {
      res.status(400).json({
        success: false,
        message: 'OAuth authorization failed',
        error: error as string,
        error_description: error_description as string,
        location: location as string,
        region: region as string
      });
      return;
    }

    // Validate required parameters
    if (!code) {
      res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
      return;
    }

    console.log('Exchanging authorization code for access token...');
    
    // Exchange code for tokens (this is where the 60-second timeout applies)
    const tokenResponse = await contentstackOAuthService.exchangeCodeForToken(code as string);
    
    // Mark this code as processed
    processedCodes.add(code as string);
    
    console.log('Token exchange successful, creating user info from token metadata...');
    
    // Create user info from token response metadata (no API calls needed)
    const userInfo = {
      user: {
        uid: tokenResponse.user_uid || 'oauth_user',
        first_name: 'ContentStack',
        last_name: 'User',
        email: 'oauth-user@contentstack.com',
        organizations: [{
          uid: tokenResponse.organization_uid,
          name: 'OAuth Organization',
          is_owner: false
        }]
      }
    };
    
    console.log('Creating project info from token metadata...');
    
    let projects: any[] = [];
    
    // Handle different authorization types
    if (tokenResponse.authorization_type === 'app' && tokenResponse.stack_api_key) {
      // App-level authorization: we have a specific stack - fetch detailed data
      console.log('App authorization detected, fetching detailed stack data for:', tokenResponse.stack_api_key);
      try {
        const detailedStack = await contentstackOAuthService.getStackDetails(
          tokenResponse.access_token,
          tokenResponse.stack_api_key
        );
        
        projects = [{
          uid: tokenResponse.organization_uid,
          name: 'ContentStack Organization',
          description: 'Organization from OAuth token (App Authorization)',
          organization_uid: tokenResponse.organization_uid,
          stacks: [detailedStack]
        }];
        
        console.log(`App stack fetched: ${detailedStack.content_types?.length || 0} content types, ${detailedStack.entries?.length || 0} entries, ${detailedStack.assets?.length || 0} assets`);
      } catch (stackFetchError: any) {
        console.warn('Could not fetch detailed app stack data, using basic structure:', stackFetchError.message);
        projects = [{
          uid: tokenResponse.organization_uid,
          name: 'ContentStack Organization',
          description: 'Organization from OAuth token (App Authorization - Details not accessible)',
          organization_uid: tokenResponse.organization_uid,
          stacks: [{
            uid: 'oauth_stack',
            name: 'OAuth Stack',
            description: 'Stack accessible via OAuth',
            master_locale: 'en-us',
            api_key: tokenResponse.stack_api_key,
            organization_uid: tokenResponse.organization_uid,
            settings: {},
            content_types: [],
            entries: [],
            assets: []
          }]
        }];
      }
    } else if (tokenResponse.authorization_type === 'user') {
      // User-level authorization: fetch available stacks with content and assets
      console.log('User authorization detected, fetching organization stacks with content and assets...');
      try {
        const organizationStacks = await contentstackOAuthService.getOrganizationStacks(
          tokenResponse.access_token,
          tokenResponse.organization_uid
        );
        
        console.log(`Found ${organizationStacks.length} stacks for organization ${tokenResponse.organization_uid}`);
        
        projects = [{
          uid: tokenResponse.organization_uid,
          name: 'ContentStack Organization',
          description: 'Organization from OAuth token (User Authorization)',
          organization_uid: tokenResponse.organization_uid,
          stacks: organizationStacks
        }];
      } catch (stackFetchError: any) {
        console.warn('Could not fetch organization stacks, using empty project:', stackFetchError.message);
        projects = [{
          uid: tokenResponse.organization_uid,
          name: 'ContentStack Organization',
          description: 'Organization from OAuth token (User Authorization - Stacks not accessible)',
          organization_uid: tokenResponse.organization_uid,
          stacks: []
        }];
      }
    } else {
      // Fallback for unknown authorization type
      console.log('Unknown authorization type, creating minimal project structure');
      projects = [{
        uid: tokenResponse.organization_uid,
        name: 'ContentStack Organization',
        description: 'Organization from OAuth token',
        organization_uid: tokenResponse.organization_uid,
        stacks: []
      }];
    }

    console.log('OAuth flow completed successfully');

    // Store the OAuth data temporarily for the frontend to retrieve
    const sessionData: any = {
      success: true,
      message: 'OAuth authorization successful',
      data: {
        user: userInfo.user,
        projects,
        tokenInfo: {
          access_token: tokenResponse.access_token,
          token_type: tokenResponse.token_type,
          expires_in: tokenResponse.expires_in,
          location: tokenResponse.location,
          organization_uid: tokenResponse.organization_uid,
          authorization_type: tokenResponse.authorization_type,
          scope: tokenResponse.scope,
        },
        _refreshToken: tokenResponse.refresh_token,
        oauth_limitations: {
          message: "OAuth tokens from ContentStack Developer Hub apps have limited scope",
          limitations: [
            "Cannot access Management API endpoints for content types, entries, and assets",
            "Can only access basic stack information and organization details",
            "For content/asset data, you need Management API credentials (Stack API Key + Management Token)"
          ],
          solution: "Use ContentStack Management API with proper credentials to fetch content and asset data"
        }
      }
    };

    console.log('📋 OAuth Session Data (Limited Scope):', JSON.stringify({
      organization_uid: sessionData.data.tokenInfo.organization_uid,
      authorization_type: sessionData.data.tokenInfo.authorization_type,
      stacks_count: sessionData.data.projects[0]?.stacks?.length || 0,
      oauth_limitations: sessionData.data.oauth_limitations.message
    }, null, 2));

    // Store in temporary cache (you might want to use Redis in production)
    const sessionId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // For now, we'll return JSON but in production, consider redirecting with session ID
    
    res.json(sessionData);
  } catch (error: any) {
    console.error('Error handling OAuth callback:', error);
    
    // If it's a token exchange error, don't mark code as processed
    if (error.message?.includes('Failed to exchange authorization code')) {
      if (req.query.code) {
        processedCodes.delete(req.query.code as string);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'OAuth callback processing failed',
      error: error.message
    });
  }
};

// Clean up processed codes periodically (every 10 minutes)
setInterval(() => {
  processedCodes.clear();
  console.log('Cleared processed OAuth codes cache');
}, 10 * 60 * 1000);

export const clearOAuthCache = async (req: Request, res: Response) => {
  processedCodes.clear();
  console.log('Manually cleared processed OAuth codes cache');
  res.json({
    success: true,
    message: 'OAuth cache cleared'
  });
};

export const getUserProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { access_token } = req.query;

    if (!access_token) {
      res.status(400).json({
        success: false,
        message: 'access_token is required'
      });
      return;
    }

    // Validate access token
    const isValidToken = await contentstackOAuthService.validateToken(access_token as string);
    if (!isValidToken) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token'
      });
      return;
    }

    // Get user's projects and stacks
    const projects = await contentstackOAuthService.getUserProjects(access_token as string);

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: {
        projects
      }
    });
  } catch (error: any) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
};

// export const getStackTokens = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { stackApiKey } = req.params;
//     const { access_token } = req.query;

//     if (!access_token) {
//       res.status(400).json({
//         success: false,
//         message: 'access_token is required'
//       });
//       return;
//     }

//     // Validate access token
//     const isValidToken = await contentstackOAuthService.validateToken(access_token as string);
//     if (!isValidToken) {
//       res.status(401).json({
//         success: false,
//         message: 'Invalid or expired access token'
//       });
//       return;
//     }

//     // Get delivery tokens for the stack
//     const deliveryTokens = await contentstackOAuthService.getDeliveryTokens(
//       access_token as string, 
//       stackApiKey
//     );

//     res.json({
//       success: true,
//       message: 'Delivery tokens retrieved successfully',
//       data: {
//         stackApiKey,
//         deliveryTokens
//       }
//     });
//   } catch (error: any) {
//     console.error('Error fetching stack tokens:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch delivery tokens',
//       error: error.message
//     });
//   }
// };

// Refresh ContentStack access token using refresh token - Handles ContentStack's complete response format - /
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        success: false,
        message: 'refresh_token is required'
      });
      return;
    }

    console.log('Refreshing ContentStack access token...');

    // Refresh the access token using ContentStack's refresh token flow
    const tokenResponse = await contentstackOAuthService.refreshToken(refresh_token);

    console.log('Token refresh successful');

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        access_token: tokenResponse.access_token,
        token_type: tokenResponse.token_type,
        expires_in: tokenResponse.expires_in,
        location: tokenResponse.location,
        organization_uid: tokenResponse.organization_uid,
        authorization_type: tokenResponse.authorization_type,
        scope: tokenResponse.scope,
        // Include new refresh token if ContentStack rotates it
        refresh_token: tokenResponse.refresh_token
      }
    });
  } catch (error: any) {
    console.error('Error refreshing access token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh access token',
      error: error.message
    });
  }
};

// Handle app installation webhook from ContentStack - This endpoint receives webhook data when the app is installed - /
export const handleInstallWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== ContentStack Installation Webhook Received ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Log query parameters if any
    if (Object.keys(req.query).length > 0) {
      console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
    }
    
    // Log any URL parameters
    if (Object.keys(req.params).length > 0) {
      console.log('URL Parameters:', JSON.stringify(req.params, null, 2));
    }
    
    console.log('=== End of Webhook Data ===\n');
    
    // Respond to ContentStack that we received the webhook
    res.status(200).json({
      success: true,
      message: 'Installation webhook received successfully',
      timestamp: new Date().toISOString(),
      received_data: {
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
      }
    });
    
  } catch (error: any) {
    console.error('Error processing installation webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing installation webhook',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

