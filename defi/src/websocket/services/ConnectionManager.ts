import { Redis } from 'ioredis';
import { getRedisClient } from '../utils/redis';

export interface ConnectionData {
  connectionId: string;
  apiKey?: string;  // Optional for backward compatibility
  userId?: string;  // From JWT
  email?: string;   // From JWT
  role?: 'user' | 'admin' | 'service';  // From JWT
  permissions?: string[];  // From JWT
  connectedAt: number;
  lastHeartbeat: number;
  subscriptions: string[];
  metadata?: {
    userAgent?: string;
    origin?: string;
    ip?: string;
    tokenIssuedAt?: number;
    tokenExpiresAt?: number;
  };
}

/**
 * ConnectionManager handles WebSocket connection state management using Redis
 * Provides connection lifecycle management, heartbeat tracking, and subscription management
 */
export class ConnectionManager {
  private redis: Redis;
  private readonly CONNECTION_PREFIX = 'ws:connection:';
  private readonly CONNECTION_INDEX = 'ws:connections';
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60 seconds

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Add a new WebSocket connection
   */
  async addConnection(connectionId: string, connectionData: ConnectionData): Promise<void> {
    const key = this.getConnectionKey(connectionId);

    try {
      // Store connection data
      const dataToStore: Record<string, string> = {
        connectionId: connectionData.connectionId,
        connectedAt: connectionData.connectedAt.toString(),
        lastHeartbeat: connectionData.lastHeartbeat.toString(),
        subscriptions: JSON.stringify(connectionData.subscriptions || []),
        metadata: JSON.stringify(connectionData.metadata || {})
      };

      // Add optional fields
      if (connectionData.apiKey) dataToStore.apiKey = connectionData.apiKey;
      if (connectionData.userId) dataToStore.userId = connectionData.userId;
      if (connectionData.email) dataToStore.email = connectionData.email;
      if (connectionData.role) dataToStore.role = connectionData.role;
      if (connectionData.permissions) dataToStore.permissions = JSON.stringify(connectionData.permissions);

      await this.redis.hset(key, dataToStore);

      // Add to connection index
      await this.redis.sadd(this.CONNECTION_INDEX, connectionId);

      // Set expiration for automatic cleanup (24 hours)
      await this.redis.expire(key, 86400);

      console.log(`Connection ${connectionId} added to Redis`);
    } catch (error) {
      console.error(`Error adding connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Get connection data
   */
  async getConnection(connectionId: string): Promise<ConnectionData | null> {
    const key = this.getConnectionKey(connectionId);

    try {
      const data = await this.redis.hgetall(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const connectionData: ConnectionData = {
        connectionId: data.connectionId,
        connectedAt: parseInt(data.connectedAt),
        lastHeartbeat: parseInt(data.lastHeartbeat),
        subscriptions: JSON.parse(data.subscriptions || '[]'),
        metadata: JSON.parse(data.metadata || '{}')
      };

      // Add optional fields
      if (data.apiKey) connectionData.apiKey = data.apiKey;
      if (data.userId) connectionData.userId = data.userId;
      if (data.email) connectionData.email = data.email;
      if (data.role) connectionData.role = data.role as 'user' | 'admin' | 'service';
      if (data.permissions) connectionData.permissions = JSON.parse(data.permissions);

      return connectionData;
    } catch (error) {
      console.error(`Error getting connection ${connectionId}:`, error);
      return null;
    }
  }

  /**
   * Remove a WebSocket connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    const key = this.getConnectionKey(connectionId);
    
    try {
      // Remove from connection index
      await this.redis.srem(this.CONNECTION_INDEX, connectionId);
      
      // Delete connection data
      await this.redis.del(key);
      
      console.log(`Connection ${connectionId} removed from Redis`);
    } catch (error) {
      console.error(`Error removing connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Update heartbeat timestamp for a connection
   */
  async updateHeartbeat(connectionId: string): Promise<void> {
    const key = this.getConnectionKey(connectionId);
    
    try {
      await this.redis.hset(key, 'lastHeartbeat', Date.now().toString());
      
      // Extend expiration
      await this.redis.expire(key, 86400);
    } catch (error) {
      console.error(`Error updating heartbeat for ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Add subscription to connection
   */
  async addSubscription(connectionId: string, channel: string): Promise<void> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    if (!connection.subscriptions.includes(channel)) {
      connection.subscriptions.push(channel);
      
      const key = this.getConnectionKey(connectionId);
      await this.redis.hset(key, 'subscriptions', JSON.stringify(connection.subscriptions));
    }
  }

  /**
   * Remove subscription from connection
   */
  async removeSubscription(connectionId: string, channel: string): Promise<void> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return; // Connection already gone
    }

    const index = connection.subscriptions.indexOf(channel);
    if (index > -1) {
      connection.subscriptions.splice(index, 1);
      
      const key = this.getConnectionKey(connectionId);
      await this.redis.hset(key, 'subscriptions', JSON.stringify(connection.subscriptions));
    }
  }

  /**
   * Get all active connections
   */
  async getAllConnections(): Promise<string[]> {
    try {
      return await this.redis.smembers(this.CONNECTION_INDEX);
    } catch (error) {
      console.error('Error getting all connections:', error);
      return [];
    }
  }

  /**
   * Get connections by subscription channel
   */
  async getConnectionsByChannel(channel: string): Promise<string[]> {
    try {
      const allConnections = await this.getAllConnections();
      const subscribedConnections: string[] = [];

      for (const connectionId of allConnections) {
        const connection = await this.getConnection(connectionId);
        if (connection && connection.subscriptions.includes(channel)) {
          subscribedConnections.push(connectionId);
        }
      }

      return subscribedConnections;
    } catch (error) {
      console.error(`Error getting connections for channel ${channel}:`, error);
      return [];
    }
  }

  /**
   * Clean up stale connections based on heartbeat timeout
   */
  async cleanupStaleConnections(): Promise<number> {
    try {
      const allConnections = await this.getAllConnections();
      const now = Date.now();
      let cleanedCount = 0;

      for (const connectionId of allConnections) {
        const connection = await this.getConnection(connectionId);
        
        if (!connection || (now - connection.lastHeartbeat) > this.HEARTBEAT_TIMEOUT) {
          await this.removeConnection(connectionId);
          cleanedCount++;
          console.log(`Cleaned up stale connection: ${connectionId}`);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up stale connections:', error);
      return 0;
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    connectionsByChannel: Record<string, number>;
  }> {
    try {
      const allConnections = await this.getAllConnections();
      const connectionsByChannel: Record<string, number> = {};

      for (const connectionId of allConnections) {
        const connection = await this.getConnection(connectionId);
        if (connection) {
          for (const channel of connection.subscriptions) {
            connectionsByChannel[channel] = (connectionsByChannel[channel] || 0) + 1;
          }
        }
      }

      return {
        totalConnections: allConnections.length,
        connectionsByChannel
      };
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return {
        totalConnections: 0,
        connectionsByChannel: {}
      };
    }
  }

  /**
   * Check if connection exists and is valid
   */
  async isConnectionValid(connectionId: string): Promise<boolean> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return false;
    }

    const now = Date.now();
    return (now - connection.lastHeartbeat) <= this.HEARTBEAT_TIMEOUT;
  }

  private getConnectionKey(connectionId: string): string {
    return `${this.CONNECTION_PREFIX}${connectionId}`;
  }
}
