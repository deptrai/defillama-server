import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ConnectionManager } from '../services/ConnectionManager';
import { RoomManager } from '../services/RoomManager';
import { successResponse, errorResponse } from '../../utils/shared/lambda-response';
import { checkApiKey } from '../../api-keys/checkApiKey';

const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();

/**
 * WebSocket Connection Handler
 * Handles connect, disconnect, and message events for WebSocket connections
 */
export const connectHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { connectionId, eventType, routeKey } = event.requestContext;
  
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
        return errorResponse(400, 'Unknown event type');
    }
  } catch (error) {
    console.error(`Error handling WebSocket event:`, error);
    return errorResponse(500, 'Internal server error');
  }
};

/**
 * Handle WebSocket connection establishment
 */
async function handleConnect(connectionId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract API key from query parameters or headers
    const apiKey = event.queryStringParameters?.apiKey || 
                   event.headers?.['x-api-key'] || 
                   event.headers?.['Authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      console.log(`Connection ${connectionId} rejected: No API key provided`);
      return errorResponse(401, 'API key required');
    }

    // Validate API key using existing system
    const isValidKey = await checkApiKey(apiKey);
    if (!isValidKey) {
      console.log(`Connection ${connectionId} rejected: Invalid API key`);
      return errorResponse(401, 'Invalid API key');
    }

    // Store connection with metadata
    const connectionData = {
      connectionId,
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

    await connectionManager.addConnection(connectionId, connectionData);
    
    console.log(`Connection ${connectionId} established successfully`);
    return successResponse({ message: 'Connected successfully' });

  } catch (error) {
    console.error(`Error in handleConnect:`, error);
    return errorResponse(500, 'Connection failed');
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
    return errorResponse(500, 'Disconnect cleanup failed');
  }
}

/**
 * Handle WebSocket messages
 */
async function handleMessage(connectionId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return errorResponse(400, 'Message body required');
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
        return errorResponse(400, 'Unknown message type');
    }

  } catch (error) {
    console.error(`Error in handleMessage:`, error);
    return errorResponse(500, 'Message processing failed');
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
      return errorResponse(400, 'Channels array required');
    }

    const results = [];
    
    for (const channel of channels) {
      try {
        await roomManager.subscribe(connectionId, channel, filters);
        await connectionManager.addSubscription(connectionId, channel);
        results.push({ channel, status: 'subscribed' });
        console.log(`Connection ${connectionId} subscribed to ${channel}`);
      } catch (error) {
        console.error(`Subscription failed for ${channel}:`, error);
        results.push({ channel, status: 'failed', error: error.message });
      }
    }

    return successResponse({
      type: 'subscription_result',
      results
    });

  } catch (error) {
    console.error(`Error in handleSubscribe:`, error);
    return errorResponse(500, 'Subscription failed');
  }
}

/**
 * Handle unsubscription requests
 */
async function handleUnsubscribe(connectionId: string, message: any): Promise<APIGatewayProxyResult> {
  try {
    const { channels } = message;
    
    if (!channels || !Array.isArray(channels)) {
      return errorResponse(400, 'Channels array required');
    }

    const results = [];
    
    for (const channel of channels) {
      try {
        await roomManager.unsubscribe(connectionId, channel);
        await connectionManager.removeSubscription(connectionId, channel);
        results.push({ channel, status: 'unsubscribed' });
        console.log(`Connection ${connectionId} unsubscribed from ${channel}`);
      } catch (error) {
        console.error(`Unsubscription failed for ${channel}:`, error);
        results.push({ channel, status: 'failed', error: error.message });
      }
    }

    return successResponse({
      type: 'unsubscription_result',
      results
    });

  } catch (error) {
    console.error(`Error in handleUnsubscribe:`, error);
    return errorResponse(500, 'Unsubscription failed');
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
