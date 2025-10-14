import { ApiGatewayManagementApi } from 'aws-sdk';
import { Redis } from 'ioredis';
import { getRedisClient } from '../utils/redis';
import { ConnectionManager } from './ConnectionManager';
import { RoomManager } from './RoomManager';

export interface MessageData {
  type: string;
  channel: string;
  data: any;
  timestamp?: number;
  protocolId?: string;
  tokenId?: string;
  chain?: string;
  userId?: string;
  value?: number;
}

export interface BroadcastOptions {
  excludeConnections?: string[];
  includeMetadata?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * MessageRouter handles message broadcasting to WebSocket connections
 * Supports room-based routing, filtered messaging, and message queuing
 */
export class MessageRouter {
  private redis: Redis;
  private connectionManager: ConnectionManager;
  private roomManager: RoomManager;
  private apiGatewayManagementApi?: ApiGatewayManagementApi;
  private readonly MESSAGE_QUEUE_PREFIX = 'ws:queue:';
  private readonly FAILED_MESSAGE_PREFIX = 'ws:failed:';

  constructor() {
    this.redis = getRedisClient();
    this.connectionManager = new ConnectionManager();
    this.roomManager = new RoomManager();
    
    // Initialize API Gateway Management API if endpoint is available
    if (process.env.WEBSOCKET_API_ENDPOINT) {
      this.apiGatewayManagementApi = new ApiGatewayManagementApi({
        endpoint: process.env.WEBSOCKET_API_ENDPOINT
      });
    }
  }

  /**
   * Broadcast message to all connections in a channel
   */
  async broadcastToChannel(
    channel: string, 
    messageData: MessageData, 
    options: BroadcastOptions = {}
  ): Promise<{
    sent: number;
    failed: number;
    queued: number;
  }> {
    try {
      // Get filtered room members based on message content
      const connections = await this.roomManager.getFilteredRoomMembers(channel, messageData);
      
      // Exclude specified connections
      const targetConnections = options.excludeConnections 
        ? connections.filter(id => !options.excludeConnections!.includes(id))
        : connections;

      console.log(`Broadcasting to ${targetConnections.length} connections in channel ${channel}`);

      const results = await this.sendToConnections(targetConnections, messageData, options);
      
      // Log broadcast statistics
      console.log(`Broadcast complete - Sent: ${results.sent}, Failed: ${results.failed}, Queued: ${results.queued}`);
      
      return results;
    } catch (error) {
      console.error(`Error broadcasting to channel ${channel}:`, error);
      return { sent: 0, failed: 0, queued: 0 };
    }
  }

  /**
   * Send message to specific connections
   */
  async sendToConnections(
    connectionIds: string[], 
    messageData: MessageData,
    options: BroadcastOptions = {}
  ): Promise<{
    sent: number;
    failed: number;
    queued: number;
  }> {
    let sent = 0;
    let failed = 0;
    let queued = 0;

    // Add timestamp if not provided
    if (!messageData.timestamp) {
      messageData.timestamp = Date.now();
    }

    // Process connections in batches to avoid overwhelming the system
    const batchSize = 100;
    for (let i = 0; i < connectionIds.length; i += batchSize) {
      const batch = connectionIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (connectionId) => {
        try {
          const success = await this.sendToConnection(connectionId, messageData, options);
          return success ? 'sent' : 'failed';
        } catch (error) {
          console.error(`Error sending to connection ${connectionId}:`, error);
          
          // Queue message for retry if connection is temporarily unavailable
          if (await this.connectionManager.isConnectionValid(connectionId)) {
            await this.queueMessage(connectionId, messageData);
            return 'queued';
          }
          
          return 'failed';
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          switch (result.value) {
            case 'sent': sent++; break;
            case 'failed': failed++; break;
            case 'queued': queued++; break;
          }
        } else {
          failed++;
        }
      });
    }

    return { sent, failed, queued };
  }

  /**
   * Send message to a single connection
   */
  async sendToConnection(
    connectionId: string, 
    messageData: MessageData,
    options: BroadcastOptions = {}
  ): Promise<boolean> {
    try {
      // Check if connection is valid
      if (!await this.connectionManager.isConnectionValid(connectionId)) {
        console.warn(`Connection ${connectionId} is not valid, skipping`);
        return false;
      }

      // Prepare message payload
      const payload = {
        ...messageData,
        metadata: options.includeMetadata ? {
          sentAt: Date.now(),
          priority: options.priority || 'normal'
        } : undefined
      };

      const messageBody = JSON.stringify(payload);

      // Send via API Gateway Management API if available
      if (this.apiGatewayManagementApi) {
        await this.apiGatewayManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: messageBody
        }).promise();
      } else {
        // For local development, log the message
        console.log(`[MOCK] Sending to ${connectionId}:`, payload);
      }

