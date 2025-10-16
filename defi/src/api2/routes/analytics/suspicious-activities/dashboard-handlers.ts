/**
 * Dashboard Handlers for Suspicious Activity Monitoring
 * Story: 3.2.2 - Suspicious Activity Detection - Enhancements
 * Phase 3: Monitoring Dashboard
 *
 * Provides aggregated statistics and real-time monitoring data for suspicious activities.
 */

import { Request, Response } from 'hyper-express';
import { query } from '../../../analytics/db/connection';

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  total_activities: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  by_chain: Record<string, number>;
  recent_24h: number;
  recent_7d: number;
  recent_30d: number;
}

export interface TrendData {
  date: string;
  count: number;
  severity_breakdown: Record<string, number>;
}

export interface RecentActivity {
  id: string;
  activity_type: string;
  severity: string;
  confidence_score: number;
  protocol_id: string;
  chain_id: string;
  detection_timestamp: Date;
  status: string;
  estimated_loss_usd: number;
}

export interface ProtocolBreakdown {
  protocol_id: string;
  activity_count: number;
  total_estimated_loss_usd: number;
  severity_breakdown: Record<string, number>;
  most_common_type: string;
}

export interface SeverityDistribution {
  severity: string;
  count: number;
  percentage: number;
  avg_confidence: number;
  total_estimated_loss_usd: number;
}

// ============================================================================
// Dashboard Handlers
// ============================================================================

/**
 * Get dashboard statistics
 * GET /analytics/suspicious-activities/dashboard/stats
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const { chain_id, start_date, end_date } = req.query;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chain_id);
    }

    if (start_date) {
      conditions.push(`detection_timestamp >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`detection_timestamp <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total activities
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM suspicious_activities ${whereClause}`,
      params
    );
    const total_activities = parseInt(totalResult.rows[0].count);

    // Get activities by type
    const byTypeResult = await query<{ activity_type: string; count: string }>(
      `SELECT activity_type, COUNT(*) as count
       FROM suspicious_activities ${whereClause}
       GROUP BY activity_type`,
      params
    );
    const by_type: Record<string, number> = {};
    for (const row of byTypeResult.rows) {
      by_type[row.activity_type] = parseInt(row.count);
    }

    // Get activities by severity
    const bySeverityResult = await query<{ severity: string; count: string }>(
      `SELECT severity, COUNT(*) as count
       FROM suspicious_activities ${whereClause}
       GROUP BY severity`,
      params
    );
    const by_severity: Record<string, number> = {};
    for (const row of bySeverityResult.rows) {
      by_severity[row.severity] = parseInt(row.count);
    }

    // Get activities by status
    const byStatusResult = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM suspicious_activities ${whereClause}
       GROUP BY status`,
      params
    );
    const by_status: Record<string, number> = {};
    for (const row of byStatusResult.rows) {
      by_status[row.status] = parseInt(row.count);
    }

    // Get activities by chain
    const byChainResult = await query<{ chain_id: string; count: string }>(
      `SELECT chain_id, COUNT(*) as count
       FROM suspicious_activities ${whereClause}
       GROUP BY chain_id`,
      params
    );
    const by_chain: Record<string, number> = {};
    for (const row of byChainResult.rows) {
      by_chain[row.chain_id] = parseInt(row.count);
    }

    // Get recent activities (24h, 7d, 30d)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recent24hResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM suspicious_activities
       WHERE detection_timestamp >= $1 ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}`,
      [oneDayAgo, ...params]
    );
    const recent_24h = parseInt(recent24hResult.rows[0].count);

    const recent7dResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM suspicious_activities
       WHERE detection_timestamp >= $1 ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}`,
      [sevenDaysAgo, ...params]
    );
    const recent_7d = parseInt(recent7dResult.rows[0].count);

    const recent30dResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM suspicious_activities
       WHERE detection_timestamp >= $1 ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}`,
      [thirtyDaysAgo, ...params]
    );
    const recent_30d = parseInt(recent30dResult.rows[0].count);

    const stats: DashboardStats = {
      total_activities,
      by_type,
      by_severity,
      by_status,
      by_chain,
      recent_24h,
      recent_7d,
      recent_30d,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get trend data
 * GET /analytics/suspicious-activities/dashboard/trends
 */
