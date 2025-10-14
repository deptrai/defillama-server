/**
 * Redis Publisher
 * Publishes events to Redis pub/sub channels
 */

import {
  BaseEvent,
  PriceUpdateEvent,
  TvlChangeEvent,
  EventType,
  REDIS_CHANNELS,
} from '../events/event-types';
import { getRedisClient } from '../redis/cache-manager';

/**
 * Publish event to Redis pub/sub
 */
export async function publishEvent(event: BaseEvent): Promise<void> {
  try {
    const redis = getRedisClient();
    const message = JSON.stringify(event);
    
    // Publish to general channel based on event type
    const generalChannel = getGeneralChannel(event.eventType);
    await redis.publish(generalChannel, message);
    
    // Publish to specific channels
    await publishToSpecificChannels(event, message);
    
  } catch (error) {
    console.error('Error publishing event to Redis:', error);
    throw error;
  }
}

/**
 * Get general channel for event type
 */
function getGeneralChannel(eventType: EventType): string {
  switch (eventType) {
    case EventType.PRICE_UPDATE:
      return REDIS_CHANNELS.PRICES;
    case EventType.TVL_CHANGE:
      return REDIS_CHANNELS.TVL;
    case EventType.PROTOCOL_UPDATE:
      return REDIS_CHANNELS.PROTOCOLS;
    case EventType.ALERT:
      return REDIS_CHANNELS.ALERTS;
    default:
      return 'events:general';
  }
}

/**
 * Publish to specific channels based on event data
 */
async function publishToSpecificChannels(
  event: BaseEvent,
  message: string
): Promise<void> {
  const redis = getRedisClient();
  
  if (event.eventType === EventType.PRICE_UPDATE) {
    const priceEvent = event as PriceUpdateEvent;
    
    // Token-specific channel
    if (priceEvent.data.tokenId) {
      const tokenChannel = REDIS_CHANNELS.TOKEN(priceEvent.data.tokenId);
      await redis.publish(tokenChannel, message);
    }
    
    // Chain-specific channel
    if (priceEvent.data.chain) {
      const chainChannel = REDIS_CHANNELS.CHAIN_PRICES(priceEvent.data.chain);
      await redis.publish(chainChannel, message);
    }
  }
  
  if (event.eventType === EventType.TVL_CHANGE) {
    const tvlEvent = event as TvlChangeEvent;
    
    // Protocol-specific channel
    if (tvlEvent.data.protocolId) {
      const protocolChannel = REDIS_CHANNELS.PROTOCOL(tvlEvent.data.protocolId);
      await redis.publish(protocolChannel, message);
    }
    
    // Chain-specific channel
    if (tvlEvent.data.chain) {
      const chainChannel = REDIS_CHANNELS.CHAIN_TVL(tvlEvent.data.chain);
      await redis.publish(chainChannel, message);
    }
  }
}

/**
 * Batch publish events
 */
export async function batchPublishEvents(events: BaseEvent[]): Promise<void> {
  await Promise.all(events.map(event => publishEvent(event)));
}

/**
 * Publish with retry
 */
export async function publishEventWithRetry(
  event: BaseEvent,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await publishEvent(event);
      return;
    } catch (error) {
      lastError = error as Error;
      console.error(`Retry ${i + 1}/${maxRetries} failed:`, error);
      
      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
      }
    }
  }
  
  throw lastError;
}

/**
 * Get channel subscriber count
 */
export async function getChannelSubscriberCount(
  channel: string
): Promise<number> {
  try {
    const redis = getRedisClient();
    const result = await redis.pubsub('NUMSUB', channel);
    
    // Result format: [channel, count, ...]
    if (result && result.length >= 2) {
      return parseInt(result[1] as string);
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting subscriber count:', error);
    return 0;
  }
}

/**
 * Get all active channels
 */
export async function getActiveChannels(): Promise<string[]> {
  try {
    const redis = getRedisClient();
    const channels = await redis.pubsub('CHANNELS', 'events:*');
    return channels;
  } catch (error) {
    console.error('Error getting active channels:', error);
    return [];
  }
}

/**
 * Get publishing statistics
 */
export async function getPublishingStats(): Promise<{
  activeChannels: number;
  totalSubscribers: number;
  channelDetails: { channel: string; subscribers: number }[];
}> {
  try {
    const channels = await getActiveChannels();
    const channelDetails = await Promise.all(
      channels.map(async (channel) => ({
        channel,
        subscribers: await getChannelSubscriberCount(channel),
      }))
    );
    
    const totalSubscribers = channelDetails.reduce(
      (sum, detail) => sum + detail.subscribers,
      0
    );
    
    return {
      activeChannels: channels.length,
      totalSubscribers,
      channelDetails,
    };
  } catch (error) {
    console.error('Error getting publishing stats:', error);
    return {
      activeChannels: 0,
      totalSubscribers: 0,
      channelDetails: [],
    };
  }
}

