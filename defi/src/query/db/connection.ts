/**
 * Database Connection for Query Module
 * Provides PostgreSQL connection for Advanced Query Processor
 */

import postgres from 'postgres';

let queryDBConnection: ReturnType<typeof postgres> | null = null;

/**
 * Get database connection for query module
 * Uses ALERTS_DB environment variable or default connection string
 */
export default async function getDBConnection(): Promise<ReturnType<typeof postgres>> {
  if (!queryDBConnection) {
    const connectionString = process.env.ALERTS_DB || 'postgresql://defillama:defillama123@localhost:5432/defillama';
    queryDBConnection = postgres(connectionString);
  }

  return queryDBConnection;
}

/**
 * Close database connection
 */
export async function closeDBConnection(): Promise<void> {
  if (queryDBConnection) {
    await queryDBConnection.end({ timeout: 2 });
    queryDBConnection = null;
  }
}

// Clean up on process exit
// Note: 'exit' event doesn't support async, so we only handle SIGINT/SIGTERM
process.on('SIGINT', async () => {
  await closeDBConnection();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await closeDBConnection();
  process.exit(0);
});

