/**
 * Bot Sophistication Scorer Engine
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Scores MEV bot sophistication (0-100) based on:
 * - Strategy Complexity (30%): Multi-strategy, advanced patterns
 * - Technical Capabilities (30%): Flashbots, private mempool, flash loans
 * - Execution Quality (20%): Success rate, gas efficiency, speed
 * - Scale & Consistency (20%): Volume, frequency, uptime
 * 
 * Sophistication Levels:
 * - 90-100: Elite (Top-tier professional bots)
 * - 75-89: Advanced (Sophisticated institutional bots)
 * - 60-74: Intermediate (Competent independent bots)
 * - 40-59: Basic (Simple automated bots)
 * - 0-39: Novice (Manual or poorly optimized bots)
 */

import { query } from '../db/connection';
import { BotStrategyAnalyzer } from './bot-strategy-analyzer';
import { BotPerformanceCalculator } from './bot-performance-calculator';

// ============================================================================
// Types
// ============================================================================

export interface BotSophisticationScore {
  bot_address: string;
  chain_id: string;
  overall_score: number; // 0-100
  sophistication_level: SophisticationLevel;

  // Component Scores
  strategy_complexity_score: number; // 0-100
  technical_capabilities_score: number; // 0-100
  execution_quality_score: number; // 0-100
  scale_consistency_score: number; // 0-100

  // Detailed Breakdown
  breakdown: {
    // Strategy Complexity (30%)
    is_multi_strategy: boolean;
    uses_advanced_patterns: boolean;
    strategy_diversity: number;

    // Technical Capabilities (30%)
    uses_flashbots: boolean;
    uses_private_mempool: boolean;
    uses_flash_loans: boolean;
    uses_multi_hop: boolean;

    // Execution Quality (20%)
    success_rate_pct: number;
    gas_efficiency_score: number;
    profit_consistency: number;

    // Scale & Consistency (20%)
    total_volume_usd: number;
    transactions_per_day: number;
    uptime_pct: number;
    active_days: number;
  };
}

export type SophisticationLevel = 'elite' | 'advanced' | 'intermediate' | 'basic' | 'novice';

// ============================================================================
// BotSophisticationScorer Class
// ============================================================================

/**
 * BotSophisticationScorer - Singleton engine for scoring bot sophistication
 */
export class BotSophisticationScorer {
  private static instance: BotSophisticationScorer;
  private strategyAnalyzer: BotStrategyAnalyzer;
  private performanceCalculator: BotPerformanceCalculator;

  // Scoring weights
  private weights = {
    strategy_complexity: 0.30,
    technical_capabilities: 0.30,
    execution_quality: 0.20,
    scale_consistency: 0.20,
  };

