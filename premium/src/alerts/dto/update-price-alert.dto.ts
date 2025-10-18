/**
 * Update Price Alert DTO
 * Story 1.1.2: Configure Price Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * Validation schema for updating price alerts
 */

import { z } from 'zod';
import {
  PriceAlertConditionsSchema,
  NotificationChannelsSchema,
  validateThresholdForAlertType,
  validateWebhookUrl,
  validateTelegramChatId,
  validateDiscordWebhookUrl,
} from './create-price-alert.dto';

// Update price alert schema (all fields optional)
export const UpdatePriceAlertSchema = z.object({
  name: z.string()
    .min(1, 'Alert name cannot be empty')
    .max(255, 'Alert name too long')
    .optional(),
  
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  
  conditions: PriceAlertConditionsSchema.partial().optional(),
  
  actions: NotificationChannelsSchema.partial().optional(),
  
  enabled: z.boolean().optional(),
  
  throttle_minutes: z.number()
    .int('Throttle must be an integer')
    .min(1, 'Minimum throttle is 1 minute')
    .max(1440, 'Maximum throttle is 1440 minutes (24 hours)')
    .optional(),
});

// Type inference
export type UpdatePriceAlertDto = z.infer<typeof UpdatePriceAlertSchema>;

/**
 * Validate update price alert data
 * 
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validateUpdatePriceAlert(data: unknown): UpdatePriceAlertDto {
  return UpdatePriceAlertSchema.parse(data);
}

/**
 * Safe validate update price alert data
 * 
 * @param data - Data to validate
 * @returns Validation result
 */
export function safeValidateUpdatePriceAlert(data: unknown) {
  return UpdatePriceAlertSchema.safeParse(data);
}

/**
 * Validate conditional fields for update
 * 
 * @param data - Update price alert data
 * @param existingAlert - Existing alert data (for merging)
 * @returns Validation result
 */
export function validateUpdateConditionalFields(
  data: UpdatePriceAlertDto,
  existingAlert: {
    conditions: {
      alert_type: string;
      threshold: number;
    };
    actions: {
      channels: string[];
      webhook_url?: string;
      telegram_chat_id?: string;
      discord_webhook_url?: string;
    };
  }
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Merge with existing data
  const mergedConditions = {
    ...existingAlert.conditions,
    ...data.conditions,
  };
  
  const mergedActions = {
    ...existingAlert.actions,
    ...data.actions,
  };
  
  // Validate threshold for alert type (if either is being updated)
  if (data.conditions?.alert_type || data.conditions?.threshold) {
    const thresholdValidation = validateThresholdForAlertType(
      mergedConditions.alert_type as any,
      mergedConditions.threshold
    );
    if (!thresholdValidation.valid) {
      errors.push(thresholdValidation.error!);
    }
  }
  
  // Validate webhook URL (if channels or webhook_url is being updated)
  if (data.actions?.channels || data.actions?.webhook_url !== undefined) {
    const webhookValidation = validateWebhookUrl(
      mergedActions.channels,
      mergedActions.webhook_url
    );
    if (!webhookValidation.valid) {
      errors.push(webhookValidation.error!);
    }
  }
  
  // Validate Telegram chat ID (if channels or telegram_chat_id is being updated)
  if (data.actions?.channels || data.actions?.telegram_chat_id !== undefined) {
    const telegramValidation = validateTelegramChatId(
      mergedActions.channels,
      mergedActions.telegram_chat_id
    );
    if (!telegramValidation.valid) {
      errors.push(telegramValidation.error!);
    }
  }
  
  // Validate Discord webhook URL (if channels or discord_webhook_url is being updated)
  if (data.actions?.channels || data.actions?.discord_webhook_url !== undefined) {
    const discordValidation = validateDiscordWebhookUrl(
      mergedActions.channels,
      mergedActions.discord_webhook_url
    );
    if (!discordValidation.valid) {
      errors.push(discordValidation.error!);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge update data with existing alert
 * 
 * @param existingAlert - Existing alert data
 * @param updateData - Update data
 * @returns Merged alert data
 */
export function mergeUpdateData(
  existingAlert: {
    name: string;
    description: string | null;
    conditions: any;
    actions: any;
    enabled: boolean;
    throttle_minutes: number;
  },
  updateData: UpdatePriceAlertDto
): {
  name: string;
  description: string | null;
  conditions: any;
  actions: any;
  enabled: boolean;
  throttle_minutes: number;
} {
  return {
    name: updateData.name ?? existingAlert.name,
    description: updateData.description !== undefined ? updateData.description : existingAlert.description,
    conditions: {
      ...existingAlert.conditions,
      ...updateData.conditions,
    },
    actions: {
      ...existingAlert.actions,
      ...updateData.actions,
    },
    enabled: updateData.enabled ?? existingAlert.enabled,
    throttle_minutes: updateData.throttle_minutes ?? existingAlert.throttle_minutes,
  };
}

