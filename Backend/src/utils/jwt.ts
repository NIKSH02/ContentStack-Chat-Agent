import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class JWTUtils {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret-key';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

    /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const options: SignOptions = {
      expiresIn: this.accessTokenExpiry as any,
      issuer: 'chat-agent-platform',
      audience: 'chat-agent-users'
    };
    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const options: SignOptions = {
      expiresIn: this.refreshTokenExpiry as any,
      issuer: 'chat-agent-platform',
      audience: 'chat-agent-users'
    };
    return jwt.sign(payload, this.refreshTokenSecret, options);
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'chat-agent-platform',
        audience: 'chat-agent-users'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'chat-agent-platform',
        audience: 'chat-agent-users'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return new Date() > expiry;
  }

  /**
   * Generate API key style token (for tenant API keys)
   */
  generateApiKeyToken(tenantId: Types.ObjectId, keyId: Types.ObjectId): string {
    const payload = {
      tenantId: tenantId.toString(),
      keyId: keyId.toString(),
      type: 'api-key'
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: '1y', // API keys are long-lived
      issuer: 'chat-agent-platform',
      audience: 'chat-agent-api'
    });
  }

  /**
   * Verify API key token
   */
  verifyApiKeyToken(token: string): { tenantId: string; keyId: string; type: string } {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'chat-agent-platform',
        audience: 'chat-agent-api'
      }) as { tenantId: string; keyId: string; type: string };
    } catch (error) {
      throw new Error('Invalid API key token');
    }
  }
}

export const jwtUtils = new JWTUtils();