      // Update connection heartbeat
      await this.connectionManager.updateHeartbeat(connectionId);
      
      return true;
    } catch (error) {
      // Handle specific AWS API Gateway errors
      if (error.statusCode === 410) {
        // Connection is gone, clean it up
        console.log(`Connection ${connectionId} is gone, cleaning up`);
        await this.connectionManager.removeConnection(connectionId);
        return false;
      }
      
      console.error(`Error sending message to ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  async broadcastToAll(
    messageData: MessageData, 
    options: BroadcastOptions = {}
  ): Promise<{
    sent: number;
    failed: number;
    queued: number;
  }> {
    try {
      const allConnections = await this.connectionManager.getAllConnections();
      
      // Exclude specified connections
      const targetConnections = options.excludeConnections 
        ? allConnections.filter(id => !options.excludeConnections!.includes(id))
        : allConnections;

      console.log(`Broadcasting to all ${targetConnections.length} connections`);
      
      return await this.sendToConnections(targetConnections, messageData, options);
    } catch (error) {
      console.error('Error broadcasting to all connections:', error);
      return { sent: 0, failed: 0, queued: 0 };
    }
  }

  /**
   * Queue message for later delivery
   */
  async queueMessage(connectionId: string, messageData: MessageData): Promise<void> {
    try {
      const queueKey = `${this.MESSAGE_QUEUE_PREFIX}${connectionId}`;
      const message = {
        ...messageData,
        queuedAt: Date.now()
      };

      await this.redis.lpush(queueKey, JSON.stringify(message));
      
      // Limit queue size to prevent memory issues
      await this.redis.ltrim(queueKey, 0, 99); // Keep last 100 messages
      
      // Set expiration for queue cleanup
      await this.redis.expire(queueKey, 3600); // 1 hour
      
      console.log(`Message queued for connection ${connectionId}`);
    } catch (error) {
      console.error(`Error queuing message for ${connectionId}:`, error);
    }
  }

  /**
   * Process queued messages for a connection
   */
  async processQueuedMessages(connectionId: string): Promise<number> {
    try {
      const queueKey = `${this.MESSAGE_QUEUE_PREFIX}${connectionId}`;
      let processedCount = 0;

      // Process messages one by one
      while (true) {
        const messageJson = await this.redis.rpop(queueKey);
        if (!messageJson) break;

        try {
          const messageData = JSON.parse(messageJson);
          const success = await this.sendToConnection(connectionId, messageData);
          
          if (success) {
            processedCount++;
          } else {
            // Put message back at the front of queue if delivery failed
            await this.redis.rpush(queueKey, messageJson);
            break;
          }
        } catch (error) {
          console.error(`Error processing queued message for ${connectionId}:`, error);
          // Store failed message for analysis
          await this.storeFailed Message(connectionId, messageJson, error);
        }
      }

      if (processedCount > 0) {
        console.log(`Processed ${processedCount} queued messages for ${connectionId}`);
      }

      return processedCount;
    } catch (error) {
      console.error(`Error processing queue for ${connectionId}:`, error);
      return 0;
    }
  }

  /**
   * Get message delivery statistics
   */
  async getDeliveryStats(): Promise<{
    totalQueued: number;
    queuesByConnection: Record<string, number>;
    totalFailed: number;
  }> {
    try {
      const allConnections = await this.connectionManager.getAllConnections();
      const queuesByConnection: Record<string, number> = {};
      let totalQueued = 0;

      for (const connectionId of allConnections) {
        const queueKey = `${this.MESSAGE_QUEUE_PREFIX}${connectionId}`;
        const queueLength = await this.redis.llen(queueKey);
        
        if (queueLength > 0) {
          queuesByConnection[connectionId] = queueLength;
          totalQueued += queueLength;
        }
      }

      // Count failed messages
      const failedKeys = await this.redis.keys(`${this.FAILED_MESSAGE_PREFIX}*`);
      const totalFailed = failedKeys.length;

      return {
        totalQueued,
        queuesByConnection,
        totalFailed
      };
    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return {
        totalQueued: 0,
        queuesByConnection: {},
        totalFailed: 0
      };
    }
  }

  /**
   * Store failed message for analysis
   */
  private async storeFailedMessage(connectionId: string, messageJson: string, error: any): Promise<void> {
    try {
      const failedKey = `${this.FAILED_MESSAGE_PREFIX}${connectionId}:${Date.now()}`;
      await this.redis.hset(failedKey, {
        connectionId,
        message: messageJson,
        error: JSON.stringify({
          message: error.message,
          stack: error.stack,
          statusCode: error.statusCode
        }),
        failedAt: Date.now().toString()
      });

      // Set expiration for cleanup
      await this.redis.expire(failedKey, 86400); // 24 hours
    } catch (storeError) {
      console.error('Error storing failed message:', storeError);
    }
  }
}
