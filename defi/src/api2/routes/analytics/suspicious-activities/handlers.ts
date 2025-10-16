/**
 * API Handlers for Suspicious Activities
 * Story: 3.2.2 - Suspicious Activity Detection
 * Phase: 7 - API Development
 */

import { Request, Response } from 'hyper-express';
import { query } from '../../../analytics/db/connection';
import { SuspiciousActivity } from '../../../analytics/engines/rug-pull-detector';
import { RugPullDetector } from '../../../analytics/engines/rug-pull-detector';
import { WashTradingDetector } from '../../../analytics/engines/wash-trading-detector';
import { PumpDumpDetector } from '../../../analytics/engines/pump-dump-detector';
import { SybilAttackDetector } from '../../../analytics/engines/sybil-attack-detector';
import { SuspiciousActivityAlertManager } from '../../../analytics/services/suspicious-activity-alert-manager';

// ============================================================================
// Types
// ============================================================================

interface ListSuspiciousActivitiesQuery {
  activity_type?: string;
  severity?: string;
  chain_id?: string;
  protocol_id?: string;
  status?: string;
  min_confidence?: number;
  limit?: number;
  offset?: number;
}

interface UpdateStatusBody {
  status: 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  investigation_notes?: string;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /analytics/suspicious-activities
 * List suspicious activities with filtering and pagination
 */
export async function listSuspiciousActivities(req: Request, res: Response) {
  try {
    const {
      activity_type,
      severity,
      chain_id,
      protocol_id,
      status,
      min_confidence = 0,
      limit = 50,
      offset = 0,
    } = req.query as ListSuspiciousActivitiesQuery;

    // Build WHERE clause
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (activity_type) {
      conditions.push(`activity_type = $${paramIndex++}`);
      params.push(activity_type);
    }

    if (severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }

    if (chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chain_id);
    }

    if (protocol_id) {
      conditions.push(`protocol_id = $${paramIndex++}`);
      params.push(protocol_id);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (min_confidence) {
      conditions.push(`confidence_score >= $${paramIndex++}`);
      params.push(min_confidence);
    }

    // Add pagination params
    params.push(limit, offset);

    const whereClause = conditions.join(' AND ');
    const result = await query<SuspiciousActivity>(
      `SELECT * FROM suspicious_activities
       WHERE ${whereClause}
       ORDER BY detection_timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Get total count
    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM suspicious_activities WHERE ${whereClause}`,
      params.slice(0, -2) // Remove limit and offset
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count.toString()),
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
      },
    });
  } catch (error) {
    console.error('Error listing suspicious activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list suspicious activities',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /analytics/suspicious-activities/:id
 * Get suspicious activity by ID
 */
export async function getSuspiciousActivity(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await query<SuspiciousActivity>(
      `SELECT * FROM suspicious_activities WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Suspicious activity not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting suspicious activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suspicious activity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * PUT /analytics/suspicious-activities/:id/status
 * Update suspicious activity status
 */
export async function updateSuspiciousActivityStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = await req.json() as UpdateStatusBody;

    if (!body.status) {
      res.status(400).json({
        success: false,
        error: 'Status is required',
      });
      return;
    }

    const validStatuses = ['investigating', 'confirmed', 'false_positive', 'resolved'];
    if (!validStatuses.includes(body.status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    // Update status
    const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [body.status];
    let paramIndex = 2;

    if (body.investigation_notes) {
      updateFields.push(`investigation_notes = $${paramIndex++}`);
      params.push(body.investigation_notes);
    }

    if (body.status === 'resolved') {
      updateFields.push(`resolution_timestamp = NOW()`);
    }

    params.push(id);

    const result = await query<SuspiciousActivity>(
      `UPDATE suspicious_activities
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Suspicious activity not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating suspicious activity status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update suspicious activity status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /analytics/suspicious-activities/:id/acknowledge
 * Acknowledge suspicious activity alert
 */
export async function acknowledgeSuspiciousActivity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = await req.json() as { acknowledged_by: string };

    if (!body.acknowledged_by) {
      res.status(400).json({
        success: false,
        error: 'acknowledged_by is required',
      });
      return;
    }

    // Get activity
    const activityResult = await query<SuspiciousActivity>(
      `SELECT * FROM suspicious_activities WHERE id = $1`,
      [id]
    );

    if (activityResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Suspicious activity not found',
      });
      return;
    }

    // Acknowledge alert
    const alertManager = SuspiciousActivityAlertManager.getInstance();
    await alertManager.acknowledgeAlert(id, body.acknowledged_by);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
    });
  } catch (error) {
    console.error('Error acknowledging suspicious activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge suspicious activity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /analytics/suspicious-activities/detect/:protocol_id
 * Trigger detection for a specific protocol
 */
export async function detectSuspiciousActivities(req: Request, res: Response) {
  try {
    const { protocol_id } = req.params;
    const { chain_id = 'ethereum' } = req.query as { chain_id?: string };

    const activities: SuspiciousActivity[] = [];

    // Run all detectors
    const rugPullDetector = RugPullDetector.getInstance();
    const washTradingDetector = WashTradingDetector.getInstance();
    const pumpDumpDetector = PumpDumpDetector.getInstance();
    const sybilAttackDetector = SybilAttackDetector.getInstance();

    // Detect rug pulls
    const rugPull = await rugPullDetector.detectRugPull(protocol_id, chain_id);
    if (rugPull) activities.push(rugPull);

    // Detect wash trading
    const washTrading = await washTradingDetector.detectWashTrading(protocol_id, chain_id);
    activities.push(...washTrading);

    // Detect pump & dump
    const pumpDump = await pumpDumpDetector.detectPumpAndDump(protocol_id, chain_id);
    activities.push(...pumpDump);

    // Detect sybil attacks
    const sybilAttack = await sybilAttackDetector.detectSybilAttack(protocol_id, chain_id);
    activities.push(...sybilAttack);

    // Store activities
    if (activities.length > 0) {
      await rugPullDetector.storeActivities(activities);
    }

    res.json({
      success: true,
      data: {
        protocol_id,
        chain_id,
        activities_detected: activities.length,
        activities,
      },
    });
  } catch (error) {
    console.error('Error detecting suspicious activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect suspicious activities',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

