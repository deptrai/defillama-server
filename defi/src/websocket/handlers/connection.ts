import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ConnectionManager } from '../services/ConnectionManager';
import { RoomManager } from '../services/RoomManager';
import { JWTService } from '../services/JWTService';
import { RateLimiter } from '../services/RateLimiter';
import { successResponse } from '../../utils/shared/lambda-response';

const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();
const jwtService = new JWTService();
const rateLimiter = new RateLimiter({
  windowMs: 60000,        // 1 minute
  maxRequests: 100,       // 100 requests per minute
  blockDurationMs: 300000 // 5 minutes block
});

/**
 * Custom error response with status code and headers
 */
function customErrorResponse(statusCode: number, message: string, headers?: Record<string, string>): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify({ message }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  };
}

/**
 * WebSocket Connection Handler
 * Handles connect, disconnect, and message events for WebSocket connections
 */
export const connectHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { connectionId, eventType } = event.requestContext;

  console.log(`WebSocket ${eventType} event for connection ${connectionId}`);

  try {
    switch (eventType) {
      case 'CONNECT':
        return await handleConnect(connectionId!, event);
      
      case 'DISCONNECT':
        return await handleDisconnect(connectionId!);
      
      case 'MESSAGE':
        return await handleMessage(connectionId!, event);
      
      default:
        console.error(`Unknown event type: ${eventType}`);
        return customErrorResponse(400, 'Unknown event type');
    }
  } catch (error) {
    console.error(`Error handling WebSocket event:`, error);
    return customErrorResponse(500, 'Internal server error');
  }
};

/**
 * Handle WebSocket connection establishment
 */
async function handleConnect(connectionId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Check rate limit first
    const rateLimitResult = await rateLimiter.checkAndRecord(connectionId);
    if (!rateLimitResult.allowed) {
      console.log(`Connection ${connectionId} rejected: Rate limit exceeded`);
      return customErrorResponse(429, 'Too many requests', {
        'X-RateLimit-Limit': rateLimiter['config'].maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        'Retry-After': Math.ceil((rateLimitResult.retryAfter || 0) / 1000).toString(),
      });
    }

    // Extract JWT token from query parameters or headers
    const token = event.queryStringParameters?.token ||
                  event.headers?.['Authorization']?.replace('Bearer ', '') ||
                  event.headers?.['authorization']?.replace('Bearer ', '');

    if (!token) {
      console.log(`Connection ${connectionId} rejected: No token provided`);
      return customErrorResponse(401, 'JWT token required');
    }

    // Validate JWT token
    const validationResult = await jwtService.validateToken(token);
    if (!validationResult.valid) {
      console.log(`Connection ${connectionId} rejected: ${validationResult.error}`);
      return customErrorResponse(401, validationResult.error || 'Invalid token');
    }

    const payload = validationResult.payload!;

    // Store connection with user info from JWT
    const connectionData = {
      connectionId,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      subscriptions: [],
      metadata: {
        userAgent: event.headers?.['User-Agent'],
        origin: event.headers?.['Origin'],
        ip: event.requestContext.identity?.sourceIp,
        tokenIssuedAt: payload.iat,
        tokenExpiresAt: payload.exp,
      }
    };

    await connectionManager.addConnection(connectionId, connectionData);

    console.log(`Connection ${connectionId} established for user ${payload.sub}`);
    return successResponse({
      message: 'Connected successfully',
      userId: payload.sub,
      role: payload.role,
      rateLimit: {
        limit: rateLimiter['config'].maxRequests,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      }
    });

  } catch (error) {
    console.error(`Error in handleConnect:`, error);
    return customErrorResponse(500, 'Connection failed');
  }
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId: string): Promise<APIGatewayProxyResult> {
  try {
    // Get connection data before cleanup
    const connectionData = await connectionManager.getConnection(connectionId);

    if (connectionData) {
      // Unsubscribe from all rooms
      for (const subscription of connectionData.subscriptions || []) {
        await roomManager.unsubscribe(connectionId, subscription);
      }
    }

    // Remove connection from manager
    await connectionManager.removeConnection(connectionId);

    console.log(`Connection ${connectionId} disconnected and cleaned up`);
    return successResponse({ message: 'Disconnected successfully' });

  } catch (error) {
    console.error(`Error in handleDisconnect:`, error);
    return customErrorResponse(500, 'Disconnect cleanup failed');
  }
}

