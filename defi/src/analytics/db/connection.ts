/**
 * Database Connection Manager
 * Story: 2.1.1 - Protocol Performance Dashboard
 * 
 * This module manages PostgreSQL database connections for the analytics module.
 * It provides a connection pool and helper functions for database operations.
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Database connection configuration
const connectionString = 
  process.env.ANALYTICS_DB || 
  process.env.ALERTS_DB || 
  'postgresql://defillama:defillama123@localhost:5432/defillama';

// Create connection pool
const pool = new Pool({
  connectionString,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Pool error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (>1 second)
    if (duration > 1000) {
      console.warn('Slow query detected:', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      text: text.substring(0, 100),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction management
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Execute a function within a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a batch
 */
export async function batchQuery<T = any>(
  queries: Array<{ text: string; params?: any[] }>
): Promise<QueryResult<T>[]> {
  const client = await pool.connect();
  
  try {
    const results: QueryResult<T>[] = [];
    
    for (const q of queries) {
      const result = await client.query<T>(q.text, q.params);
      results.push(result);
    }
    
    return results;
  } finally {
    client.release();
  }
}

/**
 * Check if database connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * Helper function to build WHERE clause from filters
 */
export function buildWhereClause(
  filters: Record<string, any>,
  startIndex: number = 1
): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = startIndex;
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle IN clause
        conditions.push(`${key} = ANY($${paramIndex})`);
        params.push(value);
      } else if (typeof value === 'object' && value.operator) {
        // Handle custom operators (e.g., { operator: '>=', value: 100 })
        conditions.push(`${key} ${value.operator} $${paramIndex}`);
        params.push(value.value);
      } else {
        // Handle equality
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
      }
      paramIndex++;
    }
  }
  
  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return { clause, params };
}

/**
 * Helper function to build ORDER BY clause
 */
export function buildOrderByClause(
  orderBy?: string,
  order: 'ASC' | 'DESC' = 'DESC'
): string {
  if (!orderBy) return '';
  
  // Sanitize column name to prevent SQL injection
  const sanitizedColumn = orderBy.replace(/[^a-zA-Z0-9_]/g, '');
  
  return `ORDER BY ${sanitizedColumn} ${order}`;
}

/**
 * Helper function to build LIMIT and OFFSET clause
 */
export function buildPaginationClause(
  limit?: number,
  offset?: number
): string {
  const clauses: string[] = [];
  
  if (limit !== undefined && limit > 0) {
    clauses.push(`LIMIT ${limit}`);
  }
  
  if (offset !== undefined && offset > 0) {
    clauses.push(`OFFSET ${offset}`);
  }
  
  return clauses.join(' ');
}

/**
 * Helper function to execute a query with pagination
 */
export async function queryWithPagination<T = any>(
  baseQuery: string,
  filters: Record<string, any> = {},
  options: {
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ rows: T[]; total: number }> {
  // Build WHERE clause
  const { clause: whereClause, params } = buildWhereClause(filters);
  
  // Build ORDER BY clause
  const orderByClause = buildOrderByClause(options.orderBy, options.order);
  
  // Build pagination clause
  const paginationClause = buildPaginationClause(options.limit, options.offset);
  
  // Execute count query
  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as subquery ${whereClause}`;
  const countResult = await query<{ total: string }>(countQuery, params);
  const total = parseInt(countResult.rows[0]?.total || '0', 10);
  
  // Execute data query
  const dataQuery = `${baseQuery} ${whereClause} ${orderByClause} ${paginationClause}`;
  const dataResult = await query<T>(dataQuery, params);
  
  return {
    rows: dataResult.rows,
    total,
  };
}

/**
 * Helper function to insert or update (upsert)
 */
export async function upsert(
  table: string,
  data: Record<string, any>,
  conflictColumns: string[]
): Promise<QueryResult> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  
  const updateSet = columns
    .filter(col => !conflictColumns.includes(col))
    .map(col => `${col} = EXCLUDED.${col}`)
    .join(', ');
  
  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (${conflictColumns.join(', ')})
    DO UPDATE SET ${updateSet}
    RETURNING *
  `;
  
  return await pool.query(query, values);
}

// Export pool for advanced usage
export { pool };

// Export types
export type { PoolClient, QueryResult };

