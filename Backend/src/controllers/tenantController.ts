import { Request, Response } from 'express';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { ApiKey } from '../models/ApiKey';
import { jwtUtils } from '../utils/jwt';

export const createTenant = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      domain, 
      plan = 'free',
      contentstack: {
        projectId,
        stackApiKey,
        cdaApiKey,
        region = 'US',
        environment = 'production',
        baseUrl
      } = {}
    } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!name || !domain || !projectId || !stackApiKey || !cdaApiKey) {
      return res.status(400).json({
        success: false,
        error: 'Name, domain, ContentStack projectId, stackApiKey, and cdaApiKey are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if domain already exists
    const existingTenant = await Tenant.findOne({ domain });
    if (existingTenant) {
      return res.status(409).json({
        success: false,
        error: 'Domain already exists',
        code: 'DOMAIN_EXISTS'
      });
    }

    // Check if ContentStack project already exists
    const existingProject = await Tenant.findOne({ 'contentstack.projectId': projectId });
    if (existingProject) {
      return res.status(409).json({
        success: false,
        error: 'ContentStack project already registered',
        code: 'PROJECT_EXISTS'
      });
    }

    // Create tenant
    const tenant = new Tenant({
      name,
      domain,
      createdBy: userId,
      plan,
      contentstack: {
        projectId,
        stackApiKey,
        cdaApiKey,
        region,
        environment,
        baseUrl
      },
      settings: {
        defaultProvider: 'groq',
        defaultModel: 'llama-3.1-8b-instant',
        temperature: 0.7,
        maxTokens: 1000,
        allowedProviders: ['groq', 'gemini', 'openrouter'],
        rateLimits: {
          requestsPerMinute: plan === 'free' ? 10 : plan === 'pro' ? 100 : 1000,
          requestsPerDay: plan === 'free' ? 100 : plan === 'pro' ? 1000 : 10000
        },
        features: {
          streaming: true,
          fileUpload: plan !== 'free',
          analytics: true
        }
      }
    });

    await tenant.save();

    // Add tenant to user's tenant list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { tenants: tenant._id }
    });

    // Create default API key
    const apiKey = new ApiKey({
      tenantId: tenant._id,
      userId: userId,
      name: 'Default API Key',
      permissions: ['chat', 'read']
    });

    await apiKey.save();

    res.status(201).json({
      success: true,
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          domain: tenant.domain,
          plan: tenant.plan,
          settings: tenant.settings,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt
        },
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          key: apiKey.key,
          permissions: apiKey.permissions
        }
      },
      message: 'Tenant created successfully'
    });

  } catch (error: any) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tenant',
      code: 'CREATE_TENANT_ERROR'
    });
  }
};

export const getTenants = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    // Find user's tenants
    const user = await User.findById(userId).populate({
      path: 'tenants',
      options: {
        skip: (Number(page) - 1) * Number(limit),
        limit: Number(limit),
        sort: { createdAt: -1 }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get total count for pagination
    const totalTenants = await Tenant.countDocuments({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    });

    res.json({
      success: true,
      data: {
        tenants: user.tenants,
        pagination: {
          current: Number(page),
          limit: Number(limit),
          total: totalTenants,
          pages: Math.ceil(totalTenants / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tenants',
      code: 'GET_TENANTS_ERROR'
    });
  }
};

export const getTenant = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user?.id;

    const tenant = await Tenant.findById(tenantId)
      .populate('createdBy', 'name email');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user has access to this tenant (only created by this user for now)
    if (tenant.createdBy._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      success: true,
      data: {
        tenant
      }
    });

  } catch (error: any) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant',
      code: 'GET_TENANT_ERROR'
    });
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { name, domain, settings } = req.body;
    const userId = req.user?.id;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only tenant creator can update settings',
        code: 'ACCESS_DENIED'
      });
    }

    // Update allowed fields
    if (name) tenant.name = name;
    if (domain && domain !== tenant.domain) {
      // Check if new domain is available
      const existingTenant = await Tenant.findOne({ domain, _id: { $ne: tenantId } });
      if (existingTenant) {
        return res.status(409).json({
          success: false,
          error: 'Domain already exists',
          code: 'DOMAIN_EXISTS'
        });
      }
      tenant.domain = domain;
    }
    if (settings) {
      tenant.settings = {
        ...tenant.settings,
        ...settings
      };
    }

    await tenant.save();

    res.json({
      success: true,
      data: {
        tenant
      },
      message: 'Tenant updated successfully'
    });

  } catch (error: any) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tenant',
      code: 'UPDATE_TENANT_ERROR'
    });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user?.id;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only tenant creator can delete tenant',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete related API keys
    await ApiKey.deleteMany({ tenantId: tenantId });

    // Remove tenant from users' tenant lists
    await User.updateMany(
      { tenants: tenantId },
      { $pull: { tenants: tenantId } }
    );

    // Delete tenant
    await Tenant.findByIdAndDelete(tenantId);

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tenant',
      code: 'DELETE_TENANT_ERROR'
    });
  }
};

export const getTenantApiKeys = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user?.id;

    // Check if user has access to this tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Get API keys for this tenant
    const apiKeys = await ApiKey.find({ tenantId: tenantId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        apiKeys: apiKeys.map(key => ({
          id: key._id,
          name: key.name,
          key: key.key,
          permissions: key.permissions,
          isActive: key.isActive,
          lastUsed: key.usage.lastUsedAt,
          createdBy: key.userId,
          createdAt: key.createdAt
        }))
      }
    });

  } catch (error: any) {
    console.error('Get tenant API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API keys',
      code: 'GET_API_KEYS_ERROR'
    });
  }
};

export const createApiKey = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { name, permissions = ['chat'] } = req.body;
    const userId = req.user?.id;

    // Check if user has access to this tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Create API key
    const apiKey = new ApiKey({
      tenantId: tenantId,
      userId: userId,
      name: name || `API Key ${Date.now()}`,
      permissions
    });

    await apiKey.save();

    res.status(201).json({
      success: true,
      data: {
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          key: apiKey.key,
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          createdAt: apiKey.createdAt
        }
      },
      message: 'API key created successfully'
    });

  } catch (error: any) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      code: 'CREATE_API_KEY_ERROR'
    });
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const { tenantId, keyId } = req.params;
    const userId = req.user?.id;

    // Check if user has access to this tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete API key
    const apiKey = await ApiKey.findOneAndDelete({
      _id: keyId,
      tenantId: tenantId
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key',
      code: 'DELETE_API_KEY_ERROR'
    });
  }
};
