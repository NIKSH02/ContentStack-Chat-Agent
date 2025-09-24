import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import http from 'http';
import url from 'url';

interface OAuthConfig {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_issued_at?: number;
  region?: string;
  user_uid?: string;
  organization_uid?: string;
  code_verifier?: string;
  code_challenge?: string;
}

interface OAuthState {
  codeVerifier: string;
  codeChallenge: string;
  sessionId: string;
}

export class MCPOAuthController {
  // ContentStack OAuth configuration for EU region
  private readonly appId = process.env.CONTENTSTACK_OAUTH_APP_ID ?? '68340a606295230012cb88fd';
  private readonly clientId = process.env.CONTENTSTACK_OAUTH_CLIENT_ID ?? 'cGQZujH3Y_oYkf59';
  private readonly redirectUri = process.env.CONTENTSTACK_OAUTH_REDIRECT_URI ?? 'http://localhost:8184';
  private readonly region = 'EU'; // Fixed to EU region as requested
  private readonly oauthBaseUrl = 'https://eu-app.contentstack.com';
  private readonly devHubUrl = 'https://eu-developerhub-api.contentstack.com/apps';
  private readonly responseType = 'code';
  private readonly port = 8184;
  
  // Store OAuth states temporarily (in production, use Redis or similar)
  private oauthStates = new Map<string, OAuthState>();
  
  // Store active OAuth servers and their completion status
  private activeServers = new Map<string, http.Server>();
  private authCompletionStatus = new Map<string, { completed: boolean; tokenData?: any; error?: string }>();

  constructor() {}

  private getConfigDir(): string {
    const platform = process.platform;
    const dirName = 'ContentstackMCP';
    
    if (platform === 'win32') {
      return path.join(os.homedir(), 'AppData', 'Local', dirName);
    } else if (platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', dirName);
    } else {
      return path.join(os.homedir(), '.config', dirName);
    }
  }

