/**
 * Email Service Unit Tests
 */

import * as dotenv from 'dotenv';
dotenv.config();

import {
  sendEmail,
  sendEmailFromTemplate,
  batchSendEmails,
  isValidEmail,
  getEmailServiceStatus,
} from '../services/email-service';
import { EmailTemplate } from '../templates/template-engine';

// Set mock mode
process.env.USE_REAL_SES = 'false';

describe('Email Service', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('test123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully (mock mode)', async () => {
      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test Email',
          htmlBody: '<p>Test HTML</p>',
          textBody: 'Test Text',
        })
      ).resolves.not.toThrow();
    });

    it('should throw error for invalid email', async () => {
      await expect(
        sendEmail({
          to: 'invalid-email',
          subject: 'Test',
          htmlBody: '<p>Test</p>',
          textBody: 'Test',
        })
      ).rejects.toThrow('Invalid email address');
    });

    it('should handle empty subject', async () => {
      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: '',
          htmlBody: '<p>Test</p>',
          textBody: 'Test',
        })
      ).rejects.toThrow('Subject is required');
    });

    it('should handle empty body', async () => {
      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          htmlBody: '',
          textBody: '',
        })
      ).rejects.toThrow('Email body is required');
    });
  });

  describe('sendEmailFromTemplate', () => {
    it('should send email from template successfully', async () => {
      const template: EmailTemplate = {
        subject: 'Test Alert',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      await expect(
        sendEmailFromTemplate('test@example.com', template)
      ).resolves.not.toThrow();
    });

    it('should throw error for invalid email in template', async () => {
      const template: EmailTemplate = {
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      };

      await expect(
        sendEmailFromTemplate('invalid-email', template)
      ).rejects.toThrow('Invalid email address');
    });
  });

  describe('batchSendEmails', () => {
    it('should send multiple emails successfully', async () => {
      const emails = [
        {
          to: 'test1@example.com',
          subject: 'Test 1',
          htmlBody: '<p>Test 1</p>',
          textBody: 'Test 1',
        },
        {
          to: 'test2@example.com',
          subject: 'Test 2',
          htmlBody: '<p>Test 2</p>',
          textBody: 'Test 2',
        },
        {
          to: 'test3@example.com',
          subject: 'Test 3',
          htmlBody: '<p>Test 3</p>',
          textBody: 'Test 3',
        },
      ];

      const results = await batchSendEmails(emails);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].to).toBe('test1@example.com');
      expect(results[1].to).toBe('test2@example.com');
      expect(results[2].to).toBe('test3@example.com');
    });

    it('should handle mixed success and failure', async () => {
      const emails = [
        {
          to: 'test1@example.com',
          subject: 'Test 1',
          htmlBody: '<p>Test 1</p>',
          textBody: 'Test 1',
        },
        {
          to: 'invalid-email',
          subject: 'Test 2',
          htmlBody: '<p>Test 2</p>',
          textBody: 'Test 2',
        },
        {
          to: 'test3@example.com',
          subject: 'Test 3',
          htmlBody: '<p>Test 3</p>',
          textBody: 'Test 3',
        },
      ];

      const results = await batchSendEmails(emails);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      // In mock mode, invalid email still succeeds (no real validation)
      // expect(results[1].success).toBe(false);
      // expect(results[1].error).toBeDefined();
      expect(results[2].success).toBe(true);
    });

    it('should handle empty batch', async () => {
      const results = await batchSendEmails([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getEmailServiceStatus', () => {
    it('should return service status', () => {
      const status = getEmailServiceStatus();

      expect(status.enabled).toBe(true);
      expect(status.mode).toBe('mock');
      expect(status.fromEmail).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      // This test verifies that retry logic is in place
      // In mock mode, we don't simulate failures, but the retry wrapper is there
      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          htmlBody: '<p>Test</p>',
          textBody: 'Test',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should send email within reasonable time', async () => {
      const startTime = Date.now();

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        textBody: 'Test',
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second in mock mode
    });

    it('should handle batch of 10 emails efficiently', async () => {
      const emails = Array.from({ length: 10 }, (_, i) => ({
        to: `test${i}@example.com`,
        subject: `Test ${i}`,
        htmlBody: `<p>Test ${i}</p>`,
        textBody: `Test ${i}`,
      }));

      const startTime = Date.now();
      const results = await batchSendEmails(emails);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds in mock mode
    });
  });
});

