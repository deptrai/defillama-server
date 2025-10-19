import { z } from 'zod';

/**
 * Create Gas Alert DTO
 * 
 * Validation schema for creating a new gas alert
 * 
 * Based on PRD v2.0 Section 4.1.3: Gas Fee Alerts
 * Feature ID: F-003
 */

// Supported EVM chains for gas alerts
export const SUPPORTED_GAS_CHAINS = [
  'ethereum',
  'bsc',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'fantom',
  'base',
  'linea',
  'scroll',
] as const;

export type SupportedGasChain = typeof SUPPORTED_GAS_CHAINS[number];

// Alert types
export const GAS_ALERT_TYPES = ['below', 'spike'] as const;
export type GasAlertType = typeof GAS_ALERT_TYPES[number];

// Notification channels
export const NOTIFICATION_CHANNELS = ['email', 'telegram', 'discord', 'webhook'] as const;
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];

/**
 * Create Gas Alert DTO Schema
 */
export const CreateGasAlertSchema = z.object({
  // Alert name (optional, auto-generated if not provided)
  name: z.string().min(1).max(255).optional(),
  
  // Alert description (optional)
  description: z.string().max(1000).optional(),
  
  // Chain to monitor
  chain: z.enum(SUPPORTED_GAS_CHAINS, {
    errorMap: () => ({ message: `Chain must be one of: ${SUPPORTED_GAS_CHAINS.join(', ')}` }),
  }),
  
  // Gas price threshold in Gwei
  thresholdGwei: z.number()
    .min(1, 'Threshold must be at least 1 Gwei')
    .max(1000, 'Threshold must be at most 1000 Gwei'),
  
  // Alert type
  alertType: z.enum(GAS_ALERT_TYPES, {
    errorMap: () => ({ message: `Alert type must be one of: ${GAS_ALERT_TYPES.join(', ')}` }),
  }),
  
  // Notification channels
  notificationChannels: z.array(z.enum(NOTIFICATION_CHANNELS))
    .min(1, 'At least one notification channel is required')
    .max(4, 'Maximum 4 notification channels allowed'),
  
  // Webhook URL (required if webhook channel is selected)
  webhookUrl: z.string().url().optional(),
  
  // Telegram chat ID (required if telegram channel is selected)
  telegramChatId: z.string().optional(),
  
  // Discord webhook URL (required if discord channel is selected)
  discordWebhookUrl: z.string().url().optional(),
  
  // Enable/disable alert (default: true)
  enabled: z.boolean().default(true),
  
  // Throttle minutes (default: 60)
  throttleMinutes: z.number()
    .min(5, 'Throttle must be at least 5 minutes')
    .max(1440, 'Throttle must be at most 1440 minutes (24 hours)')
    .default(60),
}).refine(
  (data) => {
    // If webhook channel is selected, webhookUrl is required
    if (data.notificationChannels.includes('webhook') && !data.webhookUrl) {
      return false;
    }
    return true;
  },
  {
    message: 'webhookUrl is required when webhook channel is selected',
    path: ['webhookUrl'],
  }
).refine(
  (data) => {
    // If telegram channel is selected, telegramChatId is required
    if (data.notificationChannels.includes('telegram') && !data.telegramChatId) {
      return false;
    }
    return true;
  },
  {
    message: 'telegramChatId is required when telegram channel is selected',
    path: ['telegramChatId'],
  }
).refine(
  (data) => {
    // If discord channel is selected, discordWebhookUrl is required
    if (data.notificationChannels.includes('discord') && !data.discordWebhookUrl) {
      return false;
    }
    return true;
  },
  {
    message: 'discordWebhookUrl is required when discord channel is selected',
    path: ['discordWebhookUrl'],
  }
);

export type CreateGasAlertDto = z.infer<typeof CreateGasAlertSchema>;

/**
 * Safe validation function
 */
export function safeValidateCreateGasAlert(data: unknown) {
  return CreateGasAlertSchema.safeParse(data);
}

/**
 * Validation function (throws on error)
 */
export function validateCreateGasAlert(data: unknown): CreateGasAlertDto {
  return CreateGasAlertSchema.parse(data);
}

/**
 * Validate conditional fields for gas alerts
 *
 * Ensures that required fields are present based on selected channels
 */
export function validateGasAlertConditionalFields(data: CreateGasAlertDto): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check webhook URL
  if (data.notificationChannels.includes('webhook') && !data.webhookUrl) {
    errors.push('webhookUrl is required when webhook channel is selected');
  }

  // Check telegram chat ID
  if (data.notificationChannels.includes('telegram') && !data.telegramChatId) {
    errors.push('telegramChatId is required when telegram channel is selected');
  }

  // Check discord webhook URL
  if (data.notificationChannels.includes('discord') && !data.discordWebhookUrl) {
    errors.push('discordWebhookUrl is required when discord channel is selected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Example usage:
 * 
 * const result = safeValidateCreateGasAlert({
 *   chain: 'ethereum',
 *   thresholdGwei: 20,
 *   alertType: 'below',
 *   notificationChannels: ['email', 'telegram'],
 *   telegramChatId: '123456789',
 *   enabled: true,
 *   throttleMinutes: 60,
 * });
 * 
 * if (result.success) {
 *   const dto: CreateGasAlertDto = result.data;
 *   // Use dto...
 * } else {
 *   console.error(result.error.errors);
 * }
 */

