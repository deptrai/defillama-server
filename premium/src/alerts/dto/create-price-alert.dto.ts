/**
 * Create Price Alert DTO
 * Story 1.1.2: Configure Price Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * Validation schema for creating price alerts
 */

import { z } from 'zod';

// Alert type enum
export const PriceAlertTypeSchema = z.enum(['above', 'below', 'change_percent', 'volume_spike']);

// Price alert conditions schema
export const PriceAlertConditionsSchema = z.object({
  token: z.string()
    .min(1, 'Token is required')
    .max(50, 'Token symbol too long'),
  
  chain: z.string()
    .min(1, 'Chain is required')
    .max(50, 'Chain name too long'),
  
  alert_type: PriceAlertTypeSchema,
  
  threshold: z.number()
    .positive('Threshold must be positive')
    .refine((val) => val >= 0.000001, {
      message: 'Minimum threshold is $0.000001',
    }),
  
  direction: z.enum(['up', 'down', 'both']).optional(),
  
  timeframe: z.enum(['1h', '24h', '7d']).optional(),
  
  auto_disable: z.boolean().default(false),
});

// Notification channels schema (reuse from whale alert)
export const NotificationChannelsSchema = z.object({
  channels: z.array(z.enum(['email', 'push', 'webhook', 'telegram', 'discord']))
    .min(1, 'At least one notification channel is required')
    .max(5, 'Maximum 5 notification channels allowed'),
  
  webhook_url: z.string().url('Invalid webhook URL').optional(),
  
  telegram_chat_id: z.string().optional(),
  
  discord_webhook_url: z.string().url('Invalid Discord webhook URL').optional(),
});

// Create price alert schema
export const CreatePriceAlertSchema = z.object({
  name: z.string()
    .min(1, 'Alert name is required')
    .max(255, 'Alert name too long')
    .optional(),
  
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  
  type: z.literal('price'),
  
  conditions: PriceAlertConditionsSchema,
  
  actions: NotificationChannelsSchema,
  
  enabled: z.boolean().default(true),
  
  throttle_minutes: z.number()
    .int('Throttle must be an integer')
    .min(1, 'Minimum throttle is 1 minute')
    .max(1440, 'Maximum throttle is 1440 minutes (24 hours)')
    .default(5),
});

// Type inference
export type CreatePriceAlertDto = z.infer<typeof CreatePriceAlertSchema>;
export type PriceAlertConditions = z.infer<typeof PriceAlertConditionsSchema>;
export type NotificationChannels = z.infer<typeof NotificationChannelsSchema>;
export type PriceAlertType = z.infer<typeof PriceAlertTypeSchema>;

/**
 * Validate create price alert data
 * 
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validateCreatePriceAlert(data: unknown): CreatePriceAlertDto {
  return CreatePriceAlertSchema.parse(data);
}

/**
 * Safe validate create price alert data
 * 
 * @param data - Data to validate
 * @returns Validation result
 */
export function safeValidateCreatePriceAlert(data: unknown) {
  return CreatePriceAlertSchema.safeParse(data);
}

/**
 * Validate price alert conditions
 * 
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validatePriceAlertConditions(data: unknown): PriceAlertConditions {
  return PriceAlertConditionsSchema.parse(data);
}

/**
 * Validate notification channels
 * 
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validateNotificationChannels(data: unknown): NotificationChannels {
  return NotificationChannelsSchema.parse(data);
}

/**
 * Custom validation: Check if threshold is valid for alert type
 * 
 * @param alertType - Alert type
 * @param threshold - Threshold value
 * @returns True if valid, error message otherwise
 */
export function validateThresholdForAlertType(
  alertType: PriceAlertType,
  threshold: number
): { valid: boolean; error?: string } {
  switch (alertType) {
    case 'above':
    case 'below':
      // Price thresholds must be > $0.000001
      if (threshold < 0.000001) {
        return {
          valid: false,
          error: 'Minimum price threshold is $0.000001',
        };
      }
      return { valid: true };
    
    case 'change_percent':
      // Percentage change must be 5%, 10%, 20%, 50%, or 100%
      const validPercentages = [5, 10, 20, 50, 100];
      if (!validPercentages.includes(threshold)) {
        return {
          valid: false,
          error: 'Percentage change must be 5%, 10%, 20%, 50%, or 100%',
        };
      }
      return { valid: true };
    
    case 'volume_spike':
      // Volume spike must be 100%, 200%, or 500%
      const validVolumes = [100, 200, 500];
      if (!validVolumes.includes(threshold)) {
        return {
          valid: false,
          error: 'Volume spike must be 100%, 200%, or 500%',
        };
      }
      return { valid: true };
    
    default:
      return {
        valid: false,
        error: 'Invalid alert type',
      };
  }
}

/**
 * Custom validation: Check if webhook URL is required
 * 
 * @param channels - Notification channels
 * @param webhookUrl - Webhook URL
 * @returns True if valid, error message otherwise
 */
export function validateWebhookUrl(
  channels: string[],
  webhookUrl?: string
): { valid: boolean; error?: string } {
  if (channels.includes('webhook') && !webhookUrl) {
    return {
      valid: false,
      error: 'Webhook URL is required when webhook channel is selected',
    };
  }
  return { valid: true };
}

/**
 * Custom validation: Check if Telegram chat ID is required
 * 
 * @param channels - Notification channels
 * @param telegramChatId - Telegram chat ID
 * @returns True if valid, error message otherwise
 */
export function validateTelegramChatId(
  channels: string[],
  telegramChatId?: string
): { valid: boolean; error?: string } {
  if (channels.includes('telegram') && !telegramChatId) {
    return {
      valid: false,
      error: 'Telegram chat ID is required when Telegram channel is selected',
    };
  }
  return { valid: true };
}

/**
 * Custom validation: Check if Discord webhook URL is required
 * 
 * @param channels - Notification channels
 * @param discordWebhookUrl - Discord webhook URL
 * @returns True if valid, error message otherwise
 */
export function validateDiscordWebhookUrl(
  channels: string[],
  discordWebhookUrl?: string
): { valid: boolean; error?: string } {
  if (channels.includes('discord') && !discordWebhookUrl) {
    return {
      valid: false,
      error: 'Discord webhook URL is required when Discord channel is selected',
    };
  }
  return { valid: true };
}

/**
 * Validate all conditional fields
 * 
 * @param data - Create price alert data
 * @returns Validation result
 */
export function validateConditionalFields(data: CreatePriceAlertDto): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate threshold for alert type
  const thresholdValidation = validateThresholdForAlertType(
    data.conditions.alert_type,
    data.conditions.threshold
  );
  if (!thresholdValidation.valid) {
    errors.push(thresholdValidation.error!);
  }
  
  // Validate webhook URL
  const webhookValidation = validateWebhookUrl(
    data.actions.channels,
    data.actions.webhook_url
  );
  if (!webhookValidation.valid) {
    errors.push(webhookValidation.error!);
  }
  
  // Validate Telegram chat ID
  const telegramValidation = validateTelegramChatId(
    data.actions.channels,
    data.actions.telegram_chat_id
  );
  if (!telegramValidation.valid) {
    errors.push(telegramValidation.error!);
  }
  
  // Validate Discord webhook URL
  const discordValidation = validateDiscordWebhookUrl(
    data.actions.channels,
    data.actions.discord_webhook_url
  );
  if (!discordValidation.valid) {
    errors.push(discordValidation.error!);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

