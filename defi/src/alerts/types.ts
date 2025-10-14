/**
 * Alert Rule Types
 * Type definitions for the alert rule management system
 */

// Alert Types
export type AlertType =
  | 'tvl_change'
  | 'price_change'
  | 'volume_spike'
  | 'protocol_event'
  | 'smart_money'
  | 'risk_score';

// Notification Channels
export type NotificationChannel = 'email' | 'webhook' | 'push';

// Condition Operators
export type ConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';

// Metric Types
export type MetricType =
  | 'tvl'
  | 'price'
  | 'price_change_24h'
  | 'volume_24h'
  | 'market_cap'
  | 'user_count'
  | 'transaction_count';

// Simple Condition
export interface SimpleCondition {
  operator: ConditionOperator;
  threshold: number;
  metric: MetricType;
  unit?: 'absolute' | 'percent';
}

// Complex Condition (AND/OR logic)
export interface ComplexCondition {
  type: 'and' | 'or';
  conditions: (SimpleCondition | ComplexCondition)[];
}

// Union type for all conditions
export type AlertCondition = SimpleCondition | ComplexCondition;

// Alert Rule (database model)
export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  alert_type: AlertType;
  
  // Target configuration
  protocol_id?: string;
  token_id?: string;
  chain_id?: number;
  
  // Condition configuration
  condition: AlertCondition;
  
  // Notification configuration
  channels: NotificationChannel[];
  
  // Throttling configuration
  throttle_minutes: number;
  
  // Status
  enabled: boolean;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  last_triggered_at?: Date;
}

// Alert History (database model)
export interface AlertHistory {
  id: string;
  alert_rule_id: string;
  user_id: string;
  
  // Trigger information
  triggered_value: number;
  threshold_value: number;
  message: string;
  
  // Notification delivery
  notification_channels: NotificationChannel[];
  delivery_status?: Record<NotificationChannel, 'sent' | 'failed' | 'pending'>;
  
  // Metadata
  created_at: Date;
}

// API Request Types

export interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  alert_type: AlertType;
  
  // Target (at least one required)
  protocol_id?: string;
  token_id?: string;
  chain_id?: number;
  
  // Condition
  condition: AlertCondition;
  
  // Notification
  channels: NotificationChannel[];
  
  // Throttling (optional, default: 5)
  throttle_minutes?: number;
  
  // Status (optional, default: true)
  enabled?: boolean;
}

export interface UpdateAlertRuleRequest {
  name?: string;
  description?: string;
  alert_type?: AlertType;
  
  // Target
  protocol_id?: string;
  token_id?: string;
  chain_id?: number;
  
  // Condition
  condition?: AlertCondition;
  
  // Notification
  channels?: NotificationChannel[];
  
  // Throttling
  throttle_minutes?: number;
  
  // Status
  enabled?: boolean;
}

export interface GetAlertRulesRequest {
  // Filters
  alert_type?: AlertType;
  protocol_id?: string;
  token_id?: string;
  chain_id?: number;
  enabled?: boolean;
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sorting
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'last_triggered_at';
  sort_order?: 'asc' | 'desc';
}

// API Response Types

export interface AlertRuleResponse {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  alert_type: AlertType;
  
  // Target
  protocol_id?: string;
  token_id?: string;
  chain_id?: number;
  
  // Condition
  condition: AlertCondition;
  
  // Notification
  channels: NotificationChannel[];
  
  // Throttling
  throttle_minutes: number;
  
  // Status
  enabled: boolean;
  
  // Metadata
  created_at: string;  // ISO 8601 format
  updated_at: string;  // ISO 8601 format
  last_triggered_at?: string;  // ISO 8601 format
}

export interface GetAlertRulesResponse {
  rules: AlertRuleResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateAlertRuleResponse {
  rule: AlertRuleResponse;
  message: string;
}

export interface UpdateAlertRuleResponse {
  rule: AlertRuleResponse;
  message: string;
}

export interface DeleteAlertRuleResponse {
  message: string;
  deleted_rule_id: string;
}

// Validation Error Types

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Database Query Types

export interface AlertRuleFilters {
  user_id: string;
  alert_type?: AlertType;
  protocol_id?: string;
  token_id?: string;
  chain_id?: number;
  enabled?: boolean;
}

export interface AlertRulePagination {
  limit: number;
  offset: number;
  sort_by: 'created_at' | 'updated_at' | 'name' | 'last_triggered_at';
  sort_order: 'asc' | 'desc';
}

// Event Types (for rule evaluation)

export interface AlertEvent {
  protocol_id?: string;
  token_id?: string;
  chain_id?: number;
  metric: MetricType;
  value: number;
  timestamp: Date;
}

// Notification Types

export interface NotificationPayload {
  alert_rule_id: string;
  user_id: string;
  alert_name: string;
  message: string;
  triggered_value: number;
  threshold_value: number;
  channels: NotificationChannel[];
  timestamp: Date;
}

export interface NotificationResult {
  channel: NotificationChannel;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
}

