/**
 * Create Alert Lambda Function
 * EPIC-1: Smart Alerts & Notifications
 * Based on: defi/src/alerts/db.ts (existing alerts module)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import postgres from 'postgres'; // Use 'postgres' library (not 'pg')

// ============================================================================
// Database Connection (Follow existing pattern from defi/src/alerts/db.ts)
// ============================================================================

let alertsDBConnection: ReturnType<typeof postgres>;

function getAlertsDBConnection() {
  if (!alertsDBConnection) {
    // Use PREMIUM_DB if available, otherwise fall back to ALERTS_DB
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

// ============================================================================
// Types
// ============================================================================

interface CreateAlertRequest {
  name: string;
  description?: string;
  alert_type: 'whale_movement' | 'price_change' | 'gas_spike' | 'protocol_risk';
  protocol_id?: string;
  token_id?: string;
  chain_id?: string;
  condition: {
    threshold?: number;
    operator?: 'gt' | 'lt' | 'eq';
    value?: number;
  };
  channels: ('email' | 'telegram' | 'discord' | 'webhook')[];
  webhook_url?: string;
  throttle_minutes?: number;
  enabled?: boolean;
}

interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  alert_type: string;
  protocol_id?: string;
  token_id?: string;
  chain_id?: string;
  condition: any;
  channels: string[];
  webhook_url?: string;
  throttle_minutes: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Request body is required',
        }),
      };
    }

    const data: CreateAlertRequest = JSON.parse(event.body);

    // Validate required fields
    if (!data.name || !data.alert_type || !data.channels || data.channels.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing required fields: name, alert_type, channels',
        }),
      };
    }

    // Get user ID from JWT token (simplified - implement proper auth)
    const userId = event.requestContext.authorizer?.claims?.sub || 'test-user';

    // Create alert rule in database
    const sql = getAlertsDBConnection();

    const result = await sql`
      INSERT INTO alert_rules (
        user_id,
        name,
        description,
        alert_type,
        protocol_id,
        token_id,
        chain_id,
        condition,
        channels,
        webhook_url,
        throttle_minutes,
        enabled
      ) VALUES (
        ${userId},
        ${data.name},
        ${data.description || null},
        ${data.alert_type},
        ${data.protocol_id || null},
        ${data.token_id || null},
        ${data.chain_id || null},
        ${JSON.stringify(data.condition)},
        ${JSON.stringify(data.channels)},
        ${data.webhook_url || null},
        ${data.throttle_minutes || 5},
        ${data.enabled !== undefined ? data.enabled : true}
      )
      RETURNING *
    `;

    const alertRule: AlertRule = result[0] as any;

    // Return success response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: alertRule,
      }),
    };
  } catch (error) {
    console.error('Error creating alert:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