  private constructor() {
    this.strategyAnalyzer = BotStrategyAnalyzer.getInstance();
    this.performanceCalculator = BotPerformanceCalculator.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BotSophisticationScorer {
    if (!BotSophisticationScorer.instance) {
      BotSophisticationScorer.instance = new BotSophisticationScorer();
    }
    return BotSophisticationScorer.instance;
  }

  /**
   * Calculate sophistication score for a bot
   */
  public async calculateScore(
    botAddress: string,
    chainId: string
  ): Promise<BotSophisticationScore> {
    // Get bot data
    const bot = await this.getBotData(botAddress, chainId);
    if (!bot) {
      throw new Error(`Bot not found: ${botAddress} on ${chainId}`);
    }

    // Get strategy analysis
    const strategyAnalysis = await this.strategyAnalyzer.analyzeStrategy(botAddress, chainId);

    // Get performance metrics
    const performance = await this.performanceCalculator.calculatePerformance(
      botAddress,
      chainId
    );

    // Calculate component scores
    const strategyComplexityScore = this.calculateStrategyComplexityScore(
      strategyAnalysis,
      bot
    );

    const technicalCapabilitiesScore = this.calculateTechnicalCapabilitiesScore(bot);

    const executionQualityScore = this.calculateExecutionQualityScore(performance, bot);

    const scaleConsistencyScore = this.calculateScaleConsistencyScore(performance, bot);

    // Calculate overall score
    const overallScore = Math.round(
      strategyComplexityScore * this.weights.strategy_complexity +
        technicalCapabilitiesScore * this.weights.technical_capabilities +
        executionQualityScore * this.weights.execution_quality +
        scaleConsistencyScore * this.weights.scale_consistency
    );

    // Determine sophistication level
    const sophisticationLevel = this.determineSophisticationLevel(overallScore);

    return {
      bot_address: botAddress,
      chain_id: chainId,
      overall_score: overallScore,
      sophistication_level: sophisticationLevel,
      strategy_complexity_score: strategyComplexityScore,
      technical_capabilities_score: technicalCapabilitiesScore,
      execution_quality_score: executionQualityScore,
      scale_consistency_score: scaleConsistencyScore,
      breakdown: {
        // Strategy Complexity
        is_multi_strategy: strategyAnalysis.is_multi_strategy,
        uses_advanced_patterns: this.detectAdvancedPatterns(bot),
        strategy_diversity: strategyAnalysis.specialization_score,

        // Technical Capabilities
        uses_flashbots: bot.uses_flashbots || false,
        uses_private_mempool: bot.uses_private_mempool || false,
        uses_flash_loans: bot.uses_flash_loans || false,
        uses_multi_hop: bot.uses_multi_hop || false,

        // Execution Quality
        success_rate_pct: performance.success.success_rate_pct,
        gas_efficiency_score: performance.efficiency.gas_efficiency_score,
        profit_consistency: performance.success.consistency_score,

        // Scale & Consistency
        total_volume_usd: performance.financial.total_mev_extracted_usd,
        transactions_per_day: performance.activity.transactions_per_day,
        uptime_pct: performance.activity.uptime_pct,
        active_days: performance.activity.active_days,
      },
    };
  }

  /**
   * Calculate Strategy Complexity Score (0-100)
   * Factors:
   * - Multi-strategy capability (40%)
   * - Strategy diversity (30%)
   * - Advanced patterns (30%)
   */
  private calculateStrategyComplexityScore(strategyAnalysis: any, bot: any): number {
    // Multi-strategy capability
    const multiStrategyScore = strategyAnalysis.is_multi_strategy ? 100 : 50;

    // Strategy diversity (inverse of specialization)
    const diversityScore = 100 - strategyAnalysis.specialization_score;

    // Advanced patterns
    const advancedPatternsScore = this.detectAdvancedPatterns(bot) ? 100 : 0;

    return Math.round(
      multiStrategyScore * 0.40 + diversityScore * 0.30 + advancedPatternsScore * 0.30
    );
  }

  /**
   * Calculate Technical Capabilities Score (0-100)
   * Factors:
   * - Flashbots usage (30%)
   * - Private mempool usage (30%)
   * - Flash loans usage (25%)
   * - Multi-hop routing (15%)
   */
  private calculateTechnicalCapabilitiesScore(bot: any): number {
    const flashbotsScore = bot.uses_flashbots ? 100 : 0;
    const privateMempoolScore = bot.uses_private_mempool ? 100 : 0;
    const flashLoansScore = bot.uses_flash_loans ? 100 : 0;
    const multiHopScore = bot.uses_multi_hop ? 100 : 0;

    return Math.round(
      flashbotsScore * 0.30 +
        privateMempoolScore * 0.30 +
        flashLoansScore * 0.25 +
        multiHopScore * 0.15
    );
  }

  /**
   * Calculate Execution Quality Score (0-100)
   * Factors:
   * - Success rate (40%)
   * - Gas efficiency (35%)
   * - Profit consistency (25%)
   */
  private calculateExecutionQualityScore(performance: any, bot: any): number {
    const successRateScore = performance.success.success_rate_pct;
    const gasEfficiencyScore = performance.efficiency.gas_efficiency_score;
    const consistencyScore = performance.success.consistency_score;

    return Math.round(
      successRateScore * 0.40 + gasEfficiencyScore * 0.35 + consistencyScore * 0.25
    );
  }

  /**
   * Calculate Scale & Consistency Score (0-100)
   * Factors:
   * - Volume scale (30%)
   * - Transaction frequency (30%)
   * - Uptime consistency (25%)
   * - Longevity (15%)
   */
  private calculateScaleConsistencyScore(performance: any, bot: any): number {
    // Volume scale (logarithmic)
    const volumeUsd = performance.financial.total_mev_extracted_usd;
    const volumeScore = this.normalizeVolume(volumeUsd);

    // Transaction frequency
    const txPerDay = performance.activity.transactions_per_day;
    const frequencyScore = this.normalizeFrequency(txPerDay);

    // Uptime consistency
    const uptimeScore = performance.activity.uptime_pct;

    // Longevity (active days)
    const activeDays = performance.activity.active_days;
    const longevityScore = this.normalizeLongevity(activeDays);

    return Math.round(
      volumeScore * 0.30 +
        frequencyScore * 0.30 +
        uptimeScore * 0.25 +
        longevityScore * 0.15
    );
  }

  /**
   * Detect advanced patterns (flash loans, multi-hop, complex strategies)
   */
  private detectAdvancedPatterns(bot: any): boolean {
    return bot.uses_flash_loans || bot.uses_multi_hop || false;
  }

  /**
   * Normalize volume to 0-100 scale (logarithmic)
   */
  private normalizeVolume(volumeUsd: number): number {
    // $1M+ = 100
    // $100K = 80
    // $10K = 60
    // $1K = 40
    // <$1K = 0-40

    if (volumeUsd >= 1000000) return 100;
    if (volumeUsd >= 100000) return 80 + ((Math.log10(volumeUsd) - 5) / 1) * 20;
    if (volumeUsd >= 10000) return 60 + ((Math.log10(volumeUsd) - 4) / 1) * 20;
    if (volumeUsd >= 1000) return 40 + ((Math.log10(volumeUsd) - 3) / 1) * 20;
    return (volumeUsd / 1000) * 40;
  }

  /**
   * Normalize frequency to 0-100 scale
   */
  private normalizeFrequency(txPerDay: number): number {
    // 100+ tx/day = 100
    // 50 tx/day = 80
    // 10 tx/day = 60
    // 1 tx/day = 40
    // <1 tx/day = 0-40

    if (txPerDay >= 100) return 100;
    if (txPerDay >= 50) return 80 + ((txPerDay - 50) / 50) * 20;
    if (txPerDay >= 10) return 60 + ((txPerDay - 10) / 40) * 20;
    if (txPerDay >= 1) return 40 + ((txPerDay - 1) / 9) * 20;
    return txPerDay * 40;
  }

  /**
   * Normalize longevity to 0-100 scale
   */
  private normalizeLongevity(activeDays: number): number {
    // 365+ days = 100
    // 180 days = 80
    // 90 days = 60
    // 30 days = 40
    // <30 days = 0-40

    if (activeDays >= 365) return 100;
    if (activeDays >= 180) return 80 + ((activeDays - 180) / 185) * 20;
    if (activeDays >= 90) return 60 + ((activeDays - 90) / 90) * 20;
    if (activeDays >= 30) return 40 + ((activeDays - 30) / 60) * 20;
    return (activeDays / 30) * 40;
  }

  /**
   * Determine sophistication level from score
   */
  private determineSophisticationLevel(score: number): SophisticationLevel {
    if (score >= 90) return 'elite';
    if (score >= 75) return 'advanced';
    if (score >= 60) return 'intermediate';
    if (score >= 40) return 'basic';
    return 'novice';
  }

  /**
   * Get bot data
   */
  private async getBotData(botAddress: string, chainId: string): Promise<any> {
    const result = await query(
      `SELECT * FROM mev_bots WHERE bot_address = $1 AND chain_id = $2`,
      [botAddress, chainId]
    );

    return result.rows[0] || null;
  }
}

