/**
 * Market Risk Analyzer Engine
 * Story: 3.2.1 - Protocol Risk Assessment
 * 
 * Analyzes market risk based on:
 * - Volume metrics and changes
 * - User metrics and changes
 * - Price volatility
 */

import { query } from '../db/connection';

export interface MarketRiskMetrics {
  protocolId: string;
  dailyVolumeUsd: number | null;
  volumeChange24hPct: number | null;
  volumeChange7dPct: number | null;
  volumeChange30dPct: number | null;
  activeUsersCount: number | null;
  userChange24hPct: number | null;
  userChange7dPct: number | null;
  userChange30dPct: number | null;
  priceVolatility7d: number | null;
  priceVolatility30d: number | null;
  marketRiskScore: number;
  breakdown: {
    volumeScore: number;
    userScore: number;
    volatilityScore: number;
  };
}

export class MarketRiskAnalyzer {
  private static instance: MarketRiskAnalyzer;

  private constructor() {}

  public static getInstance(): MarketRiskAnalyzer {
    if (!MarketRiskAnalyzer.instance) {
      MarketRiskAnalyzer.instance = new MarketRiskAnalyzer();
    }
    return MarketRiskAnalyzer.instance;
  }

  public async analyzeMarketRisk(protocolId: string): Promise<MarketRiskMetrics> {
    const result = await query<any>(
      `SELECT * FROM protocol_market_risks WHERE protocol_id = $1`,
      [protocolId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Market risk data not found for protocol: ${protocolId}`);
    }

    const data = result.rows[0];

    const volumeScore = this.calculateVolumeScore(
      data.daily_volume_usd,
      data.volume_change_30d_pct
    );

    const userScore = this.calculateUserScore(
      data.active_users_count,
      data.user_change_30d_pct
    );

    const volatilityScore = this.calculateVolatilityScore(
      data.price_volatility_30d
    );

    const marketRiskScore = this.calculateOverallScore(
      volumeScore,
      userScore,
      volatilityScore
    );

    return {
      protocolId: data.protocol_id,
      dailyVolumeUsd: data.daily_volume_usd ? parseFloat(data.daily_volume_usd) : null,
      volumeChange24hPct: data.volume_change_24h_pct ? parseFloat(data.volume_change_24h_pct) : null,
      volumeChange7dPct: data.volume_change_7d_pct ? parseFloat(data.volume_change_7d_pct) : null,
      volumeChange30dPct: data.volume_change_30d_pct ? parseFloat(data.volume_change_30d_pct) : null,
      activeUsersCount: data.active_users_count,
      userChange24hPct: data.user_change_24h_pct ? parseFloat(data.user_change_24h_pct) : null,
      userChange7dPct: data.user_change_7d_pct ? parseFloat(data.user_change_7d_pct) : null,
      userChange30dPct: data.user_change_30d_pct ? parseFloat(data.user_change_30d_pct) : null,
      priceVolatility7d: data.price_volatility_7d ? parseFloat(data.price_volatility_7d) : null,
      priceVolatility30d: data.price_volatility_30d ? parseFloat(data.price_volatility_30d) : null,
      marketRiskScore: Math.round(marketRiskScore * 100) / 100,
      breakdown: {
        volumeScore: Math.round(volumeScore * 100) / 100,
        userScore: Math.round(userScore * 100) / 100,
        volatilityScore: Math.round(volatilityScore * 100) / 100,
      },
    };
  }

  public calculateVolumeScore(
    volume: number | null,
    change30d: number | null
  ): number {
    if (volume === null) return 60;

    let score = 0;
    if (volume >= 1_000_000_000) score = 10;
    else if (volume >= 100_000_000) score = 25;
    else if (volume >= 10_000_000) score = 45;
    else if (volume >= 1_000_000) score = 65;
    else score = 85;

    if (change30d !== null && change30d < -30) {
      score += Math.min(Math.abs(change30d) / 2, 20);
    }

    return Math.min(score, 100);
  }

  public calculateUserScore(
    users: number | null,
    change30d: number | null
  ): number {
    if (users === null) return 60;

    let score = 0;
    if (users >= 50000) score = 10;
    else if (users >= 10000) score = 25;
    else if (users >= 5000) score = 45;
    else if (users >= 1000) score = 65;
    else score = 85;

    if (change30d !== null && change30d < -30) {
      score += Math.min(Math.abs(change30d) / 2, 20);
    }

    return Math.min(score, 100);
  }

  public calculateVolatilityScore(volatility: number | null): number {
    if (volatility === null) return 50;

    if (volatility < 0.2) return 15;
    else if (volatility < 0.4) return 35;
    else if (volatility < 0.6) return 55;
    else if (volatility < 0.8) return 75;
    else return 90;
  }

  private calculateOverallScore(
    volumeScore: number,
    userScore: number,
    volatilityScore: number
  ): number {
    return volumeScore * 0.4 + userScore * 0.3 + volatilityScore * 0.3;
  }

  public async storeMarketRisk(metrics: MarketRiskMetrics): Promise<void> {
    await query(
      `UPDATE protocol_market_risks 
       SET market_risk_score = $1, updated_at = NOW()
       WHERE protocol_id = $2`,
      [metrics.marketRiskScore, metrics.protocolId]
    );
  }
}

