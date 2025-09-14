import { Request, Response } from 'express';
import { ChatSession, IChatMessage } from '../models/ChatSession';
import { Tenant } from '../models/Tenant';
import { Types } from 'mongoose';
import * as llm from '../services/llm';

export const createChatSession = async (req: Request, res: Response) => {
  try {
    const { tenantId, title, settings } = req.body;
    const userId = req.user?.id;

    // Validate tenant access
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user has access to this tenant
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Create chat session
    const chatSession = new ChatSession({
      tenantId,
      userId,
      title: title || 'New Chat',
      settings: {
        provider: settings?.provider || tenant.settings.defaultProvider,
        model: settings?.model || tenant.settings.defaultModel,
        temperature: settings?.temperature || tenant.settings.temperature,
        maxTokens: settings?.maxTokens || tenant.settings.maxTokens
      }
    });

    await chatSession.save();

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: chatSession._id,
          title: chatSession.title,
          settings: chatSession.settings,
          messageCount: chatSession.analytics.totalMessages,
          createdAt: chatSession.createdAt
        }
      },
      message: 'Chat session created successfully'
    });

  } catch (error: any) {
    console.error('Create chat session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session',
      code: 'CREATE_SESSION_ERROR'
    });
  }
};

export const getChatSessions = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;

    // Validate tenant access
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user has access to this tenant
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Get chat sessions
    const sessions = await ChatSession.find({ tenantId, userId })
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select('title messageCount analytics.duration createdAt updatedAt');

    const totalSessions = await ChatSession.countDocuments({ tenantId, userId });

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          current: Number(page),
          limit: Number(limit),
          total: totalSessions,
          pages: Math.ceil(totalSessions / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat sessions',
      code: 'GET_SESSIONS_ERROR'
    });
  }
};

export const getChatSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    const session = await ChatSession.findById(sessionId)
      .populate('tenantId', 'name domain');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if user owns this session
    if (session.userId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      success: true,
      data: {
        session
      }
    });

  } catch (error: any) {
    console.error('Get chat session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat session',
      code: 'GET_SESSION_ERROR'
    });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message, clientInfo } = req.body;
    const userId = req.user?.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        code: 'MESSAGE_REQUIRED'
      });
    }

    // Get chat session
    const session = await ChatSession.findById(sessionId)
      .populate('tenantId');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if user owns this session
    if (session.userId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Prepare user message
    const userMessage: IChatMessage = {
      id: new Types.ObjectId().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
      metadata: {
        clientInfo: clientInfo || {}
      }
    };

    // Add user message to session
    session.messages.push(userMessage);

    // Get conversation history for LLM
    const conversationHistory = session.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log(`Sending message to ${session.settings.provider}:${session.settings.model}`);
    
    // Send to LLM with fallback
    const result = await llm.sendMessageWithFallback(
      conversationHistory,
      session.settings.provider,
      session.settings.model
    );

    if (result.success) {
      // Prepare assistant message
      const assistantMessage: IChatMessage = {
        id: new Types.ObjectId().toString(),
        role: 'assistant' as const,
        content: result.content || '',
        timestamp: new Date(),
        metadata: {
          provider: result.provider,
          model: result.model,
          tokens: 0
        }
      };

      // Add assistant message to session
      session.messages.push(assistantMessage);

      // Update session analytics
      session.analytics.totalMessages = session.messages.length;
      
      await session.save();

      res.json({
        success: true,
        data: {
          message: assistantMessage,
          session: {
            id: session._id,
            messageCount: session.analytics.totalMessages,
            lastMessageAt: session.updatedAt
          }
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        code: 'LLM_ERROR'
      });
    }

  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      code: 'SEND_MESSAGE_ERROR'
    });
  }
};

export const updateChatSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { title, settings } = req.body;
    const userId = req.user?.id;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if user owns this session
    if (session.userId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Update allowed fields
    if (title) session.title = title;
    if (settings) {
      session.settings = {
        ...session.settings,
        ...settings
      };
    }

    await session.save();

    res.json({
      success: true,
      data: {
        session
      },
      message: 'Chat session updated successfully'
    });

  } catch (error: any) {
    console.error('Update chat session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chat session',
      code: 'UPDATE_SESSION_ERROR'
    });
  }
};

export const deleteChatSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if user owns this session
    if (session.userId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    await ChatSession.findByIdAndDelete(sessionId);

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete chat session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat session',
      code: 'DELETE_SESSION_ERROR'
    });
  }
};

export const getChatAnalytics = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { days = 30 } = req.query;
    const userId = req.user?.id;

    // Validate tenant access
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if user has access to this tenant
    if (tenant.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Get analytics
    const totalSessions = await ChatSession.countDocuments({ 
      tenantId, 
      createdAt: { $gte: daysAgo } 
    });

    const totalMessages = await ChatSession.aggregate([
      { $match: { tenantId: tenant._id, createdAt: { $gte: daysAgo } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } }
    ]);

    const avgDuration = await ChatSession.aggregate([
      { $match: { tenantId: tenant._id, createdAt: { $gte: daysAgo } } },
      { $group: { _id: null, avg: { $avg: '$analytics.duration' } } }
    ]);

    const providerUsage = await ChatSession.aggregate([
      { $match: { tenantId: tenant._id, createdAt: { $gte: daysAgo } } },
      { $group: { _id: '$settings.provider', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        period: {
          days: Number(days),
          from: daysAgo,
          to: new Date()
        },
        metrics: {
          totalSessions,
          totalMessages: totalMessages[0]?.total || 0,
          averageDuration: avgDuration[0]?.avg || 0,
          providerUsage: providerUsage.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });

  } catch (error: any) {
    console.error('Get chat analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      code: 'GET_ANALYTICS_ERROR'
    });
  }
};
