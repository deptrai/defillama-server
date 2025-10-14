/**
 * Alert Rules Validation Layer
 * Validation logic for alert rule creation and updates
 */

import {
  AlertCondition,
  AlertType,
  ComplexCondition,
  ConditionOperator,
  CreateAlertRuleRequest,
  MetricType,
  NotificationChannel,
  SimpleCondition,
  UpdateAlertRuleRequest,
  ValidationError,
  ValidationResult,
} from './types';

// Valid alert types
const VALID_ALERT_TYPES: AlertType[] = [
  'tvl_change',
  'price_change',
  'volume_spike',
  'protocol_event',
  'smart_money',
  'risk_score',
];

// Valid notification channels
const VALID_CHANNELS: NotificationChannel[] = ['email', 'webhook', 'push'];

// Valid condition operators
const VALID_OPERATORS: ConditionOperator[] = ['>', '<', '>=', '<=', '==', '!='];

// Valid metric types
const VALID_METRICS: MetricType[] = [
  'tvl',
  'price',
  'price_change_24h',
  'volume_24h',
  'market_cap',
  'user_count',
  'transaction_count',
];

/**
 * Validate create alert rule request
 */
export function validateCreateAlertRule(data: CreateAlertRuleRequest): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!data.name || typeof data.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Name is required and must be a string',
      code: 'INVALID_NAME',
    });
  } else if (data.name.length < 3) {
    errors.push({
      field: 'name',
      message: 'Name must be at least 3 characters long',
      code: 'NAME_TOO_SHORT',
    });
  } else if (data.name.length > 255) {
    errors.push({
      field: 'name',
      message: 'Name must be at most 255 characters long',
      code: 'NAME_TOO_LONG',
    });
  }

  // Validate description (optional)
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'Description must be a string',
      code: 'INVALID_DESCRIPTION',
    });
  }

  // Validate alert_type
  if (!data.alert_type) {
    errors.push({
      field: 'alert_type',
      message: 'Alert type is required',
      code: 'MISSING_ALERT_TYPE',
    });
  } else if (!VALID_ALERT_TYPES.includes(data.alert_type)) {
    errors.push({
      field: 'alert_type',
      message: `Invalid alert type. Must be one of: ${VALID_ALERT_TYPES.join(', ')}`,
      code: 'INVALID_ALERT_TYPE',
    });
  }

  // Validate target (at least one required)
  if (!data.protocol_id && !data.token_id && data.chain_id === undefined) {
    errors.push({
      field: 'target',
      message: 'At least one target (protocol_id, token_id, or chain_id) is required',
      code: 'MISSING_TARGET',
    });
  }

  // Validate protocol_id (optional)
  if (data.protocol_id !== undefined && typeof data.protocol_id !== 'string') {
    errors.push({
      field: 'protocol_id',
      message: 'Protocol ID must be a string',
      code: 'INVALID_PROTOCOL_ID',
    });
  }

  // Validate token_id (optional)
  if (data.token_id !== undefined && typeof data.token_id !== 'string') {
    errors.push({
      field: 'token_id',
      message: 'Token ID must be a string',
      code: 'INVALID_TOKEN_ID',
    });
  }

  // Validate chain_id (optional)
  if (data.chain_id !== undefined && (typeof data.chain_id !== 'number' || data.chain_id < 0)) {
    errors.push({
      field: 'chain_id',
      message: 'Chain ID must be a non-negative number',
      code: 'INVALID_CHAIN_ID',
    });
  }

  // Validate condition
  if (!data.condition) {
    errors.push({
      field: 'condition',
      message: 'Condition is required',
      code: 'MISSING_CONDITION',
    });
  } else {
    const conditionErrors = validateCondition(data.condition);
    errors.push(...conditionErrors);
  }

  // Validate channels
  if (!data.channels || !Array.isArray(data.channels)) {
    errors.push({
      field: 'channels',
      message: 'Channels must be an array',
      code: 'INVALID_CHANNELS',
    });
  } else if (data.channels.length === 0) {
    errors.push({
      field: 'channels',
      message: 'At least one notification channel is required',
      code: 'EMPTY_CHANNELS',
    });
  } else {
    const invalidChannels = data.channels.filter((ch) => !VALID_CHANNELS.includes(ch));
    if (invalidChannels.length > 0) {
      errors.push({
        field: 'channels',
        message: `Invalid channels: ${invalidChannels.join(', ')}. Must be one of: ${VALID_CHANNELS.join(', ')}`,
        code: 'INVALID_CHANNEL_VALUES',
      });
    }
  }

  // Validate throttle_minutes (optional)
  if (data.throttle_minutes !== undefined) {
    if (typeof data.throttle_minutes !== 'number' || data.throttle_minutes < 0) {
      errors.push({
        field: 'throttle_minutes',
        message: 'Throttle minutes must be a non-negative number',
        code: 'INVALID_THROTTLE_MINUTES',
      });
    } else if (data.throttle_minutes > 1440) {
      // Max 24 hours
      errors.push({
        field: 'throttle_minutes',
        message: 'Throttle minutes must be at most 1440 (24 hours)',
        code: 'THROTTLE_MINUTES_TOO_LARGE',
      });
    }
  }

  // Validate enabled (optional)
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    errors.push({
      field: 'enabled',
      message: 'Enabled must be a boolean',
      code: 'INVALID_ENABLED',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate update alert rule request
 */
export function validateUpdateAlertRule(data: UpdateAlertRuleRequest): ValidationResult {
  const errors: ValidationError[] = [];

  // At least one field must be provided
  const hasUpdates =
    data.name !== undefined ||
    data.description !== undefined ||
    data.alert_type !== undefined ||
    data.protocol_id !== undefined ||
    data.token_id !== undefined ||
    data.chain_id !== undefined ||
    data.condition !== undefined ||
    data.channels !== undefined ||
    data.throttle_minutes !== undefined ||
    data.enabled !== undefined;

  if (!hasUpdates) {
    errors.push({
      field: 'body',
      message: 'At least one field must be provided for update',
      code: 'NO_UPDATES',
    });
    return { valid: false, errors };
  }

  // Validate name (if provided)
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Name must be a string',
        code: 'INVALID_NAME',
      });
    } else if (data.name.length < 3) {
      errors.push({
        field: 'name',
        message: 'Name must be at least 3 characters long',
        code: 'NAME_TOO_SHORT',
      });
    } else if (data.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Name must be at most 255 characters long',
        code: 'NAME_TOO_LONG',
      });
    }
  }

  // Validate description (if provided)
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'Description must be a string',
      code: 'INVALID_DESCRIPTION',
    });
  }

  // Validate alert_type (if provided)
  if (data.alert_type !== undefined && !VALID_ALERT_TYPES.includes(data.alert_type)) {
    errors.push({
      field: 'alert_type',
      message: `Invalid alert type. Must be one of: ${VALID_ALERT_TYPES.join(', ')}`,
      code: 'INVALID_ALERT_TYPE',
    });
  }

  // Validate condition (if provided)
  if (data.condition !== undefined) {
    const conditionErrors = validateCondition(data.condition);
    errors.push(...conditionErrors);
  }

  // Validate channels (if provided)
  if (data.channels !== undefined) {
    if (!Array.isArray(data.channels)) {
      errors.push({
        field: 'channels',
        message: 'Channels must be an array',
        code: 'INVALID_CHANNELS',
      });
    } else if (data.channels.length === 0) {
      errors.push({
        field: 'channels',
        message: 'At least one notification channel is required',
        code: 'EMPTY_CHANNELS',
      });
    } else {
      const invalidChannels = data.channels.filter((ch) => !VALID_CHANNELS.includes(ch));
      if (invalidChannels.length > 0) {
        errors.push({
          field: 'channels',
          message: `Invalid channels: ${invalidChannels.join(', ')}. Must be one of: ${VALID_CHANNELS.join(', ')}`,
          code: 'INVALID_CHANNEL_VALUES',
        });
      }
    }
  }

  // Validate throttle_minutes (if provided)
  if (data.throttle_minutes !== undefined) {
    if (typeof data.throttle_minutes !== 'number' || data.throttle_minutes < 0) {
      errors.push({
        field: 'throttle_minutes',
        message: 'Throttle minutes must be a non-negative number',
        code: 'INVALID_THROTTLE_MINUTES',
      });
    } else if (data.throttle_minutes > 1440) {
      errors.push({
        field: 'throttle_minutes',
        message: 'Throttle minutes must be at most 1440 (24 hours)',
        code: 'THROTTLE_MINUTES_TOO_LARGE',
      });
    }
  }

  // Validate enabled (if provided)
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    errors.push({
      field: 'enabled',
      message: 'Enabled must be a boolean',
      code: 'INVALID_ENABLED',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate alert condition (recursive for complex conditions)
 */
function validateCondition(condition: AlertCondition, path: string = 'condition'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!condition || typeof condition !== 'object') {
    errors.push({
      field: path,
      message: 'Condition must be an object',
      code: 'INVALID_CONDITION',
    });
    return errors;
  }

  // Check if it's a complex condition
  if ('type' in condition) {
    const complexCondition = condition as ComplexCondition;

    // Validate type
    if (complexCondition.type !== 'and' && complexCondition.type !== 'or') {
      errors.push({
        field: `${path}.type`,
        message: 'Complex condition type must be "and" or "or"',
        code: 'INVALID_CONDITION_TYPE',
      });
    }

    // Validate conditions array
    if (!Array.isArray(complexCondition.conditions)) {
      errors.push({
        field: `${path}.conditions`,
        message: 'Complex condition must have a conditions array',
        code: 'MISSING_CONDITIONS_ARRAY',
      });
    } else if (complexCondition.conditions.length < 2) {
      errors.push({
        field: `${path}.conditions`,
        message: 'Complex condition must have at least 2 sub-conditions',
        code: 'INSUFFICIENT_CONDITIONS',
      });
    } else {
      // Recursively validate sub-conditions
      complexCondition.conditions.forEach((subCondition, index) => {
        const subErrors = validateCondition(subCondition, `${path}.conditions[${index}]`);
        errors.push(...subErrors);
      });
    }
  } else {
    // Simple condition
    const simpleCondition = condition as SimpleCondition;

    // Validate operator
    if (!simpleCondition.operator) {
      errors.push({
        field: `${path}.operator`,
        message: 'Operator is required',
        code: 'MISSING_OPERATOR',
      });
    } else if (!VALID_OPERATORS.includes(simpleCondition.operator)) {
      errors.push({
        field: `${path}.operator`,
        message: `Invalid operator. Must be one of: ${VALID_OPERATORS.join(', ')}`,
        code: 'INVALID_OPERATOR',
      });
    }

    // Validate threshold
    if (simpleCondition.threshold === undefined) {
      errors.push({
        field: `${path}.threshold`,
        message: 'Threshold is required',
        code: 'MISSING_THRESHOLD',
      });
    } else if (typeof simpleCondition.threshold !== 'number') {
      errors.push({
        field: `${path}.threshold`,
        message: 'Threshold must be a number',
        code: 'INVALID_THRESHOLD',
      });
    }

    // Validate metric
    if (!simpleCondition.metric) {
      errors.push({
        field: `${path}.metric`,
        message: 'Metric is required',
        code: 'MISSING_METRIC',
      });
    } else if (!VALID_METRICS.includes(simpleCondition.metric)) {
      errors.push({
        field: `${path}.metric`,
        message: `Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}`,
        code: 'INVALID_METRIC',
      });
    }

    // Validate unit (optional)
    if (simpleCondition.unit !== undefined && simpleCondition.unit !== 'absolute' && simpleCondition.unit !== 'percent') {
      errors.push({
        field: `${path}.unit`,
        message: 'Unit must be "absolute" or "percent"',
        code: 'INVALID_UNIT',
      });
    }
  }

  return errors;
}

