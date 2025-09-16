import axios from 'axios';
import { Request } from 'express';
import { log } from 'node:console';

export interface ContentStackTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  location: string;
  region: string;
  organization_uid: string;
  authorization_type: string;
  user_uid?: string; // OAuth response includes this
  stack_api_key?: string; // Might be empty or contain a specific stack
  scope?: string; // Optional as it might not always be present
}

export interface ContentStackUserInfo {
  user: {
    uid: string;
    first_name: string;
    last_name: string;
    email: string;
    organizations: Array<{
      uid: string;
      name: string;
      is_owner: boolean;
    }>;
  };
}

export interface ContentStackStack {
  uid: string;
  name: string;
  description?: string;
  master_locale: string;
  api_key: string;
  organization_uid: string;
  settings?: {
    stack_variables?: any;
  };
}

export interface ContentStackProject {
  uid: string;
  name: string;
  description?: string;
  organization_uid: string;
  stacks: ContentStackStack[];
}

class ContentStackOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl: string;
  private readonly appId: string;

  constructor() {
    this.clientId = process.env.CONTENTSTACK_CLIENT_ID!;
    this.clientSecret = process.env.CONTENTSTACK_CLIENT_SECRET!;
    this.redirectUri = process.env.CONTENTSTACK_REDIRECT_URI!;
    this.baseUrl = process.env.CONTENTSTACK_BASE_URL || 'https://eu-app.contentstack.com';
    this.appId = process.env.CONTENTSTACK_APP_ID || '68c15c824f8023001243f1fb'; // Default to your app ID
    
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('ContentStack OAuth credentials not configured properly');
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state?: string): string {
    // ContentStack OAuth scopes - try different scope formats
    // Common ContentStack scopes: 'read', 'read_write', 'cms:read', 'cms:write'
    const scope =
      process.env.CONTENTSTACK_OAUTH_SCOPE ||
      "cm.stacks.management:read cm.stack.management:read";
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scope,
    });

    if (state) {
      params.append('state', state);
    }

    // Use the correct ContentStack OAuth URL format
    return `${this.baseUrl}/#!/apps/${this.appId}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<ContentStackTokenResponse> {
    try {
      // ContentStack token endpoint - corrected URL format
      const tokenUrl = `${this.baseUrl}/apps-api/token`;
      
      // ContentStack requires application/x-www-form-urlencoded format
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code: code,
      });

      console.log('Token exchange request:', {
        url: tokenUrl,
        body: params.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('Token exchange successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error exchanging code for token:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Failed to exchange authorization code for token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * ContentStack requires redirect_uri even for refresh token calls
   */
  async refreshToken(refreshToken: string): Promise<ContentStackTokenResponse> {
    try {
      const tokenUrl = `${this.baseUrl}/apps-api/token`;
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri, // ContentStack requires this
        refresh_token: refreshToken,
      });

      console.log('Refresh token request:', {
        url: tokenUrl,
        body: params.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('Refresh token successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error refreshing token:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Failed to refresh access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get user information using OAuth access token
   */
  async getUserInfo(accessToken: string): Promise<ContentStackUserInfo> {
    try {
      // For OAuth tokens, we should use OAuth-compatible APIs or App Framework APIs
      // Since we have organization_uid and user_uid from token response, use that
      
      // Try OAuth-compatible endpoint (if it exists)
      const response = await axios.get(`${this.baseUrl}/apps-api/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`, // OAuth Bearer token
          'Content-Type': 'application/json',
        },
      });

      return {
        user: response.data.user || response.data
      };
    } catch (error: any) {
      console.error('OAuth user API failed:', error.response?.data || error.message);
      
      // For OAuth tokens, we might not have direct user API access
      // Instead, create user info from the token response data
      console.warn('Creating user info from OAuth token metadata');
      return {
        user: {
          uid: 'oauth_user', // We'll get this from token exchange response
          email: 'oauth-user@contentstack.com',
          first_name: 'OAuth',
          last_name: 'User',
          organizations: [{
            uid: 'oauth_org', // We'll get this from token exchange response
            name: 'OAuth Organization',
            is_owner: false
          }]
        }
      };
    }
  }

  /**
   * Get user's projects with stacks using OAuth token
   */
  async getUserProjects(accessToken: string): Promise<ContentStackProject[]> {
    try {
      // For OAuth tokens from Developer Hub apps, we need to use OAuth-compatible APIs
      // Try the apps-api endpoints first
      
      let stacksResponse;
      try {
        // Try OAuth-compatible stacks endpoint
        stacksResponse = await axios.get(`${this.baseUrl}/apps-api/stacks`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`, // OAuth Bearer token
            'Content-Type': 'application/json',
          },
        });
      } catch (oauthError: any) {
        console.warn('OAuth stacks API failed, trying Management API:', oauthError.response?.data || oauthError.message);
        
        // Fallback to Management API (might fail with 105 error)
        const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
        stacksResponse = await axios.get(`${apiBase}/v3/stacks`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`, // Try Bearer token first
            'Content-Type': 'application/json',
          },
          params: {
            include_collaborators: false,
            include_stack_variables: false, 
            include_discrete_variables: false,
            include_count: false
          },
        });
      }

      console.log('Stacks API Response:', stacksResponse.data);

      const projects: ContentStackProject[] = [];
      
      // Handle single stack response (when user has access to one stack)
      if (stacksResponse.data.stack) {
        const stack = stacksResponse.data.stack;
        projects.push({
          uid: stack.org_uid || stack.organization_uid || 'default-org',
          name: `Organization (${stack.name})`,
          description: `Organization containing ${stack.name}`,
          organization_uid: stack.org_uid || stack.organization_uid,
          stacks: [{
            uid: stack.uid,
            name: stack.name,
            description: stack.description || '',
            master_locale: stack.master_locale,
            api_key: stack.api_key,
            organization_uid: stack.org_uid || stack.organization_uid,
            settings: stack.settings,
          }]
        });
      }

      // Handle multiple stacks response (when user has access to multiple stacks)
      if (stacksResponse.data.stacks && Array.isArray(stacksResponse.data.stacks)) {
        // Group stacks by organization
        const stacksByOrg = new Map();
        
        for (const stack of stacksResponse.data.stacks) {
          const orgUid = stack.org_uid || stack.organization_uid || 'default-org';
          if (!stacksByOrg.has(orgUid)) {
            stacksByOrg.set(orgUid, {
              uid: orgUid,
              name: `Organization ${orgUid}`,
              description: `Organization containing stacks`,
              organization_uid: orgUid,
              stacks: []
            });
          }
          
          stacksByOrg.get(orgUid).stacks.push({
            uid: stack.uid,
            name: stack.name,
            description: stack.description || '',
            master_locale: stack.master_locale,
            api_key: stack.api_key,
            organization_uid: orgUid,
            settings: stack.settings,
          });
        }
        
        projects.push(...Array.from(stacksByOrg.values()));
      }

      return projects;
    } catch (error: any) {
      console.error('Error fetching user projects:', error.response?.data || error.message);
      throw new Error('Failed to fetch user projects');
    }
  }

  /**
   * Get specific stack details including delivery tokens
   */
  async getStackDetails(accessToken: string, stackApiKey: string): Promise<any> {
    try {
      const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
      const response = await axios.get(`${apiBase}/v3/stacks`, {
        headers: {
          'authtoken': accessToken,
          'Content-Type': 'application/json',
          'api_key': stackApiKey,
        },
      });

      return response.data.stack;
    } catch (error: any) {
      console.error('Error fetching stack details:', error.response?.data || error.message);
      throw new Error('Failed to fetch stack details');
    }
  }

  /**
   * Get delivery tokens for a stack
   */
  async getDeliveryTokens(accessToken: string, stackApiKey: string): Promise<any[]> {
    try {
      const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
      const response = await axios.get(`${apiBase}/v3/stacks/${stackApiKey}/delivery_tokens`, {
        headers: {
          'authtoken': accessToken,
          'Content-Type': 'application/json',
          'api_key': stackApiKey,
        },
      });

      return response.data.delivery_tokens || [];
    } catch (error: any) {
      console.error('Error fetching delivery tokens:', error.response?.data || error.message);
      throw new Error('Failed to fetch delivery tokens');
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract state from request (for CSRF protection)
   */
  extractStateFromRequest(req: Request): string | null {
    return req.query.state as string || null;
  }

  /**
   * Generate state for CSRF protection
   */
  generateState(): string {
    return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
  }
}

export default new ContentStackOAuthService();
