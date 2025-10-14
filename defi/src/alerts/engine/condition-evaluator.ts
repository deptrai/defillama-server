/**
 * Condition Evaluator
 * Evaluates alert conditions against event data
 * Story 1.3: Alert Engine and Notification System - Task 2
 */

import {
  AlertCondition,
  SimpleCondition,
  ComplexCondition,
  ConditionOperator,
  MetricType,
} from '../types';
import {
  BaseEvent,
  PriceUpdateEvent,
  TvlChangeEvent,
  ProtocolUpdateEvent,
  EventType,
} from '../../events/event-types';

// ============================================================================
// Type Guards
// ============================================================================

function isSimpleCondition(condition: AlertCondition): condition is SimpleCondition {
  return 'operator' in condition && 'threshold' in condition && 'metric' in condition;
}

function isComplexCondition(condition: AlertCondition): condition is ComplexCondition {
  return 'type' in condition && 'conditions' in condition;
}

// ============================================================================
// Metric Extraction
// ============================================================================

/**
 * Extract metric value from event data
 */
export function extractMetricValue(event: BaseEvent, metric: MetricType): number | null {
  switch (event.eventType) {
    case EventType.PRICE_UPDATE:
      return extractPriceMetric(event as PriceUpdateEvent, metric);
    
    case EventType.TVL_CHANGE:
      return extractTvlMetric(event as TvlChangeEvent, metric);
    
    case EventType.PROTOCOL_UPDATE:
      return extractProtocolMetric(event as ProtocolUpdateEvent, metric);
    
    default:
      return null;
  }
}

function extractPriceMetric(event: PriceUpdateEvent, metric: MetricType): number | null {
  switch (metric) {
    case 'price':
      return event.data.currentPrice;
    
    case 'price_change_24h':
      return event.data.changePercent;
    
    case 'volume_24h':
      return event.data.volume24h ?? null;
    
    case 'market_cap':
      return event.data.marketCap ?? null;
    
    default:
      return null;
  }
}

function extractTvlMetric(event: TvlChangeEvent, metric: MetricType): number | null {
  switch (metric) {
    case 'tvl':
      return event.data.currentTvl;
    
    case 'price_change_24h':  // TVL change percent
      return event.data.changePercent;
    
    default:
      return null;
  }
}

function extractProtocolMetric(event: ProtocolUpdateEvent, metric: MetricType): number | null {
  // Protocol events don't have numeric metrics
  // They are evaluated based on updateType
  return null;
}

// ============================================================================
// Operator Evaluation
// ============================================================================

/**
 * Evaluate operator comparison
 */
export function evaluateOperator(
  value: number,
  operator: ConditionOperator,
  threshold: number
): boolean {
  switch (operator) {
    case '>':
      return value > threshold;
    
    case '<':
      return value < threshold;
    
    case '>=':
      return value >= threshold;
    
    case '<=':
      return value <= threshold;
    
    case '==':
      return Math.abs(value - threshold) < 0.0001;  // Float comparison with epsilon
    
    case '!=':
      return Math.abs(value - threshold) >= 0.0001;
    
    default:
      return false;
  }
}

// ============================================================================
// Simple Condition Evaluation
// ============================================================================

/**
 * Evaluate simple condition
 */
export function evaluateSimpleCondition(
  condition: SimpleCondition,
  event: BaseEvent
): { result: boolean; value: number | null; message: string } {
  // Extract metric value from event
  const value = extractMetricValue(event, condition.metric);
  
  if (value === null) {
    return {
      result: false,
      value: null,
      message: `Metric ${condition.metric} not available in event`,
    };
  }
  
  // Apply unit conversion if needed
  let comparisonValue = value;
  if (condition.unit === 'percent') {
    // Value is already in percent for change metrics
    comparisonValue = value;
  }
  
  // Evaluate operator
  const result = evaluateOperator(comparisonValue, condition.operator, condition.threshold);
  
  // Generate message
  const message = result
    ? `${condition.metric} ${comparisonValue} ${condition.operator} ${condition.threshold}${condition.unit === 'percent' ? '%' : ''}`
    : `${condition.metric} ${comparisonValue} not ${condition.operator} ${condition.threshold}${condition.unit === 'percent' ? '%' : ''}`;
  
  return {
    result,
    value: comparisonValue,
    message,
  };
}

// ============================================================================
// Complex Condition Evaluation
// ============================================================================

/**
 * Evaluate complex condition (recursive)
 */
export function evaluateComplexCondition(
  condition: ComplexCondition,
  event: BaseEvent
): { result: boolean; details: string[] } {
  const details: string[] = [];
  const results: boolean[] = [];
  
  for (const subCondition of condition.conditions) {
    if (isSimpleCondition(subCondition)) {
      const evaluation = evaluateSimpleCondition(subCondition, event);
      results.push(evaluation.result);
      details.push(evaluation.message);
    } else if (isComplexCondition(subCondition)) {
      const evaluation = evaluateComplexCondition(subCondition, event);
      results.push(evaluation.result);
      details.push(`(${evaluation.details.join(` ${subCondition.type.toUpperCase()} `)})`);
    }
  }
  
  // Apply AND/OR logic
  const result = condition.type === 'and'
    ? results.every(r => r)
    : results.some(r => r);
  
  return {
    result,
    details,
  };
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Evaluate alert condition against event
 */
export function evaluateCondition(
  condition: AlertCondition,
  event: BaseEvent
): {
  result: boolean;
  triggeredValue: number | null;
  thresholdValue: number | null;
  message: string;
} {
  if (isSimpleCondition(condition)) {
    const evaluation = evaluateSimpleCondition(condition, event);
    return {
      result: evaluation.result,
      triggeredValue: evaluation.value,
      thresholdValue: condition.threshold,
      message: evaluation.message,
    };
  } else if (isComplexCondition(condition)) {
    const evaluation = evaluateComplexCondition(condition, event);
    return {
      result: evaluation.result,
      triggeredValue: null,  // Complex conditions don't have single value
      thresholdValue: null,
      message: evaluation.details.join(` ${condition.type.toUpperCase()} `),
    };
  }
  
  return {
    result: false,
    triggeredValue: null,
    thresholdValue: null,
    message: 'Invalid condition type',
  };
}

// ============================================================================
// Evaluation Result Type
// ============================================================================

export interface EvaluationResult {
  result: boolean;
  triggeredValue: number | null;
  thresholdValue: number | null;
  message: string;
}

// ============================================================================
// Batch Evaluation
// ============================================================================

/**
 * Evaluate multiple conditions against event
 */
export function evaluateConditions(
  conditions: AlertCondition[],
  event: BaseEvent
): EvaluationResult[] {
  return conditions.map(condition => evaluateCondition(condition, event));
}

