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
  content_types?: Array<{     //from here to 
    uid: string;
    title: string;
    schema?: any;
  }>;
  entries?: Array<{
    uid: string;
    title: string;
    content_type: string;
    locale: string;
  }>;
  assets?: Array<{
    uid: string;
    title: string;
    filename: string;
    url: string;
    content_type: string;
  }>;                       // here can be deleted if not implemented
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
   * Get specific stack details including delivery tokens, content, and assets
   */
  async getStackDetails(accessToken: string, stackApiKey: string): Promise<ContentStackStack> {
    try {
      const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
      const response = await axios.get(`${apiBase}/v3/stacks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'api_key': stackApiKey,
        },
      });

      const stack = response.data.stack;
      
      // OAuth tokens from Developer Hub apps have limited scope
      // They cannot access Management API endpoints for content/assets
      console.log(`OAuth token has limited scope - stack details available but not content/assets for: ${stack.name} (${stackApiKey})`);

      return {
        uid: stack.uid,
        name: stack.name,
        description: stack.description || '',
        master_locale: stack.master_locale,
        api_key: stackApiKey,
        organization_uid: stack.org_uid,
        settings: stack.settings || {},
        content_types: [], // OAuth tokens cannot access content types
        entries: [],       // OAuth tokens cannot access entries  
        assets: []         // OAuth tokens cannot access assets
      };
    } catch (error: any) {
      console.error('Error fetching stack details:', error.response?.data || error.message);
      throw new Error('Failed to fetch stack details');
    }
  }

  // /**
  //  * Get delivery tokens for a stack
  //  */
  // async getDeliveryTokens(accessToken: string, stackApiKey: string): Promise<any[]> {
  //   try {
  //     const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
  //     const response = await axios.get(`${apiBase}/v3/stacks/${stackApiKey}/delivery_tokens`, {
  //       headers: {
  //         'authtoken': accessToken,
  //         'Content-Type': 'application/json',
  //         'api_key': stackApiKey,
  //       },
  //     });

  //     return response.data.delivery_tokens || [];
  //   } catch (error: any) {
  //     console.error('Error fetching delivery tokens:', error.response?.data || error.message);
  //     throw new Error('Failed to fetch delivery tokens');
  //   }
  // }

  /**
   * Get content types for a specific stack
   */
  async getStackContentTypes(accessToken: string, stackApiKey: string): Promise<any[]> {
    try {
      const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
      const response = await axios.get(`${apiBase}/v3/content_types`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'api_key': stackApiKey,
        },
        params: {
          include_count: false,
          include_global_field_schema: false
        }
      });

      return response.data.content_types || [];
    } catch (error: any) {
      console.warn('Could not fetch content types:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get all entries for a specific stack (with pagination support)
   */
  async getStackEntries(accessToken: string, stackApiKey: string, limit: number = 100): Promise<any[]> {
    try {
      const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
      const allEntries: any[] = [];
      let skip = 0;
      let hasMore = true;

      while (hasMore && allEntries.length < 1000) { // Safety limit
        const response = await axios.get(`${apiBase}/v3/entries`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'api_key': stackApiKey,
          },
          params: {
            include_count: true,
            include_publish_details: false,
            include_workflow: false,
            limit: Math.min(limit, 100),
            skip: skip
          }
        });

        const entries = response.data.entries || [];
        allEntries.push(...entries);
        
        hasMore = entries.length === limit && response.data.count > (skip + limit);
        skip += limit;
      }

      return allEntries;
    } catch (error: any) {
      console.warn('Could not fetch entries:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get all assets for a specific stack (with pagination support)
   */
  async getStackAssets(accessToken: string, stackApiKey: string, limit: number = 100): Promise<any[]> {
    try {
      const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
      const allAssets: any[] = [];
      let skip = 0;
      let hasMore = true;

      while (hasMore && allAssets.length < 1000) { // Safety limit
        const response = await axios.get(`${apiBase}/v3/assets`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'api_key': stackApiKey,
          },
          params: {
            include_count: true,
            include_publish_details: false,
            limit: Math.min(limit, 100),
            skip: skip
          }
        });

        const assets = response.data.assets || [];
        allAssets.push(...assets);
        
        hasMore = assets.length === limit && response.data.count > (skip + limit);
        skip += limit;
      }

      return allAssets;
    } catch (error: any) {
      console.warn('Could not fetch assets:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetch organization stacks when we have user-level OAuth access
   * This is used when authorization_type is 'user' and stack_api_key is empty
   */
  async getOrganizationStacks(accessToken: string, organizationUid: string): Promise<ContentStackStack[]> {
    try {
      console.log(`Fetching stacks for organization ${organizationUid}...`);
      
      // Try OAuth-compatible Apps API first
      try {
        const response = await axios.get(`${this.baseUrl}/apps-api/organizations/${organizationUid}/stacks`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Organization stacks response (Apps API):', response.data);
        
        if (response.data.stacks && Array.isArray(response.data.stacks)) {
          const stacks = await Promise.all(response.data.stacks.map(async (stack: any) => {
            const stackData: ContentStackStack = {
              uid: stack.uid,
              name: stack.name || stack.stack_name,
              description: stack.description || '',
              master_locale: stack.master_locale || 'en-us',
              api_key: stack.api_key,
              organization_uid: organizationUid,
              settings: stack.settings || {}
            };

            // OAuth tokens from Developer Hub apps have limited scope
            // They cannot access Management API endpoints for content/assets
            console.log(`OAuth token has limited scope - cannot fetch detailed content/assets for stack: ${stack.name}`);
            
            // Set empty arrays since we can't fetch this data with OAuth tokens
            stackData.content_types = [];
            stackData.entries = [];
            stackData.assets = [];
            
            console.log(`Stack ${stack.name}: OAuth scope limited - content/asset data not available`)

            return stackData;
          }));

          return stacks;
        }
      } catch (appsApiError: any) {
        console.warn('Apps API failed, trying Management API:', appsApiError.response?.data || appsApiError.message);
      }
      
      // Fallback to Management API
      try {
        const apiBase = this.baseUrl.replace('eu-app.contentstack.com', 'eu-api.contentstack.com');
        const response = await axios.get(`${apiBase}/v3/stacks`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            organization_uid: organizationUid,
            include_collaborators: false,
            include_stack_variables: false,
            include_discrete_variables: false,
            include_count: false
          }
        });
        
        console.log('Organization stacks response (Management API):', response.data);
        
        const stacks = response.data.stacks || [];
        const enrichedStacks = await Promise.all(stacks.map(async (stack: any) => {
          const stackData: ContentStackStack = {
            uid: stack.uid,
            name: stack.name,
            description: stack.description || '',
            master_locale: stack.master_locale || 'en-us',
            api_key: stack.api_key,
            organization_uid: stack.org_uid || organizationUid,
            settings: stack.settings || {}
          };

          // OAuth tokens from Developer Hub apps have limited scope
          // They cannot access Management API endpoints for content/assets
          console.log(`OAuth token has limited scope - cannot fetch detailed content/assets for stack: ${stack.name}`);
          
          // Set empty arrays since we can't fetch this data with OAuth tokens
          stackData.content_types = [];
          stackData.entries = [];
          stackData.assets = [];
          
          console.log(`Stack ${stack.name}: OAuth scope limited - content/asset data not available`)

          return stackData;
        }));

        return enrichedStacks;
      } catch (managementApiError: any) {
        console.error('Management API also failed:', managementApiError.response?.data || managementApiError.message);
      }
      
      // If both APIs fail, return empty array but don't throw
      console.warn('Could not fetch organization stacks, returning empty array');
      return [];
      
    } catch (error: any) {
      console.error('Error fetching organization stacks:', error.response?.data || error.message);
      // Return empty array instead of throwing to prevent OAuth flow failure
      return [];
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
