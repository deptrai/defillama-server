import { z } from 'zod';
import {
  SUPPORTED_GAS_CHAINS,
  GAS_ALERT_TYPES,
  NOTIFICATION_CHANNELS,
} from './create-gas-alert.dto';

/**
 * Update Gas Alert DTO
 * 
 * Validation schema for updating an existing gas alert
 * All fields are optional (partial update)
 * 
 * Based on PRD v2.0 Section 4.1.3: Gas Fee Alerts
 * Feature ID: F-003
 */

export const UpdateGasAlertSchema = z.object({
  // Alert name (optional)
  name: z.string().min(1).max(255).optional(),
  
  // Alert description (optional)
  description: z.string().max(1000).optional(),
  
  // Chain to monitor (optional)
  chain: z.enum(SUPPORTED_GAS_CHAINS).optional(),
  
  // Gas price threshold in Gwei (optional)
  thresholdGwei: z.number()
    .min(1, 'Threshold must be at least 1 Gwei')
    .max(1000, 'Threshold must be at most 1000 Gwei')
    .optional(),
  
  // Alert type (optional)
  alertType: z.enum(GAS_ALERT_TYPES).optional(),
  
  // Notification channels (optional)
  notificationChannels: z.array(z.enum(NOTIFICATION_CHANNELS))
    .min(1, 'At least one notification channel is required')
    .max(4, 'Maximum 4 notification channels allowed')
    .optional(),
  
  // Webhook URL (optional)
  webhookUrl: z.string().url().optional(),
  
  // Telegram chat ID (optional)
  telegramChatId: z.string().optional(),
  
  // Discord webhook URL (optional)
  discordWebhookUrl: z.string().url().optional(),
  
  // Enable/disable alert (optional)
  enabled: z.boolean().optional(),
  
  // Throttle minutes (optional)
  throttleMinutes: z.number()
    .min(5, 'Throttle must be at least 5 minutes')
    .max(1440, 'Throttle must be at most 1440 minutes (24 hours)')
    .optional(),
}).refine(
  (data) => {
    // If webhook channel is selected, webhookUrl is required
    if (data.notificationChannels?.includes('webhook') && !data.webhookUrl) {
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
    if (data.notificationChannels?.includes('telegram') && !data.telegramChatId) {
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
    if (data.notificationChannels?.includes('discord') && !data.discordWebhookUrl) {
      return false;
    }
    return true;
  },
  {
    message: 'discordWebhookUrl is required when discord channel is selected',
    path: ['discordWebhookUrl'],
  }
);

export type UpdateGasAlertDto = z.infer<typeof UpdateGasAlertSchema>;

/**
 * Safe validation function
 */
export function safeValidateUpdateGasAlert(data: unknown) {
  return UpdateGasAlertSchema.safeParse(data);
}

/**
 * Validation function (throws on error)
 */
export function validateUpdateGasAlert(data: unknown): UpdateGasAlertDto {
  return UpdateGasAlertSchema.parse(data);
}

/**
 * Example usage:
 * 
 * const result = safeValidateUpdateGasAlert({
 *   thresholdGwei: 25,
 *   enabled: false,
 * });
 * 
 * if (result.success) {
 *   const dto: UpdateGasAlertDto = result.data;
 *   // Use dto...
 * } else {
 *   console.error(result.error.errors);
 * }
 */