export async function getTrendData(req: Request, res: Response): Promise<void> {
  try {
    const { chain_id, days = '30' } = req.query;
    const daysNum = parseInt(days as string);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    conditions.push(`detection_timestamp >= $${paramIndex++}`);
    params.push(startDate);

    if (chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chain_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get daily counts with severity breakdown
    const trendsResult = await query<{
      date: string;
      severity: string;
      count: string;
    }>(
      `SELECT
         DATE(detection_timestamp) as date,
         severity,
         COUNT(*) as count
       FROM suspicious_activities ${whereClause}
       GROUP BY DATE(detection_timestamp), severity
       ORDER BY date ASC`,
      params
    );

    // Group by date
    const trendsByDate = new Map<string, TrendData>();
    for (const row of trendsResult.rows) {
      if (!trendsByDate.has(row.date)) {
        trendsByDate.set(row.date, {
          date: row.date,
          count: 0,
          severity_breakdown: {},
        });
      }
      const trend = trendsByDate.get(row.date)!;
      const count = parseInt(row.count);
      trend.count += count;
      trend.severity_breakdown[row.severity] = count;
    }

    const trends = Array.from(trendsByDate.values());

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('Error getting trend data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}




/**
 * Get recent activities
 * GET /analytics/suspicious-activities/dashboard/recent
 */
export async function getRecentActivities(req: Request, res: Response): Promise<void> {
  try {
    const { chain_id, limit = '20', offset = '0' } = req.query;
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chain_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get recent activities
    const result = await query<RecentActivity>(
      `SELECT
         id, activity_type, severity, confidence_score,
         protocol_id, chain_id, detection_timestamp, status,
         estimated_loss_usd
       FROM suspicious_activities ${whereClause}
       ORDER BY detection_timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limitNum, offsetNum]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Error getting recent activities:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get protocol breakdown
 * GET /analytics/suspicious-activities/dashboard/protocols
 */
export async function getProtocolBreakdown(req: Request, res: Response): Promise<void> {
  try {
    const { chain_id, limit = '10' } = req.query;
    const limitNum = parseInt(limit as string);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chain_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get protocol breakdown
    const result = await query<{
      protocol_id: string;
      activity_count: string;
      total_estimated_loss_usd: string;
      severity_breakdown: any;
      most_common_type: string;
    }>(
      `SELECT
         protocol_id,
         COUNT(*) as activity_count,
         SUM(estimated_loss_usd) as total_estimated_loss_usd,
         jsonb_object_agg(severity, severity_count) as severity_breakdown,
         MODE() WITHIN GROUP (ORDER BY activity_type) as most_common_type
       FROM (
         SELECT
           protocol_id,
           activity_type,
           severity,
           estimated_loss_usd,
           COUNT(*) OVER (PARTITION BY protocol_id, severity) as severity_count
         FROM suspicious_activities ${whereClause}
       ) subquery
       GROUP BY protocol_id
       ORDER BY activity_count DESC
       LIMIT $${paramIndex++}`,
      [...params, limitNum]
    );

    const protocols: ProtocolBreakdown[] = result.rows.map(row => ({
      protocol_id: row.protocol_id,
      activity_count: parseInt(row.activity_count),
      total_estimated_loss_usd: parseFloat(row.total_estimated_loss_usd || '0'),
      severity_breakdown: row.severity_breakdown || {},
      most_common_type: row.most_common_type,
    }));

    res.json({
      success: true,
      data: protocols,
    });
  } catch (error) {
    console.error('Error getting protocol breakdown:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get severity distribution
 * GET /analytics/suspicious-activities/dashboard/severity
 */
export async function getSeverityDistribution(req: Request, res: Response): Promise<void> {
  try {
    const { chain_id } = req.query;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chain_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for percentage calculation
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM suspicious_activities ${whereClause}`,
      params
    );
    const total = parseInt(totalResult.rows[0].count);

    // Get severity distribution
    const result = await query<{
      severity: string;
      count: string;
      avg_confidence: string;
      total_estimated_loss_usd: string;
    }>(
      `SELECT
         severity,
         COUNT(*) as count,
         AVG(confidence_score) as avg_confidence,
         SUM(estimated_loss_usd) as total_estimated_loss_usd
       FROM suspicious_activities ${whereClause}
       GROUP BY severity
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END`,
      params
    );

    const distribution: SeverityDistribution[] = result.rows.map(row => ({
      severity: row.severity,
      count: parseInt(row.count),
      percentage: total > 0 ? (parseInt(row.count) / total) * 100 : 0,
      avg_confidence: parseFloat(row.avg_confidence),
      total_estimated_loss_usd: parseFloat(row.total_estimated_loss_usd || '0'),
    }));

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error('Error getting severity distribution:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
