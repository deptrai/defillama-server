/**
 * Pump & Dump Detector Engine
 * Story: 3.2.2 - Suspicious Activity Detection
 *
 * Detects pump and dump activities including:
 * - Coordinated buying (multiple wallets buying simultaneously)
 * - Price spike (>50% price increase in <1 hour)
 * - Coordinated selling (multiple wallets selling simultaneously)
 * - Dump (>50% price drop after spike)
 */

import { query } from '../db/connection';
import { SuspiciousActivity } from './rug-pull-detector';
import { BlockchainDataService } from '../services/blockchain-data-service';

// ============================================================================
// Types
// ============================================================================

export interface PricePoint {
  timestamp: Date;
  price: number;
  volume_usd: number;
}

export interface Trade {
  tx_hash: string;
  wallet_address: string;
  token_address: string;
  amount: number;
  price: number;
  timestamp: Date;
  type: 'buy' | 'sell';
}

export interface CoordinatedBuyingEvidence {
  wallet_addresses: string[];
  buy_count: number;
  timeframe: number; // seconds
  total_volume_usd: number;
  price_impact: number; // percentage
}

export interface PriceSpikeEvidence {
  start_price: number;
  end_price: number;
  percentage_increase: number;
  timeframe: number; // seconds
  volume_during_spike_usd: number;
  volume_spike_ratio: number; // current/normal
}

export interface CoordinatedSellingEvidence {
  wallet_addresses: string[];
  sell_count: number;
  timeframe: number; // seconds
  total_volume_usd: number;
  price_impact: number; // percentage
}

export interface DumpEvidence {
  peak_price: number;
  dump_price: number;
  percentage_drop: number;
  timeframe: number; // seconds
  volume_during_dump_usd: number;
  volume_spike_ratio: number; // current/normal
}

// ============================================================================
// Pump & Dump Detector
// ============================================================================

