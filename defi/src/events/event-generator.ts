/**
 * Event Generator
 * Generates structured events from detected changes
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BaseEvent,
  PriceUpdateEvent,
  TvlChangeEvent,
  ProtocolUpdateEvent,
  DetectedChange,
  EventType,
  EventSource,
} from './event-types';

/**
 * Generate correlation ID for related events
 */
export function generateCorrelationId(change: DetectedChange): string {
  // Use PK + timestamp to create correlation ID
  return `${change.pk}-${Math.floor(change.timestamp / 3600)}`;
}

/**
 * Calculate confidence score based on data quality
 */
export function calculateConfidence(change: DetectedChange): number {
  let confidence = 0.9; // Base confidence

  // Reduce confidence for extreme changes
  if (Math.abs(change.changePercent) > 50) {
    confidence -= 0.1;
  }
  if (Math.abs(change.changePercent) > 100) {
    confidence -= 0.2;
  }

  // Reduce confidence if missing optional data
  if (change.type === 'tvl' && !change.protocolName) {
    confidence -= 0.05;
  }
  if (change.type === 'price' && !change.symbol) {
    confidence -= 0.05;
  }

  return Math.max(0.5, Math.min(1.0, confidence));
}

/**
 * Generate tags for event routing
 */
export function generateTags(change: DetectedChange): string[] {
  const tags: string[] = [change.type];

  if (change.protocolId) {
    tags.push(change.protocolId);
  }
  if (change.tokenId) {
    tags.push(change.tokenId);
  }
  if (change.chain) {
    tags.push(change.chain);
  }

  // Add magnitude tags
  const absChange = Math.abs(change.changePercent);
  if (absChange > 10) {
    tags.push('large-change');
  }
  if (absChange > 50) {
    tags.push('extreme-change');
  }

  return tags;
}

/**
 * Generate price update event
 */
export function generatePriceUpdateEvent(
  change: DetectedChange,
  processingStartTime: number
): PriceUpdateEvent {
  const eventId = uuidv4();
  const timestamp = Date.now();
  const processingTime = timestamp - processingStartTime;

  return {
    eventId,
    eventType: EventType.PRICE_UPDATE,
    timestamp,
    source: EventSource.SCHEDULED,
    version: '1.0',
    metadata: {
      correlationId: generateCorrelationId(change),
      confidence: calculateConfidence(change),
      processingTime,
      retryCount: 0,
      tags: generateTags(change),
    },
    data: {
      tokenId: change.tokenId || '',
      symbol: change.symbol || '',
      chain: change.chain || '',
      previousPrice: change.oldValue,
      currentPrice: change.newValue,
      changePercent: change.changePercent,
      changeAbsolute: change.changeAbsolute,
      decimals: change.decimals || 18,
      volume24h: change.rawData.volume24h,
      marketCap: change.rawData.marketCap,
    },
  };
}

/**
 * Generate TVL change event
 */
export function generateTvlChangeEvent(
  change: DetectedChange,
  processingStartTime: number
): TvlChangeEvent {
  const eventId = uuidv4();
  const timestamp = Date.now();
  const processingTime = timestamp - processingStartTime;

  return {
    eventId,
    eventType: EventType.TVL_CHANGE,
    timestamp,
    source: EventSource.SCHEDULED,
    version: '1.0',
    metadata: {
      correlationId: generateCorrelationId(change),
      confidence: calculateConfidence(change),
      processingTime,
      retryCount: 0,
      tags: generateTags(change),
    },
    data: {
      protocolId: change.protocolId || '',
      protocolName: change.protocolName || change.protocolId || '',
      chain: change.chain,
      previousTvl: change.oldValue,
      currentTvl: change.newValue,
      changePercent: change.changePercent,
      changeAbsolute: change.changeAbsolute,
      breakdown: change.rawData.breakdown,
      tokens: change.rawData.tokens,
    },
  };
}

/**
 * Generate protocol update event
 */
