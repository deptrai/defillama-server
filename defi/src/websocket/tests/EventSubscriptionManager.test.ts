/**
 * Unit Tests for EventSubscriptionManager
 * Phase 5: WebSocket Integration
 */

import { EventSubscriptionManager, SubscriptionFilters } from '../services/EventSubscriptionManager';
import { BaseEvent, EventType, EventSource, PriceUpdateEvent, TvlChangeEvent } from '../../events/event-types';
import { getRedisClient, closeRedisConnection } from '../utils/redis';

describe('EventSubscriptionManager', () => {
  let manager: EventSubscriptionManager;
  const mockConnectionId = 'test-connection-123';

  beforeEach(async () => {
    manager = new EventSubscriptionManager();

    // Clear Redis test data
    const redis = getRedisClient();
    const keys = await redis.keys('ws:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    // Close Redis connection
    await closeRedisConnection();
  });

  describe('subscribe', () => {
    it('should subscribe connection to channels', async () => {
      const channels = ['events:prices', 'events:tvl'];
      const subscription = await manager.subscribe(mockConnectionId, channels);

      expect(subscription.connectionId).toBe(mockConnectionId);
      expect(subscription.channels).toEqual(channels);
      expect(subscription.subscribedAt).toBeGreaterThan(0);
    });

    it('should subscribe with filters', async () => {
      const channels = ['events:prices'];
      const filters: SubscriptionFilters = {
        tokenIds: ['ethereum'],
        chains: ['ethereum', 'polygon'],
      };

      const subscription = await manager.subscribe(mockConnectionId, channels, filters);

      expect(subscription.filters).toEqual(filters);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from specific channels', async () => {
      const channels = ['events:prices', 'events:tvl'];
      await manager.subscribe(mockConnectionId, channels);

      await manager.unsubscribe(mockConnectionId, ['events:prices']);

      const subscription = await manager.getSubscription(mockConnectionId);
      expect(subscription?.channels).toEqual(['events:tvl']);
    });

    it('should unsubscribe from all channels', async () => {
      const channels = ['events:prices', 'events:tvl'];
      await manager.subscribe(mockConnectionId, channels);

      await manager.unsubscribe(mockConnectionId);

      const subscription = await manager.getSubscription(mockConnectionId);
      expect(subscription).toBeNull();
    });
  });

  describe('getSubscription', () => {
    it('should return subscription for connection', async () => {
      const channels = ['events:prices'];
      await manager.subscribe(mockConnectionId, channels);

      const subscription = await manager.getSubscription(mockConnectionId);

      expect(subscription).not.toBeNull();
      expect(subscription?.connectionId).toBe(mockConnectionId);
      expect(subscription?.channels).toEqual(channels);
    });

    it('should return null for non-existent subscription', async () => {
      const subscription = await manager.getSubscription('non-existent');
      expect(subscription).toBeNull();
    });
  });

  describe('getSubscribers', () => {
    it('should return subscribers for channel', async () => {
      const channel = 'events:prices';
      await manager.subscribe(mockConnectionId, [channel]);
      await manager.subscribe('connection-2', [channel]);

      const subscribers = await manager.getSubscribers(channel);

      expect(subscribers).toContain(mockConnectionId);
      expect(subscribers).toContain('connection-2');
      expect(subscribers.length).toBe(2);
    });

    it('should return empty array for channel with no subscribers', async () => {
      const subscribers = await manager.getSubscribers('events:nonexistent');
      expect(subscribers).toEqual([]);
    });
  });

  describe('matchesFilters', () => {
    const mockPriceEvent: PriceUpdateEvent = {
      eventId: 'test-event-1',
      eventType: EventType.PRICE_UPDATE,
      timestamp: Date.now(),
      source: EventSource.SCHEDULED,
      version: '1.0',
      metadata: {
        correlationId: 'test-corr-1',
        confidence: 0.9,
        processingTime: 10,
        retryCount: 0,
        tags: ['price', 'ethereum'],
      },
      data: {
        tokenId: 'ethereum',
        symbol: 'ETH',
        chain: 'ethereum',
        previousPrice: 2500,
        currentPrice: 2750,
        changePercent: 10,
        changeAbsolute: 250,
        decimals: 18,
      },
    };

    const mockTvlEvent: TvlChangeEvent = {
      eventId: 'test-event-2',
      eventType: EventType.TVL_CHANGE,
      timestamp: Date.now(),
      source: EventSource.SCHEDULED,
      version: '1.0',
      metadata: {
        correlationId: 'test-corr-2',
        confidence: 0.9,
        processingTime: 10,
        retryCount: 0,
        tags: ['tvl', 'uniswap-v3'],
      },
      data: {
        protocolId: 'uniswap-v3',
        protocolName: 'Uniswap V3',
        previousTvl: 1000000000,
        currentTvl: 1100000000,
        changePercent: 10,
        changeAbsolute: 100000000,
      },
    };

    it('should match event with no filters', async () => {
      const filters: SubscriptionFilters = {};
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(true);
    });

    it('should match event by event type', async () => {
      const filters: SubscriptionFilters = {
        eventTypes: ['price_update'],
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(true);
    });

    it('should not match event with wrong event type', async () => {
      const filters: SubscriptionFilters = {
        eventTypes: ['tvl_change'],
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(false);
    });

    it('should match price event by token ID', async () => {
      const filters: SubscriptionFilters = {
        tokenIds: ['ethereum'],
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(true);
    });

    it('should not match price event with wrong token ID', async () => {
      const filters: SubscriptionFilters = {
        tokenIds: ['bitcoin'],
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(false);
    });

    it('should match TVL event by protocol ID', async () => {
      const filters: SubscriptionFilters = {
        protocolIds: ['uniswap-v3'],
      };
      const matches = await manager.matchesFilters(mockTvlEvent, filters);
      expect(matches).toBe(true);
    });

    it('should not match TVL event with wrong protocol ID', async () => {
      const filters: SubscriptionFilters = {
        protocolIds: ['aave'],
      };
      const matches = await manager.matchesFilters(mockTvlEvent, filters);
      expect(matches).toBe(false);
    });

    it('should match event by chain', async () => {
      const filters: SubscriptionFilters = {
        chains: ['ethereum'],
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(true);
    });

    it('should not match event with wrong chain', async () => {
      const filters: SubscriptionFilters = {
        chains: ['polygon'],
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(false);
    });

    it('should match event with multiple filters', async () => {
      const filters: SubscriptionFilters = {
        eventTypes: ['price_update'],
        tokenIds: ['ethereum'],
        chains: ['ethereum'],
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(true);
    });

    it('should not match event if any filter fails', async () => {
      const filters: SubscriptionFilters = {
        eventTypes: ['price_update'],
        tokenIds: ['ethereum'],
        chains: ['polygon'], // Wrong chain
      };
      const matches = await manager.matchesFilters(mockPriceEvent, filters);
      expect(matches).toBe(false);
    });
  });

  describe('getFilteredSubscribers', () => {
    const mockPriceEvent: PriceUpdateEvent = {
      eventId: 'test-event-1',
      eventType: EventType.PRICE_UPDATE,
      timestamp: Date.now(),
      source: EventSource.SCHEDULED,
      version: '1.0',
      metadata: {
        correlationId: 'test-corr-1',
        confidence: 0.9,
        processingTime: 10,
        retryCount: 0,
        tags: ['price', 'ethereum'],
      },
      data: {
        tokenId: 'ethereum',
        symbol: 'ETH',
        chain: 'ethereum',
        previousPrice: 2500,
        currentPrice: 2750,
        changePercent: 10,
        changeAbsolute: 250,
        decimals: 18,
      },
    };

    it('should return all subscribers with no filters', async () => {
      const channel = 'events:prices';
      await manager.subscribe('conn-1', [channel]);
      await manager.subscribe('conn-2', [channel]);

      const subscribers = await manager.getFilteredSubscribers(channel, mockPriceEvent);

      expect(subscribers).toContain('conn-1');
      expect(subscribers).toContain('conn-2');
      expect(subscribers.length).toBe(2);
    });

    it('should filter subscribers by token ID', async () => {
      const channel = 'events:prices';
      await manager.subscribe('conn-1', [channel], { tokenIds: ['ethereum'] });
      await manager.subscribe('conn-2', [channel], { tokenIds: ['bitcoin'] });

      const subscribers = await manager.getFilteredSubscribers(channel, mockPriceEvent);

      expect(subscribers).toContain('conn-1');
      expect(subscribers).not.toContain('conn-2');
      expect(subscribers.length).toBe(1);
    });
  });

  describe('updateFilters', () => {
    it('should update filters for subscription', async () => {
      const channels = ['events:prices'];
      await manager.subscribe(mockConnectionId, channels);

      const newFilters: SubscriptionFilters = {
        tokenIds: ['ethereum', 'bitcoin'],
      };

      const updated = await manager.updateFilters(mockConnectionId, newFilters);

      expect(updated).not.toBeNull();
      expect(updated?.filters).toEqual(newFilters);
    });

    it('should return null for non-existent subscription', async () => {
      const newFilters: SubscriptionFilters = {
        tokenIds: ['ethereum'],
      };

      const updated = await manager.updateFilters('non-existent', newFilters);
      expect(updated).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clean up all subscriptions for connection', async () => {
      const channels = ['events:prices', 'events:tvl'];
      await manager.subscribe(mockConnectionId, channels);

      await manager.cleanup(mockConnectionId);

      const subscription = await manager.getSubscription(mockConnectionId);
      expect(subscription).toBeNull();
    });
  });
});

