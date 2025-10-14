/**
 * SQS Publisher
 * Publishes events to SQS queue for alert processing
 */

import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import {
  BaseEvent,
  SQSEventMessage,
} from '../events/event-types';

let sqsClient: SQSClient | null = null;

/**
 * Get SQS client instance
 */
function getSQSClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'eu-central-1',
    });
  }
  return sqsClient;
}

/**
 * Determine event priority
 */
function getEventPriority(event: BaseEvent): 'high' | 'medium' | 'low' {
  // High priority for extreme changes
  const tags = event.metadata.tags;
  if (tags.includes('extreme-change')) {
    return 'high';
  }
  
  // Medium priority for large changes
  if (tags.includes('large-change')) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Publish event to SQS
 */
export async function publishToSQS(
  event: BaseEvent,
  queueUrl?: string
): Promise<void> {
  try {
    const sqs = getSQSClient();
    const url = queueUrl || process.env.EVENTS_QUEUE_URL;
    
    if (!url) {
      throw new Error('SQS queue URL not configured');
    }
    
    const message: SQSEventMessage = {
      event,
      priority: getEventPriority(event),
      retryCount: 0,
      timestamp: Date.now(),
    };
    
    await sqs.send(new SendMessageCommand({
      QueueUrl: url,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: event.eventType,
        },
        priority: {
          DataType: 'String',
          StringValue: message.priority,
        },
        timestamp: {
          DataType: 'Number',
          StringValue: event.timestamp.toString(),
        },
      },
    }));
    
  } catch (error) {
    console.error('Error publishing to SQS:', error);
    throw error;
  }
}

/**
 * Batch publish events to SQS
 */
export async function batchPublishToSQS(
  events: BaseEvent[],
  queueUrl?: string
): Promise<void> {
  try {
    const sqs = getSQSClient();
    const url = queueUrl || process.env.EVENTS_QUEUE_URL;
    
    if (!url) {
      throw new Error('SQS queue URL not configured');
    }
    
    // Split into batches of 10 (SQS limit)
    const batches = chunkArray(events, 10);
    
    for (const batch of batches) {
      const entries = batch.map((event, index) => {
        const message: SQSEventMessage = {
          event,
          priority: getEventPriority(event),
          retryCount: 0,
          timestamp: Date.now(),
        };
        
        return {
          Id: `${event.eventId}-${index}`,
          MessageBody: JSON.stringify(message),
          MessageAttributes: {
            eventType: {
              DataType: 'String',
              StringValue: event.eventType,
            },
            priority: {
              DataType: 'String',
              StringValue: message.priority,
            },
            timestamp: {
              DataType: 'Number',
              StringValue: event.timestamp.toString(),
            },
          },
        };
      });
      
      await sqs.send(new SendMessageBatchCommand({
        QueueUrl: url,
        Entries: entries,
      }));
    }
    
  } catch (error) {
    console.error('Error batch publishing to SQS:', error);
    throw error;
  }
}

/**
 * Publish with retry
 */
export async function publishToSQSWithRetry(
  event: BaseEvent,
  maxRetries: number = 3,
  queueUrl?: string
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await publishToSQS(event, queueUrl);
      return;
    } catch (error) {
      lastError = error as Error;
      console.error(`SQS retry ${i + 1}/${maxRetries} failed:`, error);
      
      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
      }
    }
  }
  
  throw lastError;
}

/**
 * Publish to dead letter queue
 */
export async function publishToDLQ(
  event: BaseEvent,
  error: Error
): Promise<void> {
  try {
    const sqs = getSQSClient();
    const dlqUrl = process.env.EVENTS_DLQ_URL;
    
    if (!dlqUrl) {
      console.error('DLQ URL not configured, cannot send failed event');
      return;
    }
    
    const message = {
      event,
      error: {
        message: error.message,
        stack: error.stack,
      },
      timestamp: Date.now(),
    };
    
    await sqs.send(new SendMessageCommand({
      QueueUrl: dlqUrl,
      MessageBody: JSON.stringify(message),
    }));
    
  } catch (dlqError) {
    console.error('Error publishing to DLQ:', dlqError);
  }
}

/**
 * Helper function to chunk array
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

