import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MessageRouter, MessageData } from '../services/MessageRouter';
import { ConnectionManager } from '../services/ConnectionManager';
import { RoomManager } from '../services/RoomManager';
import { successResponse, errorResponse } from '../../utils/shared/lambda-response';

const messageRouter = new MessageRouter();
const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();

/**
 * WebSocket Message Broadcasting Handler
 * Handles message routing and broadcasting to WebSocket connections
 */
export const broadcastHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Broadcast handler invoked:', JSON.stringify(event, null, 2));

    // Parse message data from event body
    if (!event.body) {
      return errorResponse(400, 'Message body required');
    }

    const messageData: MessageData = JSON.parse(event.body);
    
    // Validate required fields
    if (!messageData.type || !messageData.channel) {
      return errorResponse(400, 'Message type and channel are required');
    }

    // Route message based on type
    let result;
    switch (messageData.type) {
      case 'price_update':
        result = await handlePriceUpdate(messageData);
        break;
      
      case 'tvl_update':
        result = await handleTvlUpdate(messageData);
        break;
      
      case 'protocol_update':
        result = await handleProtocolUpdate(messageData);
        break;
      
      case 'alert':
        result = await handleAlert(messageData);
        break;
      
      case 'liquidation':
        result = await handleLiquidation(messageData);
        break;
      
      case 'governance':
        result = await handleGovernance(messageData);
        break;
      
      case 'emission':
        result = await handleEmission(messageData);
        break;
      
      case 'broadcast':
        result = await handleBroadcast(messageData);
        break;
      
      default:
        return errorResponse(400, `Unknown message type: ${messageData.type}`);
    }

    console.log(`Message broadcast result:`, result);
    return successResponse(result);

  } catch (error) {
    console.error('Error in broadcast handler:', error);
    return errorResponse(500, 'Message broadcast failed');
  }
};

/**
 * Handle price update messages
 */
async function handlePriceUpdate(messageData: MessageData) {
  const channel = 'prices';
  
  // Add price-specific metadata
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now(),
    channel
  };

  // Broadcast to price channel subscribers
  const result = await messageRouter.broadcastToChannel(channel, enrichedMessage);
  
  // Also broadcast to protocol-specific channels if protocolId is provided
  if (messageData.protocolId) {
    const protocolChannel = `protocol:${messageData.protocolId}`;
    const protocolResult = await messageRouter.broadcastToChannel(protocolChannel, enrichedMessage);
    result.sent += protocolResult.sent;
    result.failed += protocolResult.failed;
    result.queued += protocolResult.queued;
  }

  return {
    type: 'price_update_broadcast',
    channel,
    ...result
  };
}

/**
 * Handle TVL update messages
 */
async function handleTvlUpdate(messageData: MessageData) {
  const channel = 'tvl_changes';
  
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now(),
    channel
  };

  const result = await messageRouter.broadcastToChannel(channel, enrichedMessage);
  
  // Broadcast to protocol-specific channels
  if (messageData.protocolId) {
    const protocolChannel = `protocol:${messageData.protocolId}`;
    const protocolResult = await messageRouter.broadcastToChannel(protocolChannel, enrichedMessage);
    result.sent += protocolResult.sent;
    result.failed += protocolResult.failed;
    result.queued += protocolResult.queued;
  }

  return {
    type: 'tvl_update_broadcast',
    channel,
    ...result
  };
}

/**
 * Handle protocol update messages
 */
async function handleProtocolUpdate(messageData: MessageData) {
  const channel = 'protocols';
  
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now(),
    channel
  };

  const result = await messageRouter.broadcastToChannel(channel, enrichedMessage);
  
  // Broadcast to specific protocol channel
  if (messageData.protocolId) {
    const protocolChannel = `protocol:${messageData.protocolId}`;
    const protocolResult = await messageRouter.broadcastToChannel(protocolChannel, enrichedMessage);
    result.sent += protocolResult.sent;
    result.failed += protocolResult.failed;
    result.queued += protocolResult.queued;
  }

  return {
    type: 'protocol_update_broadcast',
    channel,
    ...result
  };
}

