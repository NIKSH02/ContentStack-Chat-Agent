import { Request, Response, NextFunction } from 'express';
import { jwtUtils, JWTPayload } from '../utils/jwt';
import { User, Tenant, ApiKey } from '../models';
import { Types } from 'mongoose';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId?: string;
      };
      tenant?: {
        id: string;
        name: string;
        domain: string;
        plan: string;
        settings: any;
      };
      apiKey?: {
        id: string;
        name: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens from Authorization header
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Verify the token
    const decoded = jwtUtils.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('+isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Set user in request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: decoded.tenantId
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware to authenticate API keys
 */
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        code: 'API_KEY_REQUIRED'
      });
    }

    // Find the API key in database
    const keyDoc = await ApiKey.findOne({ 
      key: apiKey, 
      isActive: true 
    }).populate('tenantId userId');

    if (!keyDoc) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Check if key is expired
    if (keyDoc.expiresAt && new Date() > keyDoc.expiresAt) {
      return res.status(401).json({
        success: false,
        error: 'API key expired',
        code: 'API_KEY_EXPIRED'
      });
    }

    // Check tenant is active
    const tenant = await Tenant.findById(keyDoc.tenantId);
    if (!tenant || !tenant.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Tenant inactive',
        code: 'TENANT_INACTIVE'
      });
    }

    // Update last used timestamp
    keyDoc.usage.lastUsedAt = new Date();
    keyDoc.usage.totalRequests += 1;
    await keyDoc.save();

    // Set request context
    req.apiKey = {
      id: keyDoc._id.toString(),
      name: keyDoc.name,
      permissions: keyDoc.permissions
    };

    req.tenant = {
      id: tenant._id.toString(),
      name: tenant.name,
      domain: tenant.domain,
      plan: tenant.plan,
      settings: tenant.settings
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to authenticate tenant API keys (simpler version for chat API)
 */
export const authenticateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        code: 'API_KEY_REQUIRED'
      });
    }

    // Find tenant by API key
    const tenant = await Tenant.findOne({ 
      apiKey: apiKey, 
      isActive: true 
    });

    if (!tenant) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Update usage
    tenant.usage.totalRequests += 1;
    tenant.usage.lastRequestAt = new Date();
    await tenant.save();

    // Set tenant in request
    req.tenant = {
      id: tenant._id.toString(),
      name: tenant.name,
      domain: tenant.domain,
      plan: tenant.plan,
      settings: tenant.settings
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to check user roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Middleware to check API key permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key authentication required',
        code: 'API_KEY_REQUIRED'
      });
    }

    if (!req.apiKey.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient API key permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Optional authentication - sets user if token is present but doesn't fail if not
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwtUtils.verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('+isActive');
      
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          tenantId: decoded.tenantId
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
};
