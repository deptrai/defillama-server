/**
 * Query Logger
 * Logs queries to database
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { QueryRequest } from '../types';
import getDBConnection from '../../utils/shared/getDBConnection';

export interface QueryLogParams {
  userId?: string;
  query: QueryRequest;
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
  error?: string;
}

/**
 * Log query to database
 */
export async function logQuery(params: QueryLogParams): Promise<void> {
  const { userId, query, executionTime, resultCount, cacheHit, error } = params;

  try {
    const db = await getDBConnection();

    // Generate query hash
    const queryHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(query, Object.keys(query).sort()))
      .digest('hex');

    // Insert query log
    await db.query(
      `
      INSERT INTO query_logs (
        id,
        user_id,
        query_hash,
        query_params,
        execution_time_ms,
        result_count,
        cache_hit,
        error_message,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        uuidv4(),
        userId || null,
        queryHash,
        JSON.stringify(query),
        executionTime,
        resultCount,
        cacheHit,
        error || null,
      ]
    );
  } catch (logError) {
    console.error('Failed to log query:', logError);
    // Don't throw error - logging failure shouldn't break the request
  }
}

