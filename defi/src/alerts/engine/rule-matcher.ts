/**
 * Rule Matcher
 * Matches alert rules with incoming events
 * Story 1.3: Alert Engine and Notification System - Task 3
 */

import postgres from 'postgres';
import { AlertRule, AlertType } from '../types';
import {
  BaseEvent,
  PriceUpdateEvent,
  TvlChangeEvent,
  ProtocolUpdateEvent,
  EventType,
} from '../../events/event-types';
import { getAlertsDBConnection } from '../db';

// ============================================================================
// Event Type to Alert Type Mapping
// ============================================================================

/**
 * Map event type to compatible alert types
 */
export function getCompatibleAlertTypes(eventType: EventType): AlertType[] {
  switch (eventType) {
    case EventType.PRICE_UPDATE:
      return ['price_change', 'volume_spike'];
    
    case EventType.TVL_CHANGE:
      return ['tvl_change'];
    
    case EventType.PROTOCOL_UPDATE:
      return ['protocol_event'];
    
    default:
      return [];
  }
}

// ============================================================================
// Target Extraction
// ============================================================================

/**
 * Extract target identifiers from event
 */
export function extractEventTargets(event: BaseEvent): {
  protocolId?: string;
  tokenId?: string;
  chainId?: number;
} {
  switch (event.eventType) {
    case EventType.PRICE_UPDATE: {
      const priceEvent = event as PriceUpdateEvent;
      return {
        tokenId: priceEvent.data.tokenId,
        chainId: getChainId(priceEvent.data.chain),
      };
    }
    
    case EventType.TVL_CHANGE: {
      const tvlEvent = event as TvlChangeEvent;
      return {
        protocolId: tvlEvent.data.protocolId,
        chainId: tvlEvent.data.chain ? getChainId(tvlEvent.data.chain) : undefined,
      };
    }
    
    case EventType.PROTOCOL_UPDATE: {
      const protocolEvent = event as ProtocolUpdateEvent;
      return {
        protocolId: protocolEvent.data.protocolId,
        chainId: protocolEvent.data.chain ? getChainId(protocolEvent.data.chain) : undefined,
      };
    }
    
    default:
      return {};
  }
}

/**
 * Convert chain name to chain ID
 * TODO: Use proper chain ID mapping from shared utils
 */
function getChainId(chain: string): number | undefined {
  const chainMap: { [key: string]: number } = {
    'ethereum': 1,
    'bsc': 56,
    'polygon': 137,
    'arbitrum': 42161,
    'optimism': 10,
    'avalanche': 43114,
    'fantom': 250,
  };
  return chainMap[chain.toLowerCase()];
}

// ============================================================================
// Rule Matching
// ============================================================================

/**
 * Match rules from database
 */
export async function matchRulesFromDB(
  event: BaseEvent
): Promise<AlertRule[]> {
  const sql = getAlertsDBConnection();
  
  // Get compatible alert types
  const alertTypes = getCompatibleAlertTypes(event.eventType);
  if (alertTypes.length === 0) {
    return [];
  }
  
  // Extract targets
  const targets = extractEventTargets(event);
  
  // Build WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  // Alert type filter
  conditions.push(`alert_type = ANY($${paramIndex})`);
  params.push(alertTypes);
  paramIndex++;
  
  // Enabled filter
  conditions.push(`enabled = $${paramIndex}`);
  params.push(true);
  paramIndex++;
  
  // Target filters (OR logic)
  const targetConditions: string[] = [];
  
  if (targets.protocolId) {
    targetConditions.push(`protocol_id = $${paramIndex}`);
    params.push(targets.protocolId);
    paramIndex++;
  }
  
  if (targets.tokenId) {
    targetConditions.push(`token_id = $${paramIndex}`);
    params.push(targets.tokenId);
    paramIndex++;
  }
  
  if (targets.chainId) {
    targetConditions.push(`chain_id = $${paramIndex}`);
    params.push(targets.chainId);
    paramIndex++;
  }
  
  if (targetConditions.length > 0) {
    conditions.push(`(${targetConditions.join(' OR ')})`);
  } else {
    // No targets to match
    return [];
  }
  
  // Build query
  const whereClause = conditions.join(' AND ');
  const query = `
    SELECT * FROM alert_rules
    WHERE ${whereClause}
    ORDER BY created_at DESC
  `;
  
  // Execute query
  const results = await sql.unsafe(query, params);
  
  // Map results to AlertRule objects
  const rules: AlertRule[] = results.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    alert_type: row.alert_type,
    protocol_id: row.protocol_id,
    token_id: row.token_id,
    chain_id: row.chain_id,
    condition: typeof row.condition === 'string' ? JSON.parse(row.condition) : row.condition,
    channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels,
    throttle_minutes: row.throttle_minutes,
    enabled: row.enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_triggered_at: row.last_triggered_at,
  }));
  
  return rules;
}

// ============================================================================
// Rule Filtering
// ============================================================================

/**
 * Filter rules by exact target match
 */
export function filterRulesByTarget(
  rules: AlertRule[],
  event: BaseEvent
): AlertRule[] {
  const targets = extractEventTargets(event);
  
  return rules.filter(rule => {
    // Check protocol_id match
    if (rule.protocol_id && targets.protocolId) {
      if (rule.protocol_id === targets.protocolId) {
        return true;
      }
    }
    
    // Check token_id match
    if (rule.token_id && targets.tokenId) {
      if (rule.token_id === targets.tokenId) {
        return true;
      }
    }
    
    // Check chain_id match
    if (rule.chain_id && targets.chainId) {
      if (rule.chain_id === targets.chainId) {
        return true;
      }
    }
    
    return false;
  });
}

// ============================================================================
// Main Matching Function
// ============================================================================

/**
 * Match rules for event
 */
export async function matchRules(event: BaseEvent): Promise<AlertRule[]> {
  // Get rules from database
  const rules = await matchRulesFromDB(event);
  
  // Filter by exact target match
  const matchedRules = filterRulesByTarget(rules, event);
  
  return matchedRules;
}

// ============================================================================
// Matching Statistics
// ============================================================================

export interface MatchingStats {
  totalRules: number;
  matchedRules: number;
  eventType: EventType;
  targets: {
    protocolId?: string;
    tokenId?: string;
    chainId?: number;
  };
  alertTypes: AlertType[];
}

/**
 * Get matching statistics
 */
export async function getMatchingStats(event: BaseEvent): Promise<MatchingStats> {
  const rules = await matchRulesFromDB(event);
  const matchedRules = filterRulesByTarget(rules, event);
  
  return {
    totalRules: rules.length,
    matchedRules: matchedRules.length,
    eventType: event.eventType,
    targets: extractEventTargets(event),
    alertTypes: getCompatibleAlertTypes(event.eventType),
  };
}

