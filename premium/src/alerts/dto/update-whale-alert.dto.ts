/**
 * Update Whale Alert DTO
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 */

import { z } from 'zod';
import { CreateWhaleAlertRuleSchema } from './create-whale-alert.dto';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Update Whale Alert Rule Schema
 * All fields are optional for partial updates
 */
export const UpdateWhaleAlertRuleSchema = CreateWhaleAlertRuleSchema.partial();

// ============================================================================
// TypeScript Types
// ============================================================================

export type UpdateWhaleAlertRuleDto = z.infer<typeof UpdateWhaleAlertRuleSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate whale alert rule update data
 * @param data - Data to validate
 * @returns Validated data or throws ZodError
 */
export function validateWhaleAlertRuleUpdate(data: unknown): UpdateWhaleAlertRuleDto {
  return UpdateWhaleAlertRuleSchema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 * @param data - Data to validate
 * @returns Success result with data or error result with issues
 */
export function safeValidateWhaleAlertRuleUpdate(data: unknown): 
  | { success: true; data: UpdateWhaleAlertRuleDto }
  | { success: false; errors: z.ZodIssue[] } {
  
  const result = UpdateWhaleAlertRuleSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error.issues };
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example partial update (only updating threshold)
 */
export const EXAMPLE_UPDATE_THRESHOLD: UpdateWhaleAlertRuleDto = {
  conditions: {
    min_amount_usd: 2000000, // Update to $2M
    tokens: ["ETH", "WETH"],
    chains: ["ethereum"]
  }
};

/**
 * Example partial update (only updating enabled status)
 */
export const EXAMPLE_DISABLE_ALERT: UpdateWhaleAlertRuleDto = {
  enabled: false
};

/**
 * Example partial update (adding notification channels)
 */
export const EXAMPLE_ADD_CHANNELS: UpdateWhaleAlertRuleDto = {
  actions: {
    channels: ["email", "push", "telegram"],
    telegram_chat_id: "123456789"
  }
};

