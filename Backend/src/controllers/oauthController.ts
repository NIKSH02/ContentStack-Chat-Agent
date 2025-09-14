import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import contentstackOAuthService from '../services/contentstackOAuth';
import { Tenant } from '../models/Tenant';

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

/**
 * Initiate OAuth flow - redirect to ContentStack
 */
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

/**
 * Handle OAuth callback from ContentStack
 */
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
    
    // Create basic project structure from token metadata
    const projects = [{
      uid: tokenResponse.organization_uid,
      name: 'ContentStack Organization',
      description: 'Organization from OAuth token',
      organization_uid: tokenResponse.organization_uid,
      stacks: tokenResponse.stack_api_key ? [{
        uid: 'oauth_stack',
        name: 'OAuth Stack',
        description: 'Stack accessible via OAuth',
        master_locale: 'en-us',
        api_key: tokenResponse.stack_api_key,
        organization_uid: tokenResponse.organization_uid,
        settings: {}
      }] : []
    }];

    console.log('OAuth flow completed successfully');

    // Store the OAuth data temporarily for the frontend to retrieve
    const sessionData = {
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
        _refreshToken: tokenResponse.refresh_token
      }
    };

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

/**
 * Clear processed OAuth codes cache (for testing)
 */
export const clearOAuthCache = async (req: Request, res: Response) => {
  processedCodes.clear();
  console.log('Manually cleared processed OAuth codes cache');
  res.json({
    success: true,
    message: 'OAuth cache cleared'
  });
};

/**
 * Connect ContentStack to existing tenant
 */
export const connectTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { 
      access_token, 
      refresh_token,
      organizationUid, 
      stackUid,
      stackApiKey,
      environment = 'production',
      region = 'EU',
      expires_in = 3600
    } = req.body;

    // Validate required fields
    if (!access_token || !organizationUid || !stackUid || !stackApiKey) {
      res.status(400).json({
        success: false,
        message: 'access_token, organizationUid, stackUid, and stackApiKey are required'
      });
      return;
    }

    // Validate access token
    const isValidToken = await contentstackOAuthService.validateToken(access_token);
    if (!isValidToken) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token'
      });
      return;
    }

    // Check if user has access to this tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
      return;
    }

    // Check if user owns this tenant
    if (tenant.createdBy.toString() !== req.user!.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only connect ContentStack to your own tenants.'
      });
      return;
    }

    // Verify the stack access using OAuth token
    try {
      const stackDetails = await contentstackOAuthService.getStackDetails(access_token, stackApiKey);
      if (!stackDetails || stackDetails.uid !== stackUid) {
        res.status(400).json({
          success: false,
          message: 'Invalid stack or no access to this stack'
        });
        return;
      }
    } catch (stackError) {
      res.status(400).json({
        success: false,
        message: 'Unable to verify stack access. Please check your permissions.'
      });
      return;
    }

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000));

    // Update tenant with ContentStack configuration
    tenant.contentstack = {
      organizationUid,
      stackUid,
      stackApiKey,
      region: region as 'US' | 'EU' | 'AZURE_NA' | 'AZURE_EU' | 'GCP_NA',
      environment,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry
    };

    await tenant.save();

    res.json({
      success: true,
      message: 'ContentStack successfully connected to tenant',
      data: {
        tenantId: tenant._id,
        contentstack: {
          organizationUid: tenant.contentstack.organizationUid,
          stackUid: tenant.contentstack.stackUid,
          region: tenant.contentstack.region,
          environment: tenant.contentstack.environment,
          tokenExpiry: tenant.contentstack.tokenExpiry
          // Don't expose tokens in response
        }
      }
    });
  } catch (error: any) {
    console.error('Error connecting ContentStack to tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect ContentStack',
      error: error.message
    });
  }
};

/**
 * Get user's ContentStack projects and stacks
 */
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

/**
 * Get delivery tokens for a specific stack
 */
export const getStackTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stackApiKey } = req.params;
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

    // Get delivery tokens for the stack
    const deliveryTokens = await contentstackOAuthService.getDeliveryTokens(
      access_token as string, 
      stackApiKey
    );

    res.json({
      success: true,
      message: 'Delivery tokens retrieved successfully',
      data: {
        stackApiKey,
        deliveryTokens
      }
    });
  } catch (error: any) {
    console.error('Error fetching stack tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery tokens',
      error: error.message
    });
  }
};

/**
 * Refresh ContentStack access token using refresh token
 * Handles ContentStack's complete response format
 */
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

/**
 * Disconnect ContentStack from tenant
 */
export const disconnectTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;

    // Find the tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
      return;
    }

    // Check if user owns this tenant
    if (tenant.createdBy.toString() !== req.user!.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only disconnect ContentStack from your own tenants.'
      });
      return;
    }

    // Remove ContentStack configuration
    tenant.contentstack = {
      organizationUid: '',
      stackUid: '',
      stackApiKey: '',
      region: 'EU',
      environment: 'production'
    };

    await tenant.save();

    res.json({
      success: true,
      message: 'ContentStack successfully disconnected from tenant',
      data: {
        tenantId: tenant._id
      }
    });
  } catch (error: any) {
    console.error('Error disconnecting ContentStack from tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect ContentStack',
      error: error.message
    });
  }
};

/**
 * Get ContentStack connection status for a tenant
 */
export const getConnectionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;

    // Find the tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
      return;
    }

    // Check if user has access to this tenant
    if (tenant.createdBy.toString() !== req.user!.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const isConnected = tenant.contentstack?.organizationUid && 
                      tenant.contentstack?.stackUid && 
                      tenant.contentstack?.stackApiKey;

    res.json({
      success: true,
      data: {
        tenantId: tenant._id,
        isConnected: !!isConnected,
        contentstack: isConnected ? {
          organizationUid: tenant.contentstack.organizationUid,
          stackUid: tenant.contentstack.stackUid,
          region: tenant.contentstack.region,
          environment: tenant.contentstack.environment,
          tokenExpiry: tenant.contentstack.tokenExpiry,
          // Don't expose tokens
        } : null
      }
    });
  } catch (error: any) {
    console.error('Error checking connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check connection status',
      error: error.message
    });
  }
};



/**
 * Helper function to get base URL by region
 */
function getBaseUrlByRegion(region: string): string {
  switch (region) {
    case 'EU':
      return 'https://eu-app.contentstack.com';
    case 'AZURE_NA':
      return 'https://azure-na-app.contentstack.com';
    case 'AZURE_EU':
      return 'https://azure-eu-app.contentstack.com';
    case 'GCP_NA':
      return 'https://gcp-na-app.contentstack.com';
    case 'US':
      return 'https://app.contentstack.com';
    case 'EU':
    default:
      return 'https://eu-app.contentstack.com';
  }
}
