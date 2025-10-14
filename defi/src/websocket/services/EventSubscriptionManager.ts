/**
 * Event Subscription Manager
 * Manages client subscriptions to event channels and filters
 * Phase 5: WebSocket Integration
 */

import { Redis } from 'ioredis';
import { getRedisClient } from '../utils/redis';
import { BaseEvent, PriceUpdateEvent, TvlChangeEvent } from '../../events/event-types';

export interface SubscriptionFilters {
  protocolIds?: string[];
  tokenIds?: string[];
  chains?: string[];
  eventTypes?: string[];
}

export interface Subscription {
  connectionId: string;
  channels: string[];
  filters?: SubscriptionFilters;
  subscribedAt: number;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  subscriptionsByChannel: Record<string, number>;
  subscriptionsByConnection: Record<string, number>;
}

/**
 * EventSubscriptionManager handles client subscriptions to event channels
 */
export class EventSubscriptionManager {
  private redis: Redis;
  private readonly SUBSCRIPTION_PREFIX = 'ws:subscription:';
  private readonly CHANNEL_SUBSCRIBERS_PREFIX = 'ws:channel:';

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Subscribe a connection to channels with optional filters
   */
  async subscribe(
    connectionId: string,
    channels: string[],
    filters?: SubscriptionFilters
  ): Promise<Subscription> {
    try {
      const subscription: Subscription = {
        connectionId,
        channels,
        filters,
        subscribedAt: Date.now(),
      };

      // Store subscription
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}${connectionId}`;
      await this.redis.set(subscriptionKey, JSON.stringify(subscription), 'EX', 86400); // 24h TTL

      // Add connection to channel subscriber sets
      for (const channel of channels) {
        const channelKey = `${this.CHANNEL_SUBSCRIBERS_PREFIX}${channel}`;
        await this.redis.sadd(channelKey, connectionId);
        await this.redis.expire(channelKey, 86400); // 24h TTL
      }

      console.log(`Connection ${connectionId} subscribed to ${channels.length} channels`);
      return subscription;
    } catch (error) {
      console.error(`Error subscribing connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe a connection from specific channels or all channels
   */
  async unsubscribe(
    connectionId: string,
    channels?: string[]
  ): Promise<void> {
    try {
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}${connectionId}`;
      
      if (!channels) {
        // Unsubscribe from all channels
        const subscription = await this.getSubscription(connectionId);
        if (subscription) {
          channels = subscription.channels;
        }
        
        // Remove subscription
        await this.redis.del(subscriptionKey);
      } else {
        // Unsubscribe from specific channels
        const subscription = await this.getSubscription(connectionId);
        if (subscription) {
          subscription.channels = subscription.channels.filter(c => !channels!.includes(c));
          
          if (subscription.channels.length === 0) {
            await this.redis.del(subscriptionKey);
          } else {
            await this.redis.set(subscriptionKey, JSON.stringify(subscription), 'EX', 86400);
          }
        }
      }

      // Remove connection from channel subscriber sets
      if (channels) {
        for (const channel of channels) {
          const channelKey = `${this.CHANNEL_SUBSCRIBERS_PREFIX}${channel}`;
          await this.redis.srem(channelKey, connectionId);
        }
      }

      console.log(`Connection ${connectionId} unsubscribed from ${channels?.length || 'all'} channels`);
    } catch (error) {
      console.error(`Error unsubscribing connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription for a connection
   */
  async getSubscription(connectionId: string): Promise<Subscription | null> {
    try {
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}${connectionId}`;
      const data = await this.redis.get(subscriptionKey);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error getting subscription for ${connectionId}:`, error);
      return null;
    }
  }

  /**
   * Get all subscribers for a channel
   */
  async getSubscribers(channel: string): Promise<string[]> {
    try {
      const channelKey = `${this.CHANNEL_SUBSCRIBERS_PREFIX}${channel}`;
      const subscribers = await this.redis.smembers(channelKey);
      return subscribers;
    } catch (error) {
      console.error(`Error getting subscribers for channel ${channel}:`, error);
      return [];
    }
  }

