import { Redis } from 'ioredis';
import { getRedisClient } from '../utils/redis';

export interface SubscriptionFilters {
  protocolIds?: string[];
  tokenIds?: string[];
  chains?: string[];
  userId?: string;
  minValue?: number;
  maxValue?: number;
}

/**
 * RoomManager handles WebSocket room-based subscription management using Redis
 * Supports protocol-specific rooms, event-type rooms, and filtered subscriptions
 */
export class RoomManager {
  private redis: Redis;
  private readonly ROOM_PREFIX = 'ws:room:';
  private readonly ROOM_INDEX = 'ws:rooms';
  private readonly SUBSCRIPTION_PREFIX = 'ws:sub:';

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Subscribe a connection to a room with optional filters
   */
  async subscribe(connectionId: string, channel: string, filters?: SubscriptionFilters): Promise<void> {
    try {
      // Validate channel format
      this.validateChannel(channel);

      const roomKey = this.getRoomKey(channel);
      const subscriptionKey = this.getSubscriptionKey(connectionId, channel);

      // Add connection to room
      await this.redis.sadd(roomKey, connectionId);
      
      // Store subscription filters if provided
      if (filters) {
        await this.redis.hset(subscriptionKey, {
          connectionId,
          channel,
          filters: JSON.stringify(filters),
          subscribedAt: Date.now().toString()
        });
      } else {
        await this.redis.hset(subscriptionKey, {
          connectionId,
          channel,
          subscribedAt: Date.now().toString()
        });
      }

      // Add room to room index
      await this.redis.sadd(this.ROOM_INDEX, channel);

      // Set expiration for cleanup (24 hours)
      await this.redis.expire(roomKey, 86400);
      await this.redis.expire(subscriptionKey, 86400);

      console.log(`Connection ${connectionId} subscribed to room ${channel}`);
    } catch (error) {
      console.error(`Error subscribing ${connectionId} to ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe a connection from a room
   */
  async unsubscribe(connectionId: string, channel: string): Promise<void> {
    try {
      const roomKey = this.getRoomKey(channel);
      const subscriptionKey = this.getSubscriptionKey(connectionId, channel);

      // Remove connection from room
      await this.redis.srem(roomKey, connectionId);
      
      // Remove subscription data
      await this.redis.del(subscriptionKey);

      // Clean up empty rooms
      const roomSize = await this.redis.scard(roomKey);
      if (roomSize === 0) {
        await this.redis.del(roomKey);
        await this.redis.srem(this.ROOM_INDEX, channel);
      }

      console.log(`Connection ${connectionId} unsubscribed from room ${channel}`);
    } catch (error) {
      console.error(`Error unsubscribing ${connectionId} from ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Get all connections in a room
   */
  async getRoomMembers(channel: string): Promise<string[]> {
    try {
      const roomKey = this.getRoomKey(channel);
      return await this.redis.smembers(roomKey);
    } catch (error) {
      console.error(`Error getting members for room ${channel}:`, error);
      return [];
    }
  }

  /**
   * Get filtered connections in a room based on message content
   */
  async getFilteredRoomMembers(channel: string, messageData: any): Promise<string[]> {
    try {
      const allMembers = await this.getRoomMembers(channel);
      const filteredMembers: string[] = [];

      for (const connectionId of allMembers) {
        const subscriptionKey = this.getSubscriptionKey(connectionId, channel);
        const subscription = await this.redis.hgetall(subscriptionKey);

        if (!subscription.filters) {
          // No filters, include all members
          filteredMembers.push(connectionId);
          continue;
        }

        const filters: SubscriptionFilters = JSON.parse(subscription.filters);
        
        if (this.matchesFilters(messageData, filters)) {
          filteredMembers.push(connectionId);
        }
      }

      return filteredMembers;
    } catch (error) {
      console.error(`Error getting filtered members for room ${channel}:`, error);
      return [];
    }
  }

  /**
   * Get all active rooms
   */
  async getAllRooms(): Promise<string[]> {
    try {
      return await this.redis.smembers(this.ROOM_INDEX);
    } catch (error) {
      console.error('Error getting all rooms:', error);
      return [];
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStats(): Promise<Record<string, number>> {
    try {
      const rooms = await this.getAllRooms();
      const stats: Record<string, number> = {};

      for (const room of rooms) {
        const roomKey = this.getRoomKey(room);
        const memberCount = await this.redis.scard(roomKey);
        stats[room] = memberCount;
      }

      return stats;
    } catch (error) {
      console.error('Error getting room stats:', error);
      return {};
    }
  }

  /**
   * Clean up empty rooms and expired subscriptions
   */
  async cleanupRooms(): Promise<number> {
    try {
      const rooms = await this.getAllRooms();
      let cleanedCount = 0;

      for (const room of rooms) {
        const roomKey = this.getRoomKey(room);
        const memberCount = await this.redis.scard(roomKey);
        
        if (memberCount === 0) {
          await this.redis.del(roomKey);
          await this.redis.srem(this.ROOM_INDEX, room);
          cleanedCount++;
          console.log(`Cleaned up empty room: ${room}`);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up rooms:', error);
      return 0;
    }
  }

  /**
   * Get subscription details for a connection and channel
   */
  async getSubscription(connectionId: string, channel: string): Promise<any> {
    try {
      const subscriptionKey = this.getSubscriptionKey(connectionId, channel);
      const subscription = await this.redis.hgetall(subscriptionKey);
      
      if (!subscription || Object.keys(subscription).length === 0) {
        return null;
      }

      return {
        connectionId: subscription.connectionId,
        channel: subscription.channel,
        filters: subscription.filters ? JSON.parse(subscription.filters) : null,
        subscribedAt: parseInt(subscription.subscribedAt)
      };
    } catch (error) {
      console.error(`Error getting subscription for ${connectionId}:${channel}:`, error);
      return null;
    }
  }

  /**
   * Check if message data matches subscription filters
   */
  private matchesFilters(messageData: any, filters: SubscriptionFilters): boolean {
    try {
      // Protocol ID filter
      if (filters.protocolIds && filters.protocolIds.length > 0) {
        if (!messageData.protocolId || !filters.protocolIds.includes(messageData.protocolId)) {
          return false;
        }
      }

      // Token ID filter
      if (filters.tokenIds && filters.tokenIds.length > 0) {
        if (!messageData.tokenId || !filters.tokenIds.includes(messageData.tokenId)) {
          return false;
        }
      }

      // Chain filter
      if (filters.chains && filters.chains.length > 0) {
        if (!messageData.chain || !filters.chains.includes(messageData.chain)) {
          return false;
        }
      }

      // User ID filter
      if (filters.userId) {
        if (!messageData.userId || messageData.userId !== filters.userId) {
          return false;
        }
      }

      // Value range filters
      if (filters.minValue !== undefined && messageData.value < filters.minValue) {
        return false;
      }

      if (filters.maxValue !== undefined && messageData.value > filters.maxValue) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error matching filters:', error);
      return false;
    }
  }

  /**
   * Validate channel format
   */
  private validateChannel(channel: string): void {
    const validChannels = [
      'protocols', 'prices', 'volumes', 'alerts', 'tvl_changes',
      'liquidations', 'governance', 'emissions'
    ];

    // Allow protocol-specific channels (e.g., "uniswap-v3:ethereum")
    const isProtocolSpecific = /^[a-z0-9-]+:[a-z0-9-]+$/.test(channel);
    
    if (!validChannels.includes(channel) && !isProtocolSpecific) {
      throw new Error(`Invalid channel: ${channel}`);
    }
  }

  private getRoomKey(channel: string): string {
    return `${this.ROOM_PREFIX}${channel}`;
  }

  private getSubscriptionKey(connectionId: string, channel: string): string {
    return `${this.SUBSCRIPTION_PREFIX}${connectionId}:${channel}`;
  }
}