/**
 * Handle WebSocket messages
 */
async function handleMessage(connectionId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimiter.checkAndRecord(connectionId);
    if (!rateLimitResult.allowed) {
      return customErrorResponse(429, 'Too many requests', {
        'X-RateLimit-Limit': rateLimiter['config'].maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        'Retry-After': Math.ceil((rateLimitResult.retryAfter || 0) / 1000).toString(),
      });
    }

    if (!event.body) {
      return customErrorResponse(400, 'Message body required');
    }

    const message = JSON.parse(event.body);
    console.log(`Message from ${connectionId}:`, message);

    // Update last heartbeat
    await connectionManager.updateHeartbeat(connectionId);

    switch (message.type) {
      case 'ping':
        return await handlePing(connectionId);

      case 'subscribe':
        return await handleSubscribe(connectionId, message);

      case 'unsubscribe':
        return await handleUnsubscribe(connectionId, message);

      default:
        console.warn(`Unknown message type: ${message.type}`);
        return customErrorResponse(400, 'Unknown message type');
    }

  } catch (error) {
    console.error(`Error in handleMessage:`, error);
    return customErrorResponse(500, 'Message processing failed');
  }
}

/**
 * Handle ping/heartbeat messages
 */
async function handlePing(connectionId: string): Promise<APIGatewayProxyResult> {
  // Send pong response via API Gateway Management API
  const response = {
    type: 'pong',
    timestamp: Date.now()
  };

  // Note: In production, this would use API Gateway Management API to send the response
  // For now, we'll just log and return success
  console.log(`Pong sent to ${connectionId}`);
  return successResponse(response);
}

/**
 * Handle subscription requests
 */
async function handleSubscribe(connectionId: string, message: any): Promise<APIGatewayProxyResult> {
  try {
    const { channels, filters } = message;
    
    if (!channels || !Array.isArray(channels)) {
      return customErrorResponse(400, 'Channels array required');
    }

    const results = [];

    for (const channel of channels) {
      try {
        await roomManager.subscribe(connectionId, channel, filters);
        await connectionManager.addSubscription(connectionId, channel);
        results.push({ channel, status: 'subscribed' });
        console.log(`Connection ${connectionId} subscribed to ${channel}`);
      } catch (error: any) {
        console.error(`Subscription failed for ${channel}:`, error);
        results.push({ channel, status: 'failed', error: error?.message || 'Unknown error' });
      }
    }

    return successResponse({
      type: 'subscription_result',
      results
    });

  } catch (error) {
    console.error(`Error in handleSubscribe:`, error);
    return customErrorResponse(500, 'Subscription failed');
  }
}

/**
 * Handle unsubscription requests
 */
async function handleUnsubscribe(connectionId: string, message: any): Promise<APIGatewayProxyResult> {
  try {
    const { channels } = message;

    if (!channels || !Array.isArray(channels)) {
      return customErrorResponse(400, 'Channels array required');
    }

    const results = [];

    for (const channel of channels) {
      try {
        await roomManager.unsubscribe(connectionId, channel);
        await connectionManager.removeSubscription(connectionId, channel);
        results.push({ channel, status: 'unsubscribed' });
        console.log(`Connection ${connectionId} unsubscribed from ${channel}`);
      } catch (error: any) {
        console.error(`Unsubscription failed for ${channel}:`, error);
        results.push({ channel, status: 'failed', error: error?.message || 'Unknown error' });
      }
    }

    return successResponse({
      type: 'unsubscription_result',
      results
    });

  } catch (error) {
    console.error(`Error in handleUnsubscribe:`, error);
    return customErrorResponse(500, 'Unsubscription failed');
  }
}

// Export individual handlers for serverless.yml configuration
export const disconnectHandler: APIGatewayProxyHandler = async (event) => {
  const { connectionId } = event.requestContext;
  return await handleDisconnect(connectionId!);
};

export const messageHandler: APIGatewayProxyHandler = async (event) => {
  const { connectionId } = event.requestContext;
  return await handleMessage(connectionId!, event);
};