  /**
   * Get filtered subscribers for an event
   * Returns only subscribers whose filters match the event
   */
  async getFilteredSubscribers(
    channel: string,
    event: BaseEvent
  ): Promise<string[]> {
    try {
      const allSubscribers = await this.getSubscribers(channel);
      const filteredSubscribers: string[] = [];

      for (const connectionId of allSubscribers) {
        const subscription = await this.getSubscription(connectionId);
        
        if (!subscription) continue;
        
        // If no filters, include subscriber
        if (!subscription.filters) {
          filteredSubscribers.push(connectionId);
          continue;
        }

        // Check if event matches filters
        if (await this.matchesFilters(event, subscription.filters)) {
          filteredSubscribers.push(connectionId);
        }
      }

      return filteredSubscribers;
    } catch (error) {
      console.error(`Error getting filtered subscribers for channel ${channel}:`, error);
      return [];
    }
  }

  /**
   * Check if event matches subscription filters
   */
  async matchesFilters(
    event: BaseEvent,
    filters: SubscriptionFilters
  ): Promise<boolean> {
    try {
      // Filter by event type
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        if (!filters.eventTypes.includes(event.eventType)) {
          return false;
        }
      }

      // Filter by protocol ID (for TVL events)
      if (filters.protocolIds && filters.protocolIds.length > 0) {
        if (event.eventType === 'tvl_change') {
          const tvlEvent = event as TvlChangeEvent;
          if (!filters.protocolIds.includes(tvlEvent.data.protocolId)) {
            return false;
          }
        }
      }

      // Filter by token ID (for price events)
      if (filters.tokenIds && filters.tokenIds.length > 0) {
        if (event.eventType === 'price_update') {
          const priceEvent = event as PriceUpdateEvent;
          if (!filters.tokenIds.includes(priceEvent.data.tokenId)) {
            return false;
          }
        }
      }

      // Filter by chain
      if (filters.chains && filters.chains.length > 0) {
        let eventChain: string | undefined;
        
        if (event.eventType === 'price_update') {
          eventChain = (event as PriceUpdateEvent).data.chain;
        } else if (event.eventType === 'tvl_change') {
          eventChain = (event as TvlChangeEvent).data.chain;
        }
        
        if (eventChain && !filters.chains.includes(eventChain)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error matching filters:', error);
      return false;
    }
  }

  /**
   * Get subscription statistics
   */
  async getStats(): Promise<SubscriptionStats> {
    try {
      const subscriptionKeys = await this.redis.keys(`${this.SUBSCRIPTION_PREFIX}*`);
      const channelKeys = await this.redis.keys(`${this.CHANNEL_SUBSCRIBERS_PREFIX}*`);

      const subscriptionsByChannel: Record<string, number> = {};
      const subscriptionsByConnection: Record<string, number> = {};

      // Count subscribers per channel
      for (const channelKey of channelKeys) {
        const channel = channelKey.replace(this.CHANNEL_SUBSCRIBERS_PREFIX, '');
        const count = await this.redis.scard(channelKey);
        subscriptionsByChannel[channel] = count;
      }

      // Count channels per connection
      for (const subscriptionKey of subscriptionKeys) {
        const connectionId = subscriptionKey.replace(this.SUBSCRIPTION_PREFIX, '');
        const subscription = await this.getSubscription(connectionId);
        if (subscription) {
          subscriptionsByConnection[connectionId] = subscription.channels.length;
        }
      }

      return {
        totalSubscriptions: subscriptionKeys.length,
        subscriptionsByChannel,
        subscriptionsByConnection,
      };
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return {
        totalSubscriptions: 0,
        subscriptionsByChannel: {},
        subscriptionsByConnection: {},
      };
    }
  }

  /**
   * Clean up subscriptions for a disconnected connection
   */
  async cleanup(connectionId: string): Promise<void> {
    try {
      await this.unsubscribe(connectionId);
      console.log(`Cleaned up subscriptions for connection ${connectionId}`);
    } catch (error) {
      console.error(`Error cleaning up subscriptions for ${connectionId}:`, error);
    }
  }

  /**
   * Update subscription filters
   */
  async updateFilters(
    connectionId: string,
    filters: SubscriptionFilters
  ): Promise<Subscription | null> {
    try {
      const subscription = await this.getSubscription(connectionId);
      
      if (!subscription) {
        console.warn(`No subscription found for connection ${connectionId}`);
        return null;
      }

      subscription.filters = filters;
      
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}${connectionId}`;
      await this.redis.set(subscriptionKey, JSON.stringify(subscription), 'EX', 86400);

      console.log(`Updated filters for connection ${connectionId}`);
      return subscription;
    } catch (error) {
      console.error(`Error updating filters for ${connectionId}:`, error);
      return null;
    }
  }
}

