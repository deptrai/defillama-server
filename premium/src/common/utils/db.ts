/**
 * Database Connection Utility
 * Shared database connection for premium services
 */

import postgres from 'postgres';

// ============================================================================
// Database Connection
// ============================================================================

let alertsDBConnection: ReturnType<typeof postgres>;

/**
 * Get database connection for alerts/premium services
 * Uses PREMIUM_DB if available, otherwise falls back to ALERTS_DB
 */
export function getAlertsDBConnection() {
  if (!alertsDBConnection) {
    const dbUrl = process.env.PREMIUM_DB || process.env.ALERTS_DB;
    if (!dbUrl) {
      throw new Error('Database connection string not found. Set PREMIUM_DB or ALERTS_DB environment variable.');
    }
    alertsDBConnection = postgres(dbUrl, {
      idle_timeout: 90,
      max: 10, // Connection pool size
    });
  }
  return alertsDBConnection;
}

/**
 * Close database connection (for cleanup)
 */
export async function closeAlertsDBConnection(): Promise<void> {
  if (alertsDBConnection) {
    await alertsDBConnection.end({ timeout: 2 });
  }
}

