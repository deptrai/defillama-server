/**
 * Detector Accuracy Tracker
 * Tracks and analyzes MEV detector accuracy metrics
 * 
 * Features:
 * - Track detection events
 * - Validate detections
 * - Calculate accuracy metrics
 * - Store confidence factors
 * - Generate performance reports
 */

import { query } from '../db/connection';
import { MultiFactorConfidenceOutput } from '../engines/enhanced-confidence-scorer';
import { ProfitTier, getProfitTier } from '../engines/detector-config';

// ============================================================================
// Types
// ============================================================================

export interface DetectionEvent {
  opportunity_id: string;
  detector_type: string;
  chain_id: string;
  predicted_profit_usd: number;
  predicted_confidence: number;
  detection_time_ms: number;
}

export interface ValidationEvent {
  opportunity_id: string;
  is_true_positive: boolean;
  actual_profit_usd?: number;
  validation_method: 'manual' | 'automatic' | 'on_chain';
  validation_notes?: string;
  validated_by?: string;
  on_chain_tx_hash?: string;
  on_chain_block_number?: number;
}

export interface AccuracyMetrics {
  detector_type: string;
  chain_id: string;
  date: string;
  total_detections: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  accuracy: number;
  avg_confidence: number;
  total_profit_usd: number;
  avg_profit_usd: number;
}

// ============================================================================
// Detector Accuracy Tracker
// ============================================================================

export class DetectorAccuracyTracker {
  private static instance: DetectorAccuracyTracker;

  private constructor() {}

  public static getInstance(): DetectorAccuracyTracker {
    if (!DetectorAccuracyTracker.instance) {
      DetectorAccuracyTracker.instance = new DetectorAccuracyTracker();
    }
    return DetectorAccuracyTracker.instance;
  }

  /**
   * Track a detection event
   */
  public async trackDetection(event: DetectionEvent): Promise<void> {
    try {
      // Create validation record
      await query(
        `INSERT INTO mev_detection_validations (
          opportunity_id,
          detector_type,
          validation_status,
          predicted_profit_usd,
          predicted_confidence,
          created_at
        ) VALUES ($1, $2, 'pending', $3, $4, NOW())
        ON CONFLICT (opportunity_id) DO NOTHING`,
        [
          event.opportunity_id,
          event.detector_type,
          event.predicted_profit_usd,
          event.predicted_confidence,
        ]
      );

      // Update daily metrics
      await this.updateDailyMetrics(event);
    } catch (error) {
      console.error('Error tracking detection:', error);
    }
  }

  /**
   * Validate a detection
   */
  public async validateDetection(validation: ValidationEvent): Promise<void> {
    try {
      // Get predicted values
      const result = await query(
        `SELECT predicted_profit_usd, predicted_confidence, detector_type
         FROM mev_detection_validations
         WHERE opportunity_id = $1`,
        [validation.opportunity_id]
      );

      if (result.rows.length === 0) {
        console.error(`No validation record found for opportunity ${validation.opportunity_id}`);
        return;
      }

      const predicted = result.rows[0];
      const profitAccuracy = validation.actual_profit_usd
        ? (validation.actual_profit_usd / predicted.predicted_profit_usd) * 100
        : null;

      // Update validation record
      await query(
        `UPDATE mev_detection_validations SET
          validation_status = 'validated',
          is_true_positive = $1,
          actual_profit_usd = $2,
          profit_accuracy_percentage = $3,
          validation_method = $4,
          validation_notes = $5,
          validated_by = $6,
          on_chain_verified = $7,
          on_chain_tx_hash = $8,
          on_chain_block_number = $9,
          validated_at = NOW(),
          updated_at = NOW()
         WHERE opportunity_id = $10`,
        [
          validation.is_true_positive,
          validation.actual_profit_usd,
          profitAccuracy,
          validation.validation_method,
          validation.validation_notes,
          validation.validated_by,
          validation.validation_method === 'on_chain',
          validation.on_chain_tx_hash,
          validation.on_chain_block_number,
          validation.opportunity_id,
        ]
      );

      // Recalculate metrics
      await this.recalculateMetrics(predicted.detector_type);
    } catch (error) {
      console.error('Error validating detection:', error);
    }
  }

