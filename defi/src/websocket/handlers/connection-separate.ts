import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ConnectionManager } from '../services/ConnectionManager';
import { RoomManager } from '../services/RoomManager';
import { AuthService } from '../services/AuthService';
import { successResponse, errorResponse } from '../../utils/shared/lambda-response';
import { WebSocketConnectionEvent, ConnectionHandlerResult, WebSocketMessage } from './types';

const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();
const authService = new AuthService();

/**
 * WebSocket Connect Handler
 * Handles WebSocket connection establishment with API key authentication
 */
export const connectHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { connectionId } = event.requestContext;
  
  console.log(`WebSocket CONNECT event for connection ${connectionId}`);

  try {
    // Extract API key from event
    const apiKey = authService.extractApiKey(event);
    
    if (!apiKey) {
      console.log(`Connection ${connectionId} rejected: No API key provided`);
      return errorResponse(401, 'API key required');
    }

    // Validate API key
    const validation = await authService.validateApiKey(apiKey);
    if (!validation.isValid) {
      console.log(`Connection ${connectionId} rejected: ${validation.error}`);
      return errorResponse(401, validation.error || 'Invalid API key');
    }

    // Store connection with metadata
    const connectionData = {
      connectionId: connectionId!,
      apiKey,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      subscriptions: [],
      metadata: {
        userAgent: event.headers?.['User-Agent'],
        origin: event.headers?.['Origin'],
        ip: event.requestContext.identity?.sourceIp
      }
    };

    await connectionManager.addConnection(connectionId!, connectionData);
    
    console.log(`Connection ${connectionId} established successfully`);
    return successResponse({ 
      message: 'Connected successfully',
      connectionId,
      permissions: validation.keyData?.permissions || []
    });

  } catch (error) {
    console.error(`Error in connectHandler:`, error);
    return errorResponse(500, 'Connection failed');
  }
};

/**
 * WebSocket Disconnect Handler
 * Handles WebSocket connection termination and cleanup
 */
export const disconnectHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { connectionId } = event.requestContext;
  
  console.log(`WebSocket DISCONNECT event for connection ${connectionId}`);

  try {
    // Get connection data before removal
    const connection = await connectionManager.getConnection(connectionId!);
    
    if (connection) {
      // Clean up subscriptions
      for (const subscription of connection.subscriptions) {
        await roomManager.unsubscribe(connectionId!, subscription);
      }
    }

    // Remove connection
    await connectionManager.removeConnection(connectionId!);
    
    console.log(`Connection ${connectionId} disconnected and cleaned up`);
    return successResponse({ message: 'Disconnected successfully' });

  } catch (error) {
    console.error(`Error in disconnectHandler:`, error);
    return errorResponse(500, 'Disconnect failed');
  }
};

/**
 * WebSocket Message Handler
 * Handles incoming WebSocket messages (ping, subscribe, unsubscribe)
 */
export const messageHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { connectionId } = event.requestContext;
  
  console.log(`WebSocket MESSAGE event for connection ${connectionId}`);

  try {
    if (!event.body) {
      return errorResponse(400, 'Message body required');
    }

    const message: WebSocketMessage = JSON.parse(event.body);
    console.log(`Message from ${connectionId}:`, message);

    // Update last heartbeat
    await connectionManager.updateHeartbeat(connectionId!);

    switch (message.type) {
      case 'ping':
        return await handlePing(connectionId!);
      
      case 'subscribe':
        return await handleSubscribe(connectionId!, message);
      
      case 'unsubscribe':
        return await handleUnsubscribe(connectionId!, message);
      
      default:
        console.warn(`Unknown message type: ${message.type}`);
        return errorResponse(400, 'Unknown message type');
    }

  } catch (error) {
    console.error(`Error in messageHandler:`, error);
    return errorResponse(500, 'Message handling failed');
  }
};

/**
 * WebSocket Authorizer Handler
 * Custom authorizer for WebSocket connections (optional)
 */
export const authorizerHandler = async (event: any): Promise<any> => {
  console.log('WebSocket authorizer invoked:', JSON.stringify(event, null, 2));

  try {
    // Extract API key from event
    const apiKey = authService.extractApiKey(event);
    
    if (!apiKey) {
      throw new Error('No API key provided');
    }

    // Validate API key
    const validation = await authService.validateApiKey(apiKey);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid API key');
    }

    // Return authorization policy
    return {
      principalId: validation.keyData?.keyId || 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        apiKey,
        userId: validation.keyData?.userId || 'anonymous',
        permissions: JSON.stringify(validation.keyData?.permissions || [])
      }
    };

  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
};

// Helper functions
async function handlePing(connectionId: string): Promise<APIGatewayProxyResult> {
  console.log(`Ping from connection ${connectionId}`);
  return successResponse({ type: 'pong', timestamp: Date.now() });
}

async function handleSubscribe(connectionId: string, message: WebSocketMessage): Promise<APIGatewayProxyResult> {
  if (!message.channel) {
    return errorResponse(400, 'Channel is required for subscription');
  }

  try {
    await roomManager.subscribe(connectionId, message.channel, message.filters || {});
    await connectionManager.addSubscription(connectionId, message.channel);
    
    console.log(`Connection ${connectionId} subscribed to ${message.channel}`);
    return successResponse({ 
      type: 'subscribed', 
      channel: message.channel,
      filters: message.filters 
    });

  } catch (error) {
    console.error(`Subscription error for ${connectionId}:`, error);
    return errorResponse(500, 'Subscription failed');
  }
}

async function handleUnsubscribe(connectionId: string, message: WebSocketMessage): Promise<APIGatewayProxyResult> {
  if (!message.channel) {
    return errorResponse(400, 'Channel is required for unsubscription');
  }

  try {
    await roomManager.unsubscribe(connectionId, message.channel);
    await connectionManager.removeSubscription(connectionId, message.channel);
    
    console.log(`Connection ${connectionId} unsubscribed from ${message.channel}`);
    return successResponse({ 
      type: 'unsubscribed', 
      channel: message.channel 
    });

  } catch (error) {
    console.error(`Unsubscription error for ${connectionId}:`, error);
    return errorResponse(500, 'Unsubscription failed');
  }
}