  private getConfigFile(sessionId: string): string {
    const configDir = this.getConfigDir();
    return path.join(configDir, `oauth-config-${sessionId}.json`);
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      const configDir = this.getConfigDir();
      await fs.mkdir(configDir, { recursive: true });
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied when creating config directory. Please check your permissions.`);
      }
      throw error;
    }
  }

  private generateCodeVerifier(length: number = 128): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    return Array.from(
      { length },
      () => charset.charAt(Math.floor(Math.random() * charset.length))
    ).join('');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(codeVerifier);
    const hashBuffer = hash.digest();
    const base64String = hashBuffer.toString('base64');
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private createOAuthServer(sessionId: string): http.Server {
    let requestHandled = false;
    
    const server = http.createServer(async (req, res) => {
      if (req.url === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (requestHandled) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h3>Request already processed.</h3><p>You can close this window and return to the application.</p></body></html>'
        );
        return;
      }

      const queryObject = url.parse(req.url ?? '', true).query;
      if (!queryObject.code) {
        console.error('Error occurred while logging in with OAuth. No authorization code received.');
        this.sendErrorResponse(res);
        this.authCompletionStatus.set(sessionId, { 
          completed: true, 
          error: 'No authorization code received' 
        });
        return;
      }

      requestHandled = true;
      console.log('Authorization code successfully received for session:', sessionId);

      try {
        const oauthState = this.oauthStates.get(sessionId);
        if (!oauthState) {
          throw new Error('Invalid or expired OAuth state');
        }

        const tokenData = await this.performTokenExchange(queryObject.code as string, oauthState.codeVerifier);
        
        // Save configuration
        await this.saveConfig(sessionId, {
          ...tokenData,
          region: this.region,
          token_issued_at: Date.now()
        });

        // Update completion status
        this.authCompletionStatus.set(sessionId, { 
          completed: true, 
          tokenData: {
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type
          }
        });

        this.sendSuccessResponse(res, sessionId);
        
        // Clean up after a delay
        setTimeout(() => {
          this.cleanupOAuthSession(sessionId);
        }, 2000);

      } catch (error: any) {
        console.error('Error exchanging code for token:', error.message);
        this.sendErrorResponse(res);
        this.authCompletionStatus.set(sessionId, { 
          completed: true, 
          error: error.message 
        });
        
        setTimeout(() => {
          this.cleanupOAuthSession(sessionId);
        }, 2000);
      }
    });

    server.listen(this.port, () => {
      console.log(`OAuth server started on port ${this.port} for session ${sessionId}`);
    });

    server.on('error', (err: any) => {
      console.error('OAuth server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${this.port} is already in use. Trying to reuse existing server.`);
      }
      this.authCompletionStatus.set(sessionId, { 
        completed: true, 
        error: `Server error: ${err.message}` 
      });
    });

    return server;
  }

  private cleanupOAuthSession(sessionId: string): void {
    // Clean up OAuth state
    this.oauthStates.delete(sessionId);
    
    // Close and remove server
    const server = this.activeServers.get(sessionId);
    if (server && server.listening) {
      server.close(() => {
        console.log(`OAuth server closed for session ${sessionId}`);
      });
    }
    this.activeServers.delete(sessionId);
    
    // Keep completion status for a while for status checking
    setTimeout(() => {
      this.authCompletionStatus.delete(sessionId);
    }, 30000); // Keep for 30 seconds
  }

  private sendSuccessResponse(res: http.ServerResponse, sessionId: string): void {
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ContentStack MCP - Authorization Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
          h1 { color: #6c5ce7; }
          p { color: #475161; margin-bottom: 20px; }
          .session-id { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 20px auto; width: fit-content; font-family: monospace; }
          a { color: #6c5ce7; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>Successfully authorized!</h1>
        <p style="font-size: 16px; font-weight: 600">You can close this window and return to your application.</p>
        <div class="session-id">
          <strong>Session ID:</strong> ${sessionId}
        </div>
        <p>Use this Session ID in your application to access ContentStack MCP services.</p>
        <p>
          You can review the access permissions on the
          <a href="${this.oauthBaseUrl}/#!/marketplace/authorized-apps" target="_blank">Authorized Apps page</a>.
        </p>
      </body>
      </html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(successHtml);
  }

  private sendErrorResponse(res: http.ServerResponse): void {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ContentStack MCP - Authorization Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
          h1 { color: #e74c3c; }
          p { color: #475161; }
        </style>
      </head>
      <body>
        <h1>Authentication Failed</h1>
        <p>Please try again by restarting the authorization process.</p>
      </body>
      </html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(errorHtml);
  }

  private async saveConfig(sessionId: string, config: OAuthConfig): Promise<void> {
    await this.ensureConfigDir();
    const configFile = this.getConfigFile(sessionId);
    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
  }

  private async loadConfig(sessionId: string): Promise<OAuthConfig | null> {
    try {
      const configFile = this.getConfigFile(sessionId);
      const data = await fs.readFile(configFile, 'utf8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  // Start OAuth flow - Generate authorization URL (GET /api/mcp/oauth/start)
  public async startOAuthFlow(req: Request, res: Response): Promise<Response | void> {
    try {
      const sessionId = crypto.randomUUID();
      
      // Always use the configured redirect URI that matches the MCP app configuration
      const finalRedirectUri = this.redirectUri;
      
      // Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Store OAuth state temporarily
      this.oauthStates.set(sessionId, {
        codeVerifier,
        codeChallenge,
        sessionId
      });
      
      // Initialize auth completion status
      this.authCompletionStatus.set(sessionId, { completed: false });
      
      // Create HTTP server on port 8184 to handle OAuth callback
      const server = this.createOAuthServer(sessionId);
      this.activeServers.set(sessionId, server);
      
      // Create authorization URL
      const authUrl = new URL(`${this.oauthBaseUrl}/#!/apps/${this.appId}/authorize`);
      authUrl.searchParams.set('response_type', this.responseType);
      authUrl.searchParams.set('client_id', this.clientId);
      authUrl.searchParams.set('redirect_uri', finalRedirectUri);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', sessionId);
      
      res.json({
        success: true,
        authorizationUrl: authUrl.toString(),
        sessionId,
        redirectUri: finalRedirectUri,
        message: 'Authorization server started on port 8184. Complete the authorization in your browser.'
      });
    } catch (error: any) {
      console.error('OAuth start error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start OAuth flow',
        message: error.message
      });
    }
  }

  public async handleOAuthCallback(req: Request, res: Response): Promise<Response | void> {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'OAuth authorization failed',
          message: error as string
        });
      }
      
      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'Missing authorization code or state'
        });
      }
      
      const sessionId = state as string;
      const oauthState = this.oauthStates.get(sessionId);
      
      if (!oauthState) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OAuth state'
        });
      }
      
      // Exchange code for tokens
      const tokenData = await this.exchangeCodeForToken(code as string, oauthState.codeVerifier, req);
      
      // Save configuration
      await this.saveConfig(sessionId, {
        ...tokenData,
        region: this.region,
        token_issued_at: Date.now()
      });
      
      // Clean up OAuth state
      this.oauthStates.delete(sessionId);
      
      // Return success response or redirect
      if (req.query.format === 'json') {
        res.json({
          success: true,
          message: 'OAuth authorization successful',
          sessionId,
          tokenData: {
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type
          }
        });
      } else {
        // Return HTML success page
        const successHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>ContentStack MCP - Authorization Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
              h1 { color: #6c5ce7; }
              p { color: #475161; margin-bottom: 20px; }
              .session-id { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 20px auto; width: fit-content; }
              a { color: #6c5ce7; text-decoration: none; }
            </style>
          </head>
          <body>
            <h1>Successfully authorized!</h1>
            <p style="font-size: 16px; font-weight: 600">Authorization complete. You can close this window.</p>
            <div class="session-id">
              <strong>Session ID:</strong> ${sessionId}
            </div>
            <p>Use this Session ID in your application to access ContentStack MCP services.</p>
            <p>
              You can review the access permissions on the
              <a href="${this.oauthBaseUrl}/#!/marketplace/authorized-apps" target="_blank">Authorized Apps page</a>.
            </p>
          </body>
          </html>
        `;
        res.send(successHtml);
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete OAuth flow',
        message: error.message
      });
    }
  }

  private async performTokenExchange(code: string, codeVerifier: string): Promise<any> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code_verifier: codeVerifier,
      redirect_uri: this.redirectUri,
      code
    });

    try {
      const response = await axios.post(`${this.devHubUrl}/token`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokenData = response.data;
      if (!tokenData.access_token) {
        throw new Error('Invalid token response');
      }

      return tokenData;
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  private async exchangeCodeForToken(code: string, codeVerifier: string, req: Request): Promise<any> {
    return this.performTokenExchange(code, codeVerifier);
  }

  // Refresh access token using refresh token (POST /api/mcp/oauth/refresh)
  public async refreshToken(req: Request, res: Response): Promise<Response | void> {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID required'
        });
      }
      
      const config = await this.loadConfig(sessionId);
      if (!config || !config.refresh_token) {
        return res.status(404).json({
          success: false,
          error: 'No refresh token found for session'
        });
      }
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: config.refresh_token,
        redirect_uri: this.redirectUri
      });

      const response = await axios.post(`${this.devHubUrl}/token`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokenData = response.data;
      if (!tokenData.access_token) {
        throw new Error('Invalid token response');
      }

      // Update stored configuration
      await this.saveConfig(sessionId, {
        ...config,
        ...tokenData,
        refresh_token: tokenData.refresh_token ?? config.refresh_token,
        token_issued_at: Date.now()
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        tokenData: {
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type
        }
      });
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh access token',
        message: error.message
      });
    }
  }

  public async getOAuthStatus(req: Request, res: Response): Promise<Response | void> {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID required'
        });
      }
      
      const config = await this.loadConfig(sessionId);
      if (!config || !config.access_token) {
        return res.json({
          success: true,
          authenticated: false,
          message: 'No active session found'
        });
      }
      
      // Check token expiry
      const now = Date.now();
      const expiryTime = (config.token_issued_at || 0) + (config.expires_in || 0) * 1000;
      const isExpired = now >= expiryTime;
      const expiresIn = Math.max(0, Math.floor((expiryTime - now) / 1000));
      
      res.json({
        success: true,
        authenticated: true,
        isExpired,
        expiresIn,
        region: config.region,
        user_uid: config.user_uid,
        organization_uid: config.organization_uid
      });
    } catch (error: any) {
      console.error('OAuth status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get OAuth status',
        message: error.message
      });
    }
  }

  public async logout(req: Request, res: Response): Promise<Response | void> {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID required'
        });
      }
      
      const config = await this.loadConfig(sessionId);
      if (!config || !config.access_token) {
        return res.json({
          success: true,
          message: 'No active session found'
        });
      }
      
      // Try to revoke OAuth app authorization
      try {
        if (config.user_uid && config.organization_uid) {
          const authorizationId = await this.getOAuthAppAuthorization(
            config.access_token,
            config.user_uid,
            config.organization_uid
          );
          
          if (authorizationId) {
            await this.revokeOAuthAppAuthorization(
              authorizationId,
              config.access_token,
              config.organization_uid
            );
          }
        }
      } catch (error: any) {
        console.warn(`Error revoking OAuth app authorization: ${error.message}`);
      }
      
      // Remove local configuration
      try {
        const configFile = this.getConfigFile(sessionId);
        await fs.unlink(configFile);
      } catch (error: any) {
        // File might not exist, ignore error
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to logout',
        message: error.message
      });
    }
  }

  private async getOAuthAppAuthorization(accessToken: string, userUid: string, organizationUid: string): Promise<string | null> {
    try {
      const headers = {
        authorization: `Bearer ${accessToken}`,
        organization_uid: organizationUid,
        'Content-type': 'application/json'
      };

      const response = await axios.get(
        `https://eu-developerhub-api.contentstack.com/manifests/${this.appId}/authorizations`,
        { headers }
      );

      const data = response.data;
      if (data?.data?.length > 0) {
        const currentUserAuthorization = data.data.filter(
          (element: any) => element.user.uid === userUid
        );
        
        if (currentUserAuthorization.length === 0) {
          return null;
        }
        
        return currentUserAuthorization[0].authorization_uid;
      }
      
      return null;
    } catch (error: any) {
      console.error(`Error getting OAuth app authorizations: ${error.message}`);
      throw error;
    }
  }

  private async revokeOAuthAppAuthorization(authorizationId: string, accessToken: string, organizationUid: string): Promise<void> {
    if (!authorizationId || authorizationId.length < 1) {
      throw new Error('Invalid authorization ID');
    }

    try {
      const headers = {
        authorization: `Bearer ${accessToken}`,
        organization_uid: organizationUid,
        'Content-type': 'application/json'
      };

      await axios.delete(
        `https://eu-developerhub-api.contentstack.com/manifests/${this.appId}/authorizations/${authorizationId}`,
        { headers }
      );
    } catch (error: any) {
      console.error(`Error revoking OAuth app authorization: ${error.message}`);
      throw error;
    }
  }

  // Check OAuth completion status - GET /api/mcp/oauth/check/:sessionId - /
  public async checkOAuthCompletion(req: Request, res: Response): Promise<Response | void> {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID required'
        });
      }
      
      const status = this.authCompletionStatus.get(sessionId);
      if (!status) {
        return res.json({
          success: true,
          completed: false,
          message: 'OAuth flow not started or expired'
        });
      }
      
      if (status.completed && status.error) {
        return res.json({
          success: false,
          completed: true,
          error: status.error
        });
      }
      
      if (status.completed && status.tokenData) {
        return res.json({
          success: true,
          completed: true,
          message: 'OAuth authorization successful',
          tokenData: status.tokenData
        });
      }
      
      // Still in progress
      res.json({
        success: true,
        completed: false,
        message: 'OAuth authorization in progress'
      });
    } catch (error: any) {
      console.error('OAuth check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check OAuth status',
        message: error.message
      });
    }
  }

  // Get authentication headers for MCP API calls (GET /api/mcp/oauth/headers/:sessionId)
  public async getAuthHeaders(req: Request, res: Response): Promise<Response | void> {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID required'
        });
      }
      
      const config = await this.ensureValidToken(sessionId);
      if (!config) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated. Please authorize first.'
        });
      }
      
      res.json({
        success: true,
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          organization_uid: config.organization_uid
        }
      });
    } catch (error: any) {
      console.error('Get auth headers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get authentication headers',
        message: error.message
      });
    }
  }

  private async ensureValidToken(sessionId: string): Promise<OAuthConfig | null> {
    const config = await this.loadConfig(sessionId);
    if (!config || !config.access_token) {
      return null;
    }

    const now = Date.now();
    const expiryTime = (config.token_issued_at || 0) + (config.expires_in || 0) * 1000;

    // Refresh token if it expires in the next 5 minutes
    if (now >= expiryTime - 5 * 60 * 1000) {
      return await this.performTokenRefresh(sessionId, config);
    }

    return config;
  }

  // Perform token refresh - /
  private async performTokenRefresh(sessionId: string, config: OAuthConfig): Promise<OAuthConfig | null> {
    if (!config.refresh_token) {
      return null;
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: config.refresh_token,
      redirect_uri: this.redirectUri
    });

    try {
      const response = await axios.post(`${this.devHubUrl}/token`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokenData = response.data;
      if (!tokenData.access_token) {
        throw new Error('Invalid token response');
      }

      const updatedConfig = {
        ...config,
        ...tokenData,
        refresh_token: tokenData.refresh_token ?? config.refresh_token,
        token_issued_at: Date.now()
      };

      await this.saveConfig(sessionId, updatedConfig);
      return updatedConfig;
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      return null;
    }
  }
}

export const mcpOAuthController = new MCPOAuthController();