  /**
   * Store confidence factors
   */
  public async storeConfidenceFactors(
    opportunityId: string,
    confidence: MultiFactorConfidenceOutput
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO mev_confidence_factors (
          opportunity_id,
          overall_confidence,
          confidence_level,
          gas_price_score,
          timing_score,
          volume_score,
          liquidity_score,
          historical_score,
          factors_breakdown,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (opportunity_id) DO NOTHING`,
        [
          opportunityId,
          confidence.overall_confidence,
          confidence.confidence_level,
          confidence.gas_price_score,
          confidence.timing_score,
          confidence.volume_score,
          confidence.liquidity_score,
          confidence.historical_score,
          JSON.stringify(confidence.factors_breakdown),
        ]
      );
    } catch (error) {
      console.error('Error storing confidence factors:', error);
    }
  }

  /**
   * Update daily metrics
   */
  private async updateDailyMetrics(event: DetectionEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO mev_detector_metrics (
        detector_type,
        chain_id,
        date,
        total_detections,
        avg_confidence,
        total_profit_usd,
        avg_profit_usd,
        total_detection_time_ms,
        avg_detection_time_ms,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 1, $4, $5, $5, $6, $6, NOW(), NOW())
      ON CONFLICT (detector_type, chain_id, date) DO UPDATE SET
        total_detections = mev_detector_metrics.total_detections + 1,
        avg_confidence = (
          (mev_detector_metrics.avg_confidence * mev_detector_metrics.total_detections + $4) /
          (mev_detector_metrics.total_detections + 1)
        ),
        total_profit_usd = mev_detector_metrics.total_profit_usd + $5,
        avg_profit_usd = (
          (mev_detector_metrics.total_profit_usd + $5) /
          (mev_detector_metrics.total_detections + 1)
        ),
        total_detection_time_ms = mev_detector_metrics.total_detection_time_ms + $6,
        avg_detection_time_ms = (
          (mev_detector_metrics.total_detection_time_ms + $6) /
          (mev_detector_metrics.total_detections + 1)
        ),
        updated_at = NOW()`,
      [
        event.detector_type,
        event.chain_id,
        today,
        event.predicted_confidence,
        event.predicted_profit_usd,
        event.detection_time_ms,
      ]
    );

    // Update profit tier stats
    const profitTier = getProfitTier(event.predicted_profit_usd);
    await this.updateProfitTierStats(event, profitTier);
  }

  /**
   * Update profit tier statistics
   */
  private async updateProfitTierStats(
    event: DetectionEvent,
    profitTier: ProfitTier
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO mev_profit_tier_stats (
        detector_type,
        chain_id,
        profit_tier,
        date,
        total_opportunities,
        avg_confidence,
        total_profit_usd,
        avg_profit_usd,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, 1, $5, $6, $6, NOW(), NOW())
      ON CONFLICT (detector_type, chain_id, profit_tier, date) DO UPDATE SET
        total_opportunities = mev_profit_tier_stats.total_opportunities + 1,
        avg_confidence = (
          (mev_profit_tier_stats.avg_confidence * mev_profit_tier_stats.total_opportunities + $5) /
          (mev_profit_tier_stats.total_opportunities + 1)
        ),
        total_profit_usd = mev_profit_tier_stats.total_profit_usd + $6,
        avg_profit_usd = (
          (mev_profit_tier_stats.total_profit_usd + $6) /
          (mev_profit_tier_stats.total_opportunities + 1)
        ),
        updated_at = NOW()`,
      [
        event.detector_type,
        event.chain_id,
        profitTier,
        today,
        event.predicted_confidence,
        event.predicted_profit_usd,
      ]
    );
  }

  /**
   * Recalculate accuracy metrics after validation
   */
  private async recalculateMetrics(detectorType: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Get validation counts
    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE is_true_positive = true) as true_positives,
        COUNT(*) FILTER (WHERE is_true_positive = false) as false_positives
       FROM mev_detection_validations
       WHERE detector_type = $1
         AND DATE(validated_at) = $2
         AND validation_status = 'validated'`,
      [detectorType, today]
    );

    if (result.rows.length === 0) return;

    const { true_positives, false_positives } = result.rows[0];
    const total = parseInt(true_positives) + parseInt(false_positives);

    if (total === 0) return;

    const precision = (parseInt(true_positives) / total) * 100;
    const recall = precision; // Simplified for now
    const f1Score = (2 * precision * recall) / (precision + recall);
    const accuracy = precision;

    // Update metrics
    await query(
      `UPDATE mev_detector_metrics SET
        true_positives = $1,
        false_positives = $2,
        precision = $3,
        recall = $4,
        f1_score = $5,
        accuracy = $6,
        updated_at = NOW()
       WHERE detector_type = $7
         AND date = $8`,
      [
        true_positives,
        false_positives,
        precision,
        recall,
        f1Score,
        accuracy,
        detectorType,
        today,
      ]
    );
  }

  /**
   * Get accuracy metrics for a detector
   */
  public async getAccuracyMetrics(
    detectorType: string,
    chainId?: string,
    days: number = 7
  ): Promise<AccuracyMetrics[]> {
    const result = await query(
      `SELECT 
        detector_type,
        chain_id,
        date::text,
        total_detections,
        true_positives,
        false_positives,
        false_negatives,
        precision,
        recall,
        f1_score,
        accuracy,
        avg_confidence,
        total_profit_usd,
        avg_profit_usd
       FROM mev_detector_metrics
       WHERE detector_type = $1
         AND ($2::text IS NULL OR chain_id = $2)
         AND date >= CURRENT_DATE - $3::integer
       ORDER BY date DESC`,
      [detectorType, chainId, days]
    );

    return result.rows;
  }
}

