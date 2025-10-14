/**
 * Structured Logger Utility
 * 
 * This utility provides structured logging with JSON format for CloudWatch Logs.
 * It supports log levels, request ID tracking, user ID tracking, and performance timing.
 * 
 * Usage:
 * ```typescript
 * import { logger } from './utils/shared/logger';
 * 
 * // Set context
 * logger.setRequestId('req-123');
 * logger.setUserId('user-456');
 * 
 * // Log messages
 * logger.debug('Debug message', { key: 'value' });
 * logger.info('Info message', { key: 'value' });
 * logger.warn('Warning message', { key: 'value' });
 * logger.error('Error message', { error: err });
 * 
 * // Performance timing
 * const timer = logger.startTimer();
 * // ... do work ...
 * timer.done('Operation completed');
 * ```
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, any>;
}

class Logger {
  private context: LogContext = {};
  private minLevel: LogLevel;

  constructor() {
    // Set minimum log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
    this.minLevel = envLevel || (process.env.stage === 'prod' ? LogLevel.INFO : LogLevel.DEBUG);
  }

  /**
   * Set request ID for all subsequent logs
   */
  setRequestId(requestId: string): void {
    this.context.requestId = requestId;
  }

  /**
   * Set user ID for all subsequent logs
   */
  setUserId(userId: string): void {
    this.context.userId = userId;
  }

  /**
   * Set custom context for all subsequent logs
   */
  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * Format and output log entry
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context },
      metadata,
    };

    // Output as JSON for CloudWatch Logs
    const output = JSON.stringify(entry);

    // Use appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, metadata?: Record<string, any>): void {
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.log(LogLevel.ERROR, message, errorMetadata);
  }

  /**
   * Start a performance timer
   */
  startTimer(): Timer {
    return new Timer(this);
  }

  /**
   * Log with custom level
   */
  logWithLevel(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    this.log(level, message, metadata);
  }
}

/**
 * Performance timer class
 */
class Timer {
  private startTime: number;
  private logger: Logger;

  constructor(logger: Logger) {
    this.startTime = Date.now();
    this.logger = logger;
  }

  /**
   * Stop timer and log duration
   */
  done(message: string, metadata?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    this.logger.info(message, {
      ...metadata,
      duration,
      durationMs: duration,
    });
    return duration;
  }

  /**
   * Get elapsed time without logging
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Create and export singleton logger instance
 */
export const logger = new Logger();

/**
 * Helper function to create a child logger with additional context
 */
export function createChildLogger(context: LogContext): Logger {
  const childLogger = new Logger();
  Object.entries(context).forEach(([key, value]) => {
    childLogger.setContext(key, value);
  });
  return childLogger;
}

/**
 * Helper function to log Lambda handler execution
 */
export async function logLambdaExecution<T>(
  handlerName: string,
  event: any,
  fn: () => Promise<T>
): Promise<T> {
  const requestId = event.requestContext?.requestId || event.Records?.[0]?.messageId || 'unknown';
  logger.setRequestId(requestId);
  logger.setContext('handler', handlerName);

  logger.info('Lambda handler started', {
    handler: handlerName,
    eventType: event.requestContext?.eventType || event.Records?.[0]?.eventSource || 'unknown',
  });

  const timer = logger.startTimer();

  try {
    const result = await fn();
    timer.done('Lambda handler completed successfully');
    return result;
  } catch (error) {
    logger.error('Lambda handler failed', error, {
      handler: handlerName,
      duration: timer.elapsed(),
    });
    throw error;
  } finally {
    logger.clearContext();
  }
}

/**
 * Helper function to log API request
 */
export function logAPIRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
): void {
  logger.info('API request completed', {
    method,
    path,
    statusCode,
    duration,
    ...metadata,
  });
}

/**
 * Helper function to log database query
 */
export function logDatabaseQuery(
  operation: string,
  table: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  logger.debug('Database query executed', {
    operation,
    table,
    duration,
    ...metadata,
  });
}

/**
 * Helper function to log cache operation
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  duration?: number,
  metadata?: Record<string, any>
): void {
  logger.debug('Cache operation', {
    operation,
    key,
    duration,
    ...metadata,
  });
}

export default logger;

