/**
 * Structured Logger
 * CloudWatch Insights compatible logging
 * 
 * Optimization Phase 2: Logging Enhancement
 * Provides structured JSON logging for better debugging
 */

// ============================================================================
// Log Levels
// ============================================================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// ============================================================================
// Log Context
// ============================================================================

export interface LogContext {
  userId?: string;
  alertId?: string;
  requestId?: string;
  service?: string;
  function?: string;
  [key: string]: any;
}

// ============================================================================
// Log Entry
// ============================================================================

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'premium-alerts') {
    this.serviceName = serviceName;
  }

  /**
   * Internal log method
   * 
   * @param level - Log level
   * @param message - Log message
   * @param context - Additional context
   * @param error - Error object (optional)
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        service: this.serviceName,
        ...context,
      },
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    // Output as JSON for CloudWatch Insights
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log debug message
   * 
   * @param message - Debug message
   * @param context - Additional context
   * 
   * @example
   * logger.debug('Processing alert', { alertId: '123', userId: 'user_456' });
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   * 
   * @param message - Info message
   * @param context - Additional context
   * 
   * @example
   * logger.info('Alert created successfully', { alertId: '123' });
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   * 
   * @param message - Warning message
   * @param context - Additional context
   * 
   * @example
   * logger.warn('Alert limit approaching', { userId: 'user_456', count: 180 });
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   * 
   * @param message - Error message
   * @param error - Error object
   * @param context - Additional context
   * 
   * @example
   * logger.error('Failed to create alert', error, { userId: 'user_456', alertData });
   */
  error(message: string, error: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log with custom level
   * 
   * @param level - Log level
   * @param message - Log message
   * @param context - Additional context
   * @param error - Error object (optional)
   * 
   * @example
   * logger.logWithLevel(LogLevel.INFO, 'Custom log', { custom: 'data' });
   */
  logWithLevel(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    this.log(level, message, context, error);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const logger = new Logger();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a logger with custom service name
 * 
 * @param serviceName - Service name
 * @returns Logger instance
 * 
 * @example
 * const whaleLogger = createLogger('whale-alerts');
 * whaleLogger.info('Processing whale alert');
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

/**
 * Log function execution time
 * 
 * @param functionName - Function name
 * @param startTime - Start time in milliseconds
 * @param context - Additional context
 * 
 * @example
 * const startTime = Date.now();
 * // ... function execution
 * logExecutionTime('createAlert', startTime, { alertId: '123' });
 */
export function logExecutionTime(
  functionName: string,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime;
  logger.info(`${functionName} execution completed`, {
    ...context,
    function: functionName,
    duration_ms: duration,
  });
}

/**
 * Log database query
 * 
 * @param query - SQL query
 * @param duration - Query duration in milliseconds
 * @param context - Additional context
 * 
 * @example
 * logDatabaseQuery('SELECT * FROM alert_rules', 45, { userId: 'user_456' });
 */
export function logDatabaseQuery(
  query: string,
  duration: number,
  context?: LogContext
): void {
  logger.debug('Database query executed', {
    ...context,
    query: query.substring(0, 100), // Truncate long queries
    duration_ms: duration,
  });
}

/**
 * Log API request
 * 
 * @param method - HTTP method
 * @param path - Request path
 * @param statusCode - Response status code
 * @param duration - Request duration in milliseconds
 * @param context - Additional context
 * 
 * @example
 * logAPIRequest('POST', '/v2/premium/alerts/whale', 201, 123, { userId: 'user_456' });
 */
export function logAPIRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: LogContext
): void {
  logger.info('API request completed', {
    ...context,
    method,
    path,
    status_code: statusCode,
    duration_ms: duration,
  });
}

/**
 * Log validation error
 * 
 * @param field - Field name
 * @param error - Validation error message
 * @param context - Additional context
 * 
 * @example
 * logValidationError('email', 'Invalid email format', { userId: 'user_456' });
 */
export function logValidationError(
  field: string,
  error: string,
  context?: LogContext
): void {
  logger.warn('Validation error', {
    ...context,
    field,
    validation_error: error,
  });
}

/**
 * Log rate limit exceeded
 * 
 * @param endpoint - API endpoint
 * @param limit - Rate limit
 * @param context - Additional context
 * 
 * @example
 * logRateLimitExceeded('/v2/premium/alerts/whale', 100, { userId: 'user_456' });
 */
export function logRateLimitExceeded(
  endpoint: string,
  limit: number,
  context?: LogContext
): void {
  logger.warn('Rate limit exceeded', {
    ...context,
    endpoint,
    limit,
  });
}