/**
 * Handle alert messages
 */
async function handleAlert(messageData: MessageData) {
  const channel = 'alerts';
  
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now(),
    channel,
    priority: 'high' // Alerts are high priority
  };

  // Broadcast to alerts channel with high priority
  const result = await messageRouter.broadcastToChannel(channel, enrichedMessage, {
    priority: 'high',
    includeMetadata: true
  });

  // Send to specific user if userId is provided
  if (messageData.userId) {
    const userConnections = await getUserConnections(messageData.userId);
    if (userConnections.length > 0) {
      const userResult = await messageRouter.sendToConnections(userConnections, enrichedMessage, {
        priority: 'high',
        includeMetadata: true
      });
      result.sent += userResult.sent;
      result.failed += userResult.failed;
      result.queued += userResult.queued;
    }
  }

  return {
    type: 'alert_broadcast',
    channel,
    ...result
  };
}

/**
 * Handle liquidation messages
 */
async function handleLiquidation(messageData: MessageData) {
  const channel = 'liquidations';
  
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now(),
    channel,
    priority: 'high'
  };

  const result = await messageRouter.broadcastToChannel(channel, enrichedMessage, {
    priority: 'high'
  });

  return {
    type: 'liquidation_broadcast',
    channel,
    ...result
  };
}

/**
 * Handle governance messages
 */
async function handleGovernance(messageData: MessageData) {
  const channel = 'governance';
  
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now(),
    channel
  };

  const result = await messageRouter.broadcastToChannel(channel, enrichedMessage);

  return {
    type: 'governance_broadcast',
    channel,
    ...result
  };
}

/**
 * Handle emission messages
 */
async function handleEmission(messageData: MessageData) {
  const channel = 'emissions';
  
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now(),
    channel
  };

  const result = await messageRouter.broadcastToChannel(channel, enrichedMessage);

  return {
    type: 'emission_broadcast',
    channel,
    ...result
  };
}

/**
 * Handle general broadcast messages
 */
async function handleBroadcast(messageData: MessageData) {
  const enrichedMessage = {
    ...messageData,
    timestamp: Date.now()
  };

  // Broadcast to all connections
  const result = await messageRouter.broadcastToAll(enrichedMessage, {
    includeMetadata: true
  });

  return {
    type: 'general_broadcast',
    channel: 'all',
    ...result
  };
}

/**
 * Get connections for a specific user
 */
async function getUserConnections(userId: string): Promise<string[]> {
  try {
    const allConnections = await connectionManager.getAllConnections();
    const userConnections: string[] = [];

    for (const connectionId of allConnections) {
      const connection = await connectionManager.getConnection(connectionId);
      if (connection && connection.metadata?.userId === userId) {
        userConnections.push(connectionId);
      }
    }

    return userConnections;
  } catch (error) {
    console.error(`Error getting user connections for ${userId}:`, error);
    return [];
  }
}

/**
 * WebSocket Statistics Handler
 * Provides real-time statistics about WebSocket connections and message delivery
 */
export const statsHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const connectionStats = await connectionManager.getConnectionStats();
    const roomStats = await roomManager.getRoomStats();
    const deliveryStats = await messageRouter.getDeliveryStats();

    const stats = {
      connections: connectionStats,
      rooms: roomStats,
      delivery: deliveryStats,
      timestamp: Date.now()
    };

    return successResponse(stats);
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    return errorResponse(500, 'Failed to get statistics');
  }
};

/**
 * WebSocket Health Check Handler
 */
export const healthHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      services: {
        redis: 'healthy', // TODO: Add actual Redis health check
        connections: 'healthy',
        messaging: 'healthy'
      }
    };

    return successResponse(health);
  } catch (error) {
    console.error('Health check failed:', error);
    return errorResponse(500, 'Health check failed');
  }
};
