/**
 * Create Whale Alert DTO
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 */

import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Whale Alert Conditions Schema
 * Validates threshold, tokens, and chains for whale alerts
 */
export const WhaleAlertConditionsSchema = z.object({
  min_amount_usd: z.number()
    .min(100000, "Minimum threshold is $100,000")
    .max(100000000, "Maximum threshold is $100,000,000")
    .describe("Minimum transaction amount in USD to trigger alert"),
  
  tokens: z.array(z.string())
    .min(1, "At least 1 token must be selected")
    .max(100, "Maximum 100 tokens allowed")
    .describe("List of token symbols to monitor (e.g., ['ETH', 'WETH', 'USDC'])"),
  
  chains: z.array(z.string())
    .min(1, "At least 1 chain must be selected")
    .max(100, "Maximum 100 chains allowed")
    .describe("List of chain IDs to monitor (e.g., ['ethereum', 'arbitrum', 'optimism'])")
});

/**
 * Alert Actions Schema
 * Defines notification channels and settings
 */
export const AlertActionsSchema = z.object({
  channels: z.array(z.enum(["email", "push", "webhook", "telegram", "discord"]))
    .min(1, "At least 1 notification channel required")
    .describe("Notification channels to use"),
  
  webhook_url: z.string()
    .url("Invalid webhook URL")
    .optional()
    .describe("Webhook URL for webhook notifications"),
  
  email_template: z.string()
    .optional()
    .describe("Email template to use (default: 'whale_alert')"),
  
  telegram_chat_id: z.string()
    .optional()
    .describe("Telegram chat ID for Telegram notifications"),
  
  discord_webhook_url: z.string()
    .url("Invalid Discord webhook URL")
    .optional()
    .describe("Discord webhook URL for Discord notifications")
});

/**
 * Create Whale Alert Rule Schema
 * Complete validation schema for creating whale alert rules
 */
export const CreateWhaleAlertRuleSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters")
    .describe("Alert rule name"),
  
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .describe("Optional description of the alert rule"),
  
  type: z.literal("whale")
    .describe("Alert type (must be 'whale')"),
  
  conditions: WhaleAlertConditionsSchema
    .describe("Whale alert conditions"),
  
  actions: AlertActionsSchema
    .describe("Notification actions"),
  
  enabled: z.boolean()
    .default(true)
    .describe("Whether the alert rule is enabled"),
  
  throttle_minutes: z.number()
    .min(1, "Minimum throttle is 1 minute")
    .max(1440, "Maximum throttle is 1440 minutes (24 hours)")
    .default(5)
    .optional()
    .describe("Minimum time between alerts in minutes")
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type WhaleAlertConditions = z.infer<typeof WhaleAlertConditionsSchema>;
export type AlertActions = z.infer<typeof AlertActionsSchema>;
export type CreateWhaleAlertRuleDto = z.infer<typeof CreateWhaleAlertRuleSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate whale alert rule data
 * @param data - Data to validate
 * @returns Validated data or throws ZodError
 */
export function validateWhaleAlertRule(data: unknown): CreateWhaleAlertRuleDto {
  return CreateWhaleAlertRuleSchema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 * @param data - Data to validate
 * @returns Success result with data or error result with issues
 */
export function safeValidateWhaleAlertRule(data: unknown): 
  | { success: true; data: CreateWhaleAlertRuleDto }
  | { success: false; errors: z.ZodIssue[] } {
  
  const result = CreateWhaleAlertRuleSchema.safeParse(data);
  
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
 * Example whale alert rule
 */
export const EXAMPLE_WHALE_ALERT: CreateWhaleAlertRuleDto = {
  name: "Large ETH Transfers",
  description: "Alert me when large ETH transfers occur on Ethereum mainnet",
  type: "whale",
  conditions: {
    min_amount_usd: 1000000, // $1M
    tokens: ["ETH", "WETH"],
    chains: ["ethereum"]
  },
  actions: {
    channels: ["email", "push"],
    email_template: "whale_alert"
  },
  enabled: true,
  throttle_minutes: 5
};

