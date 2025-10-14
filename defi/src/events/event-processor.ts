/**
 * Event Processor Lambda Handler
 * Scheduled Lambda that processes events from prod-event-table
 */

import { DynamoDB } from 'aws-sdk';
import {
  DynamoDBEventRecord,
  ProcessingMetrics,
  EventProcessorConfig,
  DEFAULT_EVENT_PROCESSOR_CONFIG,
} from './event-types';
import {
  batchDetectChanges,
  getChangeSummary,
} from './change-detector';
import {
  batchGenerateEvents,
  filterValidEvents,
} from './event-generator';
import {
  getBatchPreviousValues,
  batchUpdateCache,
  getLastProcessedTimestamp,
  updateLastProcessedTimestamp,
  closeRedisConnection,
} from '../redis/cache-manager';
import {
  batchPublishEvents,
} from '../distribution/redis-publisher';
import {
  batchPublishToSQS,
} from '../distribution/sqs-publisher';

const dynamodb = new DynamoDB.DocumentClient();

/**
 * Query recent events from prod-event-table
 */
async function queryRecentEvents(
  startTime: number,
  endTime: number
): Promise<DynamoDBEventRecord[]> {
  const events: DynamoDBEventRecord[] = [];
  let lastEvaluatedKey: any = undefined;

  try {
    do {
      const params: DynamoDB.DocumentClient.ScanInput = {
        TableName: 'prod-event-table',
        FilterExpression: 'SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':start': startTime,
          ':end': endTime,
        },
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 1000,
      };

      const result = await dynamodb.scan(params).promise();
      
      if (result.Items) {
        events.push(...(result.Items as DynamoDBEventRecord[]));
      }
      
      lastEvaluatedKey = result.LastEvaluatedKey;
      
    } while (lastEvaluatedKey);

    return events;
  } catch (error) {
    console.error('Error querying recent events:', error);
    throw error;
  }
}

/**
 * Process events batch
 */
async function processEventsBatch(
  records: DynamoDBEventRecord[],
  config: EventProcessorConfig
): Promise<ProcessingMetrics> {
  const startTime = Date.now();
  const metrics: ProcessingMetrics = {
    processedCount: 0,
    errorCount: 0,
    processingTime: 0,
    eventsGenerated: 0,
    cacheUpdates: 0,
    pubsubPublished: 0,
    sqsPublished: 0,
  };

  try {
    // Step 1: Get previous values from cache
    const pks = records.map(r => r.PK);
    const previousValues = await getBatchPreviousValues(pks);
    
    // Step 2: Detect changes
    const { changes, invalidRecords, skippedRecords } = batchDetectChanges(
      records,
      previousValues,
      config.thresholds
    );
    
    metrics.processedCount = records.length;
    metrics.errorCount = invalidRecords.length;
    
    console.log(`Detected ${changes.length} significant changes from ${records.length} records`);
    console.log(`Invalid: ${invalidRecords.length}, Skipped: ${skippedRecords.length}`);
    
    if (changes.length === 0) {
      metrics.processingTime = Date.now() - startTime;
      return metrics;
    }
    
    // Step 3: Generate events
    const allEvents = batchGenerateEvents(changes, startTime);
    const { valid: events, invalid: invalidEvents } = filterValidEvents(allEvents);
    
    metrics.eventsGenerated = events.length;
    metrics.errorCount += invalidEvents.length;
    
    console.log(`Generated ${events.length} valid events`);
    
    if (events.length === 0) {
      metrics.processingTime = Date.now() - startTime;
      return metrics;
    }
    
    // Step 4: Update Redis cache
    if (config.enableCaching) {
      await batchUpdateCache(events);
      metrics.cacheUpdates = events.length;
      console.log(`Updated cache for ${events.length} events`);
    }
    
    // Step 5: Publish to Redis pub/sub
    if (config.enablePubSub) {
      await batchPublishEvents(events);
      metrics.pubsubPublished = events.length;
      console.log(`Published ${events.length} events to Redis pub/sub`);
    }
    
    // Step 6: Send to SQS for alerts
    if (config.enableSQS) {
      // Only send high-priority events to SQS
      const highPriorityEvents = events.filter(e => 
        e.metadata.tags.includes('large-change') || 
        e.metadata.tags.includes('extreme-change')
      );
      
      if (highPriorityEvents.length > 0) {
        await batchPublishToSQS(highPriorityEvents, config.sqsQueueUrl);
        metrics.sqsPublished = highPriorityEvents.length;
        console.log(`Sent ${highPriorityEvents.length} high-priority events to SQS`);
      }
    }
    
    // Log change summary
    const summary = getChangeSummary(changes);
    console.log('Change Summary:', JSON.stringify(summary, null, 2));
    
    metrics.processingTime = Date.now() - startTime;
    return metrics;
    
  } catch (error) {
    console.error('Error processing events batch:', error);
    metrics.errorCount++;
    metrics.processingTime = Date.now() - startTime;
    throw error;
  }
}

/**
 * Main Lambda handler
 */
export async function handler(event: any): Promise<any> {
  console.log('Event Processor Lambda started');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const config: EventProcessorConfig = {
    ...DEFAULT_EVENT_PROCESSOR_CONFIG,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    sqsQueueUrl: process.env.EVENTS_QUEUE_URL || '',
    batchSize: parseInt(process.env.BATCH_SIZE || '100'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    enablePubSub: process.env.ENABLE_PUBSUB !== 'false',
    enableSQS: process.env.ENABLE_SQS !== 'false',
  } as EventProcessorConfig;
  
  try {
    // Get last processed timestamp
    const lastProcessed = await getLastProcessedTimestamp();
    const now = Math.floor(Date.now() / 1000);
    
    // Query events from last processed time to now
    // Default to last 30 seconds if no last processed time
    const startTime = lastProcessed || (now - 30);
    const endTime = now;
    
    console.log(`Querying events from ${startTime} to ${endTime}`);
    
    // Query recent events
    const records = await queryRecentEvents(startTime, endTime);
    console.log(`Found ${records.length} records`);
    
    if (records.length === 0) {
      console.log('No new events to process');
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No new events',
          metrics: {
            processedCount: 0,
            errorCount: 0,
            processingTime: 0,
            eventsGenerated: 0,
          },
        }),
      };
    }
    
    // Process events
    const metrics = await processEventsBatch(records, config);
    
    // Update last processed timestamp
    await updateLastProcessedTimestamp(endTime);
    
    console.log('Processing complete:', JSON.stringify(metrics, null, 2));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Events processed successfully',
        metrics,
      }),
    };
    
  } catch (error) {
    console.error('Lambda execution error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing events',
        error: (error as Error).message,
      }),
    };
    
  } finally {
    // Close Redis connection
    await closeRedisConnection();
  }
}

/**
 * Local testing function
 */
export async function runLocal(): Promise<void> {
  console.log('Running event processor locally...');
  
  try {
    const result = await handler({
      source: 'local',
      time: new Date().toISOString(),
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Local execution error:', error);
  }
}

// Run locally if executed directly
if (require.main === module) {
  runLocal().then(() => {
    console.log('Local execution complete');
    process.exit(0);
  }).catch((error) => {
    console.error('Local execution failed:', error);
    process.exit(1);
  });
}