export function generateProtocolUpdateEvent(
  change: DetectedChange,
  processingStartTime: number
): ProtocolUpdateEvent {
  const eventId = uuidv4();
  const timestamp = Date.now();
  const processingTime = timestamp - processingStartTime;

  return {
    eventId,
    eventType: EventType.PROTOCOL_UPDATE,
    timestamp,
    source: EventSource.SCHEDULED,
    version: '1.0',
    metadata: {
      correlationId: generateCorrelationId(change),
      confidence: calculateConfidence(change),
      processingTime,
      retryCount: 0,
      tags: generateTags(change),
    },
    data: {
      protocolId: change.protocolId || '',
      protocolName: change.protocolName || change.protocolId || '',
      updateType: 'metadata' as any,
      changes: [
        {
          field: 'value',
          previousValue: change.oldValue,
          currentValue: change.newValue,
        },
      ],
    },
  };
}

/**
 * Generate event from detected change
 */
export function generateEvent(
  change: DetectedChange,
  processingStartTime: number = Date.now()
): BaseEvent {
  switch (change.type) {
    case 'price':
      return generatePriceUpdateEvent(change, processingStartTime);
    case 'tvl':
      return generateTvlChangeEvent(change, processingStartTime);
    case 'protocol':
      return generateProtocolUpdateEvent(change, processingStartTime);
    default:
      throw new Error(`Unknown change type: ${change.type}`);
  }
}

/**
 * Batch generate events
 */
export function batchGenerateEvents(
  changes: DetectedChange[],
  processingStartTime: number = Date.now()
): BaseEvent[] {
  return changes.map(change => generateEvent(change, processingStartTime));
}

/**
 * Enrich event with additional metadata
 */
export async function enrichEvent(
  event: BaseEvent,
  getProtocolMetadata?: (protocolId: string) => Promise<any>,
  getTokenMetadata?: (tokenId: string) => Promise<any>
): Promise<BaseEvent> {
  try {
    // Enrich TVL events with protocol metadata
    if (event.eventType === EventType.TVL_CHANGE && getProtocolMetadata) {
      const tvlEvent = event as TvlChangeEvent;
      const metadata = await getProtocolMetadata(tvlEvent.data.protocolId);
      if (metadata) {
        tvlEvent.data.protocolName = metadata.name || tvlEvent.data.protocolName;
        if (metadata.categories) {
          tvlEvent.metadata.tags.push(...metadata.categories);
        }
      }
    }

    // Enrich price events with token metadata
    if (event.eventType === EventType.PRICE_UPDATE && getTokenMetadata) {
      const priceEvent = event as PriceUpdateEvent;
      const metadata = await getTokenMetadata(priceEvent.data.tokenId);
      if (metadata) {
        priceEvent.data.symbol = metadata.symbol || priceEvent.data.symbol;
        priceEvent.data.decimals = metadata.decimals || priceEvent.data.decimals;
      }
    }

    return event;
  } catch (error) {
    console.error('Error enriching event:', error);
    return event;
  }
}

/**
 * Batch enrich events
 */
export async function batchEnrichEvents(
  events: BaseEvent[],
  getProtocolMetadata?: (protocolId: string) => Promise<any>,
  getTokenMetadata?: (tokenId: string) => Promise<any>
): Promise<BaseEvent[]> {
  return Promise.all(
    events.map(event => enrichEvent(event, getProtocolMetadata, getTokenMetadata))
  );
}

/**
 * Validate generated event
 */
export function validateEvent(event: BaseEvent): boolean {
  if (!event.eventId || !event.eventType || !event.timestamp) {
    return false;
  }

  if (!event.metadata || !event.metadata.correlationId) {
    return false;
  }

  // Type-specific validation
  if (event.eventType === EventType.PRICE_UPDATE) {
    const priceEvent = event as PriceUpdateEvent;
    if (!priceEvent.data.tokenId || typeof priceEvent.data.currentPrice !== 'number') {
      return false;
    }
  }

  if (event.eventType === EventType.TVL_CHANGE) {
    const tvlEvent = event as TvlChangeEvent;
    if (!tvlEvent.data.protocolId || typeof tvlEvent.data.currentTvl !== 'number') {
      return false;
    }
  }

  return true;
}

/**
 * Filter valid events
 */
export function filterValidEvents(events: BaseEvent[]): {
  valid: BaseEvent[];
  invalid: BaseEvent[];
} {
  const valid: BaseEvent[] = [];
  const invalid: BaseEvent[] = [];

  for (const event of events) {
    if (validateEvent(event)) {
      valid.push(event);
    } else {
      invalid.push(event);
    }
  }

  return { valid, invalid };
}

