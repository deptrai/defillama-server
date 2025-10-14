/**
 * Email Service
 * Sends email notifications via Amazon SES
 * Story 1.3: Alert Engine and Notification System - Phase 6.3
 */

import { SES, SendEmailCommand } from '@aws-sdk/client-ses';
import { retryWithBackoff } from '../utils/retry';
import { EmailTemplate } from '../templates/template-engine';

// ============================================================================
// Configuration
// ============================================================================

const USE_REAL_SES = process.env.USE_REAL_SES === 'true';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@defillama.com';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// ============================================================================
// SES Client
// ============================================================================

let sesClient: SES | null = null;

function getSESClient(): SES {
  if (!sesClient && USE_REAL_SES) {
    sesClient = new SES({ region: AWS_REGION });
  }
  return sesClient!;
}

// ============================================================================
// Email Notification
// ============================================================================

export interface EmailNotification {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Send email via SES
 */
async function sendEmailViaSES(notification: EmailNotification): Promise<void> {
  const client = getSESClient();

  const command = new SendEmailCommand({
    Source: SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [notification.to],
    },
    Message: {
      Subject: {
        Data: notification.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: notification.htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: notification.textBody,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await client.send(command);
}

/**
 * Mock email sending (for local development)
 */
async function sendEmailMock(notification: EmailNotification): Promise<void> {
  console.log('📧 [MOCK] Email sent:', {
    to: notification.to,
    subject: notification.subject,
    bodyPreview: notification.textBody.substring(0, 100) + '...',
  });
}

/**
 * Send email notification
 */
export async function sendEmail(notification: EmailNotification): Promise<void> {
  const sendFn = USE_REAL_SES ? sendEmailViaSES : sendEmailMock;

  await retryWithBackoff(
    () => sendFn(notification),
    {
      maxRetries: 3,
      baseDelay: 1000,
      onRetry: (error, attempt) => {
        console.warn(`Email delivery failed (attempt ${attempt}):`, error.message);
      },
    }
  );
}

/**
 * Send email from template
 */
export async function sendEmailFromTemplate(
  to: string,
  template: EmailTemplate
): Promise<void> {
  await sendEmail({
    to,
    subject: template.subject,
    htmlBody: template.html,
    textBody: template.text,
  });
}

/**
 * Batch send emails
 */
export async function batchSendEmails(
  notifications: EmailNotification[]
): Promise<Array<{ success: boolean; to: string; error?: Error }>> {
  const results = await Promise.all(
    notifications.map(async (notification) => {
      try {
        await sendEmail(notification);
        return { success: true, to: notification.to };
      } catch (error) {
        return { success: false, to: notification.to, error: error as Error };
      }
    })
  );

  return results;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email service status
 */
export function getEmailServiceStatus(): {
  enabled: boolean;
  mode: 'real' | 'mock';
  fromEmail: string;
} {
  return {
    enabled: true,
    mode: USE_REAL_SES ? 'real' : 'mock',
    fromEmail: SES_FROM_EMAIL,
  };
}

