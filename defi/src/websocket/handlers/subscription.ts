/**
 * WebSocket Subscription Handlers
 * Handles client subscriptions to event channels
 * Phase 5: WebSocket Integration
 */

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MessageRouter } from '../services/MessageRouter';
import { SubscriptionFilters } from '../services/EventSubscriptionManager';
import { successResponse, errorResponse } from '../../utils/shared/lambda-response';

const messageRouter = new MessageRouter();
const subscriptionManager = messageRouter.getSubscriptionManager();

/**
 * Subscribe Handler
 * Allows clients to subscribe to event channels with optional filters
 */
export const subscribeHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const connectionId = event.requestContext.connectionId;
    
    if (!connectionId) {
      return errorResponse(400, 'Connection ID required');
    }

    if (!event.body) {
      return errorResponse(400, 'Request body required');
    }

    const body = JSON.parse(event.body);
    const { channels, filters } = body;

    // Validate channels
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return errorResponse(400, 'Channels array required');
    }

    // Validate channel format
    const validChannelPattern = /^events:(prices|tvl|protocols|alerts|token:.+|protocol:.+|chain:.+)$/;
    const invalidChannels = channels.filter((ch: string) => !validChannelPattern.test(ch));
    
    if (invalidChannels.length > 0) {
      return errorResponse(400, `Invalid channels: ${invalidChannels.join(', ')}`);
    }

    // Subscribe
    const subscription = await subscriptionManager.subscribe(
      connectionId,
      channels,
      filters as SubscriptionFilters
    );

    console.log(`Connection ${connectionId} subscribed to ${channels.length} channels`);

    return successResponse({
      type: 'subscription_confirmed',
      subscription: {
        channels: subscription.channels,
        filters: subscription.filters,
        subscribedAt: subscription.subscribedAt,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error in subscribe handler:', error);
    return errorResponse(500, 'Subscription failed');
  }
};

/**
 * Unsubscribe Handler
 * Allows clients to unsubscribe from event channels
 */
export const unsubscribeHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const connectionId = event.requestContext.connectionId;
    
    if (!connectionId) {
      return errorResponse(400, 'Connection ID required');
    }

    let channels: string[] | undefined;

    if (event.body) {
      const body = JSON.parse(event.body);
      channels = body.channels;
    }

    // Unsubscribe
    await subscriptionManager.unsubscribe(connectionId, channels);

    console.log(`Connection ${connectionId} unsubscribed from ${channels?.length || 'all'} channels`);

    return successResponse({
      type: 'unsubscription_confirmed',
      channels: channels || 'all',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error in unsubscribe handler:', error);
    return errorResponse(500, 'Unsubscription failed');
  }
};

/**
 * Get Subscriptions Handler
 * Returns current subscriptions for a connection
 */
export const getSubscriptionsHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const connectionId = event.requestContext.connectionId;
    
    if (!connectionId) {
      return errorResponse(400, 'Connection ID required');
    }

    const subscription = await subscriptionManager.getSubscription(connectionId);

    if (!subscription) {
      return successResponse({
        type: 'subscriptions',
        subscription: null,
        message: 'No active subscriptions',
        timestamp: Date.now(),
      });
    }

    return successResponse({
      type: 'subscriptions',
      subscription: {
        channels: subscription.channels,
        filters: subscription.filters,
        subscribedAt: subscription.subscribedAt,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error in get subscriptions handler:', error);
    return errorResponse(500, 'Failed to get subscriptions');
  }
};

/**
 * Update Filters Handler
 * Updates subscription filters for a connection
 */
export const updateFiltersHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const connectionId = event.requestContext.connectionId;
    
    if (!connectionId) {
      return errorResponse(400, 'Connection ID required');
    }

    if (!event.body) {
      return errorResponse(400, 'Request body required');
    }

    const body = JSON.parse(event.body);
    const { filters } = body;

    if (!filters) {
      return errorResponse(400, 'Filters required');
    }

    // Update filters
    const subscription = await subscriptionManager.updateFilters(
      connectionId,
      filters as SubscriptionFilters
    );

    if (!subscription) {
      return errorResponse(404, 'No active subscription found');
    }

    console.log(`Connection ${connectionId} updated filters`);

    return successResponse({
      type: 'filters_updated',
      subscription: {
        channels: subscription.channels,
        filters: subscription.filters,
        subscribedAt: subscription.subscribedAt,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error in update filters handler:', error);
    return errorResponse(500, 'Failed to update filters');
  }
};

/**
 * Subscription Stats Handler
 * Returns subscription statistics
 */
export const subscriptionStatsHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const stats = await subscriptionManager.getStats();

    return successResponse({
      type: 'subscription_stats',
      stats,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error in subscription stats handler:', error);
    return errorResponse(500, 'Failed to get subscription stats');
  }
};

/**
 * Start Event Listener Handler
 * Starts the Redis pub/sub event listener
 * Should be called once when the WebSocket API starts
 */
export const startEventListenerHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (messageRouter.isEventListenerRunning()) {
      return successResponse({
        type: 'event_listener_status',
        status: 'already_running',
        timestamp: Date.now(),
      });
    }

    await messageRouter.startEventListener();

    return successResponse({
      type: 'event_listener_status',
      status: 'started',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error starting event listener:', error);
    return errorResponse(500, 'Failed to start event listener');
  }
};

/**
 * Stop Event Listener Handler
 * Stops the Redis pub/sub event listener
 */
export const stopEventListenerHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    await messageRouter.stopEventListener();

    return successResponse({
      type: 'event_listener_status',
      status: 'stopped',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error stopping event listener:', error);
    return errorResponse(500, 'Failed to stop event listener');
  }
};

