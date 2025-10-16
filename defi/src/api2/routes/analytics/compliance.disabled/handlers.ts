/**
 * Compliance Screening API Handlers
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 8: API Development
 */

import { Request, Response } from 'hyper-express';
import { query } from '../../../utils/db';
import { ComplianceScreeningEngine } from '../../../../analytics/engines/compliance-screening-engine';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
});

const complianceEngine = ComplianceScreeningEngine.getInstance();

/**
 * POST /v1/risk/compliance/screen
 * Screen wallet address or transaction for compliance
 */
export async function screenCompliance(req: Request, res: Response): Promise<void> {
  try {
    const { wallet_address, chain_id = 'ethereum' } = req.body;

    if (!wallet_address) {
      res.status(400).json({
        success: false,
        error: 'wallet_address is required',
      });
      return;
    }

    // Check cache
    const cacheKey = `compliance:screen:${wallet_address}:${chain_id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
      return;
    }

    // Perform screening
    const screeningResult = await complianceEngine.screenWallet(wallet_address);

    // Save to database
    const insertResult = await query(
      `INSERT INTO compliance_screenings (
        screening_type,
        wallet_address,
        chain_id,
        screening_result,
        risk_level,
        risk_score,
        sanctions_match,
        sanctions_list,
        pep_match,
        adverse_media,
        match_details,
        screening_provider,
        screening_timestamp,
        screening_version,
        alert_generated,
        manual_review_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        'comprehensive',
        wallet_address.toLowerCase(),
        chain_id,
        screeningResult.screeningResult,
        screeningResult.riskLevel,
        screeningResult.riskScore,
        screeningResult.sanctions.match,
        screeningResult.sanctions.list,
        screeningResult.pep.match,
        screeningResult.adverseMedia.match,
        JSON.stringify({
          sanctions: screeningResult.sanctions,
          aml: screeningResult.aml,
          kyc: screeningResult.kyc,
          pep: screeningResult.pep,
          adverseMedia: screeningResult.adverseMedia,
        }),
        'internal',
        new Date(),
        '1.0',
        screeningResult.screeningResult === 'flagged',
        screeningResult.screeningResult === 'review_required',
      ]
    );

    const screeningId = insertResult.rows[0].id;

    const response = {
      id: screeningId,
      ...screeningResult,
    };

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(response));

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error screening compliance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /v1/risk/compliance/screenings/:id
 * Get screening result by ID
 */
export async function getScreening(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'id is required',
      });
      return;
    }

    // Check cache
    const cacheKey = `compliance:screening:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
      return;
    }

    // Get from database
    const result = await query(
      `SELECT * FROM compliance_screenings WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Screening not found',
      });
      return;
    }

    const screening = result.rows[0];

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(screening));

    res.json({
      success: true,
      data: screening,
    });
  } catch (error) {
    console.error('Error getting screening:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /v1/risk/compliance/screenings
 * List screenings with filters
 */
export async function listScreenings(req: Request, res: Response): Promise<void> {
  try {
    const {
      wallet_address,
      chain_id,
      screening_result,
      risk_level,
      limit = 20,
      offset = 0,
    } = req.query;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (wallet_address) {
      conditions.push(`wallet_address = $${paramIndex++}`);
      params.push((wallet_address as string).toLowerCase());
    }

    if (chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chain_id);
    }

    if (screening_result) {
      conditions.push(`screening_result = $${paramIndex++}`);
      params.push(screening_result);
    }

    if (risk_level) {
      conditions.push(`risk_level = $${paramIndex++}`);
      params.push(risk_level);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM compliance_screenings ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get screenings
    const result = await query(
      `SELECT * FROM compliance_screenings ${whereClause}
       ORDER BY screening_timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error listing screenings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /v1/risk/compliance/screen/batch
 * Batch screen multiple wallet addresses
 */
export async function batchScreenCompliance(req: Request, res: Response): Promise<void> {
  try {
    const { wallet_addresses, chain_id = 'ethereum' } = req.body;

    if (!wallet_addresses || !Array.isArray(wallet_addresses)) {
      res.status(400).json({
        success: false,
        error: 'wallet_addresses array is required',
      });
      return;
    }

    if (wallet_addresses.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Maximum 100 addresses per batch',
      });
      return;
    }

    // Perform batch screening
    const screeningResults = await complianceEngine.screenWallets(wallet_addresses);

    // Save to database
    const insertPromises = screeningResults.map(async (result) => {
      const insertResult = await query(
        `INSERT INTO compliance_screenings (
          screening_type,
          wallet_address,
          chain_id,
          screening_result,
          risk_level,
          risk_score,
          sanctions_match,
          sanctions_list,
          pep_match,
          adverse_media,
          match_details,
          screening_provider,
          screening_timestamp,
          screening_version,
          alert_generated,
          manual_review_required
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id`,
        [
          'comprehensive',
          result.walletAddress.toLowerCase(),
          chain_id,
          result.screeningResult,
          result.riskLevel,
          result.riskScore,
          result.sanctions.match,
          result.sanctions.list,
          result.pep.match,
          result.adverseMedia.match,
          JSON.stringify({
            sanctions: result.sanctions,
            aml: result.aml,
            kyc: result.kyc,
            pep: result.pep,
            adverseMedia: result.adverseMedia,
          }),
          'internal',
          new Date(),
          '1.0',
          result.screeningResult === 'flagged',
          result.screeningResult === 'review_required',
        ]
      );

      return {
        id: insertResult.rows[0].id,
        ...result,
      };
    });

    const results = await Promise.all(insertPromises);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error batch screening compliance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