export class PumpDumpDetector {
  private static instance: PumpDumpDetector;
  private readonly DETECTOR_VERSION = 'v1.0.0';
  private blockchainDataService: BlockchainDataService;

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
  }

  public static getInstance(): PumpDumpDetector {
    if (!PumpDumpDetector.instance) {
      PumpDumpDetector.instance = new PumpDumpDetector();
    }
    return PumpDumpDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectPumpAndDump(protocolId: string, chainId: string = 'ethereum'): Promise<SuspiciousActivity[]> {
    try {
      const activities: SuspiciousActivity[] = [];

      // Get recent trades and price history
      const trades = await this.getRecentTrades(protocolId, chainId);
      const priceHistory = await this.getPriceHistory(protocolId, chainId);

      if (trades.length === 0 || priceHistory.length === 0) {
        return activities;
      }

      // Check coordinated buying
      const coordinatedBuying = this.detectCoordinatedBuying(trades);
      if (coordinatedBuying && coordinatedBuying.buy_count > 10) {
        activities.push(this.createActivity(
          'coordinated_buying',
          'high',
          this.calculateCoordinatedBuyingConfidence(coordinatedBuying),
          protocolId,
          chainId,
          coordinatedBuying
        ));
      }

      // Check price spike
      const priceSpike = this.detectPriceSpike(priceHistory);
      if (priceSpike && priceSpike.percentage_increase > 0.5) {
        activities.push(this.createActivity(
          'price_spike',
          'high',
          this.calculatePriceSpikeConfidence(priceSpike),
          protocolId,
          chainId,
          priceSpike
        ));

        // If price spike detected, check for dump
        const spikeTimestamp = priceHistory.find(p => p.price === priceSpike.end_price)?.timestamp;
        if (spikeTimestamp) {
          const dump = this.detectDump(priceHistory, spikeTimestamp);
          if (dump && dump.percentage_drop > 0.5) {
            activities.push(this.createActivity(
              'dump',
              'critical',
              this.calculateDumpConfidence(dump),
              protocolId,
              chainId,
              dump
            ));
          }
        }
      }

      // Check coordinated selling
      const coordinatedSelling = this.detectCoordinatedSelling(trades);
      if (coordinatedSelling && coordinatedSelling.sell_count > 10) {
        activities.push(this.createActivity(
          'coordinated_selling',
          'high',
          this.calculateCoordinatedSellingConfidence(coordinatedSelling),
          protocolId,
          chainId,
          coordinatedSelling
        ));
      }

      return activities;
    } catch (error) {
      console.error('Error detecting pump and dump:', error);
      return [];
    }
  }

  /**
   * Detect coordinated buying (multiple wallets buying simultaneously)
   */
  public detectCoordinatedBuying(trades: Trade[]): CoordinatedBuyingEvidence | null {
    const buyTrades = trades.filter(t => t.type === 'buy');
    if (buyTrades.length < 10) return null;

    // Group trades by 5-minute windows
    const windowSize = 300; // 5 minutes
    const windows = new Map<number, Trade[]>();

    for (const trade of buyTrades) {
      const windowKey = Math.floor(trade.timestamp.getTime() / 1000 / windowSize);
      if (!windows.has(windowKey)) {
        windows.set(windowKey, []);
      }
      windows.get(windowKey)!.push(trade);
    }

    // Find window with most coordinated buying
    let maxBuyCount = 0;
    let maxWindow: Trade[] = [];

    for (const [_, windowTrades] of windows) {
      if (windowTrades.length > maxBuyCount) {
        maxBuyCount = windowTrades.length;
        maxWindow = windowTrades;
      }
    }

    if (maxBuyCount < 10) return null;

    // Calculate evidence
    const wallets = new Set(maxWindow.map(t => t.wallet_address));
    const totalVolume = maxWindow.reduce((sum, t) => sum + (t.amount * t.price), 0);
    const prices = maxWindow.map(t => t.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const priceImpact = (maxPrice - avgPrice) / avgPrice;

    return {
      wallet_addresses: Array.from(wallets),
      buy_count: maxBuyCount,
      timeframe: windowSize,
      total_volume_usd: totalVolume,
      price_impact: priceImpact,
    };
  }

  /**
   * Detect price spike (>50% price increase in <1 hour)
   */
  public detectPriceSpike(priceHistory: PricePoint[]): PriceSpikeEvidence | null {
    if (priceHistory.length < 2) return null;

    // Sort by timestamp
    const sorted = [...priceHistory].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Find maximum price increase within 1 hour
    let maxIncrease = 0;
    let bestEvidence: PriceSpikeEvidence | null = null;

    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const timeDiff = (sorted[j].timestamp.getTime() - sorted[i].timestamp.getTime()) / 1000;
        if (timeDiff > 3600) break; // More than 1 hour

        const priceIncrease = (sorted[j].price - sorted[i].price) / sorted[i].price;
        if (priceIncrease > maxIncrease) {
          maxIncrease = priceIncrease;

          // Calculate volume during spike
          const spikeVolume = sorted
            .slice(i, j + 1)
            .reduce((sum, p) => sum + p.volume_usd, 0);

          // Calculate normal volume (average of all points)
          const normalVolume = sorted.reduce((sum, p) => sum + p.volume_usd, 0) / sorted.length;

          bestEvidence = {
            start_price: sorted[i].price,
            end_price: sorted[j].price,
            percentage_increase: priceIncrease,
            timeframe: timeDiff,
            volume_during_spike_usd: spikeVolume,
            volume_spike_ratio: spikeVolume / normalVolume,
          };
        }
      }
    }

    return bestEvidence && bestEvidence.percentage_increase > 0.5 ? bestEvidence : null;
  }

  /**
   * Detect coordinated selling (multiple wallets selling simultaneously)
   */
  public detectCoordinatedSelling(trades: Trade[]): CoordinatedSellingEvidence | null {
    const sellTrades = trades.filter(t => t.type === 'sell');
    if (sellTrades.length < 10) return null;

    // Group trades by 5-minute windows
    const windowSize = 300; // 5 minutes
    const windows = new Map<number, Trade[]>();

    for (const trade of sellTrades) {
      const windowKey = Math.floor(trade.timestamp.getTime() / 1000 / windowSize);
      if (!windows.has(windowKey)) {
        windows.set(windowKey, []);
      }
      windows.get(windowKey)!.push(trade);
    }

    // Find window with most coordinated selling
    let maxSellCount = 0;
    let maxWindow: Trade[] = [];

    for (const [_, windowTrades] of windows) {
      if (windowTrades.length > maxSellCount) {
        maxSellCount = windowTrades.length;
        maxWindow = windowTrades;
      }
    }

    if (maxSellCount < 10) return null;

    // Calculate evidence
    const wallets = new Set(maxWindow.map(t => t.wallet_address));
    const totalVolume = maxWindow.reduce((sum, t) => sum + (t.amount * t.price), 0);
    const prices = maxWindow.map(t => t.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const priceImpact = (avgPrice - minPrice) / avgPrice;

    return {
      wallet_addresses: Array.from(wallets),
      sell_count: maxSellCount,
      timeframe: windowSize,
      total_volume_usd: totalVolume,
      price_impact: priceImpact,
    };
  }

  /**
   * Calculate confidence for coordinated buying
   */
  public calculateCoordinatedBuyingConfidence(evidence: CoordinatedBuyingEvidence): number {
    let confidence = 50; // Base confidence

    // More buys = higher confidence
    if (evidence.buy_count > 50) confidence += 25;
    else if (evidence.buy_count > 30) confidence += 15;
    else if (evidence.buy_count > 10) confidence += 10;

    // More wallets = higher confidence
    if (evidence.wallet_addresses.length > 20) confidence += 15;
    else if (evidence.wallet_addresses.length > 10) confidence += 10;
    else if (evidence.wallet_addresses.length > 5) confidence += 5;

    // Higher price impact = higher confidence
    if (evidence.price_impact > 0.3) confidence += 10;
    else if (evidence.price_impact > 0.1) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for price spike
   */
  public calculatePriceSpikeConfidence(evidence: PriceSpikeEvidence): number {
    let confidence = 50; // Base confidence

    // Higher percentage increase = higher confidence
    if (evidence.percentage_increase > 2.0) confidence += 30; // >200%
    else if (evidence.percentage_increase > 1.0) confidence += 20; // >100%
    else if (evidence.percentage_increase > 0.5) confidence += 10; // >50%

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 900) confidence += 10; // <15 minutes
    else if (evidence.timeframe < 1800) confidence += 5; // <30 minutes

    // Higher volume spike = higher confidence
    if (evidence.volume_spike_ratio > 10) confidence += 10;
    else if (evidence.volume_spike_ratio > 5) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for coordinated selling
   */
  public calculateCoordinatedSellingConfidence(evidence: CoordinatedSellingEvidence): number {
    let confidence = 50; // Base confidence

    // More sells = higher confidence
    if (evidence.sell_count > 50) confidence += 25;
    else if (evidence.sell_count > 30) confidence += 15;
    else if (evidence.sell_count > 10) confidence += 10;

    // More wallets = higher confidence
    if (evidence.wallet_addresses.length > 20) confidence += 15;
    else if (evidence.wallet_addresses.length > 10) confidence += 10;
    else if (evidence.wallet_addresses.length > 5) confidence += 5;

    // Higher price impact = higher confidence
    if (evidence.price_impact > 0.3) confidence += 10;
    else if (evidence.price_impact > 0.1) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for dump
   */
  public calculateDumpConfidence(evidence: DumpEvidence): number {
    let confidence = 50; // Base confidence

    // Higher percentage drop = higher confidence
    if (evidence.percentage_drop > 0.9) confidence += 30; // >90%
    else if (evidence.percentage_drop > 0.7) confidence += 20; // >70%
    else if (evidence.percentage_drop > 0.5) confidence += 10; // >50%

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 1800) confidence += 10; // <30 minutes
    else if (evidence.timeframe < 3600) confidence += 5; // <60 minutes

    // Higher volume spike = higher confidence
    if (evidence.volume_spike_ratio > 10) confidence += 10;
    else if (evidence.volume_spike_ratio > 5) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Create suspicious activity record
   */
  private createActivity(
    type: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    confidence: number,
    protocolId: string,
    chainId: string,
    evidence: any
  ): SuspiciousActivity {
    const description = this.generateDescription(type, evidence);
    const walletAddresses = this.extractWalletAddresses(evidence);
    const estimatedLoss = this.estimateLoss(type, evidence);

    return {
      activity_type: 'pump_dump',
      severity,
      confidence_score: confidence,
      protocol_id: protocolId,
      wallet_addresses: walletAddresses,
      token_addresses: [],
      chain_id: chainId,
      detection_timestamp: new Date(),
      detection_method: 'rule_based',
      detector_version: this.DETECTOR_VERSION,
      evidence_tx_hashes: [],
      evidence_description: description,
      evidence_metrics: evidence,
      estimated_loss_usd: estimatedLoss,
      affected_users: 0,
      affected_protocols: [protocolId],
      status: 'investigating',
      alert_sent: false,
      reported_to_authorities: false,
    };
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(type: string, evidence: any): string {
    switch (type) {
      case 'coordinated_buying':
        return `Detected ${evidence.buy_count} coordinated buy orders from ${evidence.wallet_addresses.length} wallets with ${(evidence.price_impact * 100).toFixed(1)}% price impact. Total volume: $${evidence.total_volume_usd.toLocaleString()}`;
      case 'price_spike':
        return `Price spike of ${(evidence.percentage_increase * 100).toFixed(1)}% detected in ${Math.floor(evidence.timeframe / 60)} minutes. Price: $${evidence.start_price.toFixed(4)} → $${evidence.end_price.toFixed(4)}`;
      case 'coordinated_selling':
        return `Detected ${evidence.sell_count} coordinated sell orders from ${evidence.wallet_addresses.length} wallets with ${(evidence.price_impact * 100).toFixed(1)}% price impact. Total volume: $${evidence.total_volume_usd.toLocaleString()}`;
      case 'dump':
        return `Price dump of ${(evidence.percentage_drop * 100).toFixed(1)}% detected in ${Math.floor(evidence.timeframe / 60)} minutes after spike. Price: $${evidence.peak_price.toFixed(4)} → $${evidence.dump_price.toFixed(4)}`;
      default:
        return 'Pump and dump activity detected';
    }
  }

  /**
   * Extract wallet addresses from evidence
   */
  private extractWalletAddresses(evidence: any): string[] {
    if (evidence.wallet_addresses) return evidence.wallet_addresses;
    return [];
  }

  /**
   * Estimate financial loss
   */
  private estimateLoss(type: string, evidence: any): number {
    switch (type) {
      case 'dump':
        // Loss = volume during dump * percentage drop
        return evidence.volume_during_dump_usd * evidence.percentage_drop;
      case 'coordinated_selling':
        // Loss = total volume * price impact
        return evidence.total_volume_usd * evidence.price_impact;
      default:
        return 0;
    }
  }

  /**
   * Get recent trades
   *
   * NOTE: This is a mock implementation for testing purposes.
   * In production, this should query real trade data from:
   * 1. DEX subgraphs (Uniswap, SushiSwap, etc.)
   * 2. Blockchain transaction logs
   * 3. Centralized exchange APIs (if applicable)
   */
  private async getRecentTrades(protocolId: string, chainId: string): Promise<Trade[]> {
    // TODO: Replace with real trade data integration
    return [];
  }

  /**
   * Get price history
   *
   * NOTE: This is a mock implementation for testing purposes.
   * In production, this should query real price data from:
   * 1. Price oracles (Chainlink, Band Protocol, etc.)
   * 2. DEX price feeds
   * 3. Historical price databases
   */
  private async getPriceHistory(protocolId: string, chainId: string): Promise<PricePoint[]> {
    // TODO: Replace with real price data integration
    return [];
  }

  /**
   * Store suspicious activities in database
   */
  public async storeActivities(activities: SuspiciousActivity[]): Promise<string[]> {
    const ids: string[] = [];

    for (const activity of activities) {
      try {
        const result = await query<{ id: string }>(
          `INSERT INTO suspicious_activities (
            activity_type, severity, confidence_score,
            protocol_id, wallet_addresses, token_addresses, chain_id,
            detection_timestamp, detection_method, detector_version,
            evidence_tx_hashes, evidence_description, evidence_metrics,
            estimated_loss_usd, affected_users, affected_protocols,
            status, alert_sent, reported_to_authorities
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING id`,
          [
            activity.activity_type,
            activity.severity,
            activity.confidence_score,
            activity.protocol_id,
            activity.wallet_addresses,
            activity.token_addresses,
            activity.chain_id,
            activity.detection_timestamp,
            activity.detection_method,
            activity.detector_version,
            activity.evidence_tx_hashes,
            activity.evidence_description,
            JSON.stringify(activity.evidence_metrics),
            activity.estimated_loss_usd,
            activity.affected_users,
            activity.affected_protocols,
            activity.status,
            activity.alert_sent,
            activity.reported_to_authorities,
          ]
        );

        ids.push(result.rows[0].id);
      } catch (error) {
        console.error('Error storing suspicious activity:', error);
        throw new Error(`Failed to store suspicious activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return ids;
  }
}
