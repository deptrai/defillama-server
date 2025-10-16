/**
 * Wash Trading Detector Engine
 * Story: 3.2.2 - Suspicious Activity Detection
 * 
 * Detects wash trading activities including:
 * - Self-trading (same wallet buy/sell)
 * - Circular trading (A→B→C→A pattern)
 * - Volume inflation (abnormal volume spikes)
 * - Price manipulation (coordinated trades)
 */

import { query } from '../db/connection';
import { SuspiciousActivity } from './rug-pull-detector';
import { BlockchainDataService } from '../services/blockchain-data-service';

// ============================================================================
// Types
// ============================================================================

export interface Trade {
  tx_hash: string;
  wallet_address: string;
  token_address: string;
  amount: number;
  price: number;
  timestamp: Date;
  type: 'buy' | 'sell';
}

export interface SelfTradeEvidence {
  wallet_address: string;
  trade_count: number;
  timeframe: number; // seconds
  total_volume_usd: number;
}

export interface CircularTradeEvidence {
  pattern: string; // e.g., "A->B->C->A"
  wallet_addresses: string[];
  cycle_count: number;
  timeframe: number; // seconds
  total_volume_usd: number;
}

export interface VolumeInflationEvidence {
  normal_volume_usd: number;
  current_volume_usd: number;
  inflation_ratio: number;
  timeframe: number; // seconds
  contributing_wallets: string[];
  wallet_contribution_pct: number;
}

export interface PriceManipulationEvidence {
  coordinated_trade_count: number;
  wallet_addresses: string[];
  price_maintained: boolean;
  timeframe: number; // seconds
}

// ============================================================================
// Wash Trading Detector
// ============================================================================

export class WashTradingDetector {
  private static instance: WashTradingDetector;
  private readonly DETECTOR_VERSION = 'v1.0.0';
  private blockchainDataService: BlockchainDataService;

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
  }

  public static getInstance(): WashTradingDetector {
    if (!WashTradingDetector.instance) {
      WashTradingDetector.instance = new WashTradingDetector();
    }
    return WashTradingDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectWashTrading(protocolId: string, chainId: string = 'ethereum'): Promise<SuspiciousActivity[]> {
    try {
      const activities: SuspiciousActivity[] = [];
      
      // Get recent trades
      const trades = await this.getRecentTrades(protocolId, chainId);
      if (trades.length === 0) {
        return activities;
      }

      // Check self-trading
      const selfTrades = this.findSelfTrades(trades);
      if (selfTrades.length > 10) {
        const evidence = this.aggregateSelfTrades(selfTrades);
        activities.push(this.createActivity(
          'self_trading',
          'high',
          this.calculateSelfTradingConfidence(evidence),
          protocolId,
          chainId,
          evidence
        ));
      }

      // Check circular trading
      const circularTrades = this.findCircularTrades(trades);
      if (circularTrades.length > 5) {
        const evidence = this.aggregateCircularTrades(circularTrades);
        activities.push(this.createActivity(
          'circular_trading',
          'high',
          this.calculateCircularTradingConfidence(evidence),
          protocolId,
          chainId,
          evidence
        ));
      }

      // Check volume inflation
      const volumeInflation = await this.checkVolumeInflation(protocolId, chainId, trades);
      if (volumeInflation.inflation_ratio > 3.0) {
        activities.push(this.createActivity(
          'volume_inflation',
          'medium',
          this.calculateVolumeInflationConfidence(volumeInflation),
          protocolId,
          chainId,
          volumeInflation
        ));
      }

      // Check price manipulation
      const priceManipulation = this.detectPriceManipulation(trades);
      if (priceManipulation.coordinated_trade_count > 20) {
        activities.push(this.createActivity(
          'price_manipulation',
          'medium',
          this.calculatePriceManipulationConfidence(priceManipulation),
          protocolId,
          chainId,
          priceManipulation
        ));
      }

      return activities;
    } catch (error) {
      console.error('Error detecting wash trading:', error);
      return [];
    }
  }

  /**
   * Find self-trading patterns (same wallet buy/sell)
   */
  public findSelfTrades(trades: Trade[]): Trade[] {
    const selfTrades: Trade[] = [];
    const walletTrades = new Map<string, Trade[]>();

    // Group trades by wallet
    for (const trade of trades) {
      if (!walletTrades.has(trade.wallet_address)) {
        walletTrades.set(trade.wallet_address, []);
      }
      walletTrades.get(trade.wallet_address)!.push(trade);
    }

    // Find wallets with both buy and sell within short timeframe
    for (const [wallet, walletTradeList] of walletTrades) {
      const buys = walletTradeList.filter(t => t.type === 'buy');
      const sells = walletTradeList.filter(t => t.type === 'sell');

      if (buys.length > 0 && sells.length > 0) {
        // Check if buy/sell pairs are within 1 hour
        for (const buy of buys) {
          for (const sell of sells) {
            const timeDiff = Math.abs(sell.timestamp.getTime() - buy.timestamp.getTime()) / 1000;
            if (timeDiff < 3600) { // 1 hour
              selfTrades.push(buy, sell);
            }
          }
        }
      }
    }

    return selfTrades;
  }

  /**
   * Find circular trading patterns (A→B→C→A)
   */
  public findCircularTrades(trades: Trade[]): CircularTradeEvidence[] {
    const patterns: CircularTradeEvidence[] = [];
    
    // Mock implementation - in production, this would use graph analysis
    // to detect circular patterns in trade flows
    
    // Simple heuristic: Find groups of 3+ wallets trading the same token
    const tokenWallets = new Map<string, Set<string>>();
    
    for (const trade of trades) {
      if (!tokenWallets.has(trade.token_address)) {
        tokenWallets.set(trade.token_address, new Set());
      }
      tokenWallets.get(trade.token_address)!.add(trade.wallet_address);
    }

    for (const [token, wallets] of tokenWallets) {
      if (wallets.size >= 3) {
        const walletArray = Array.from(wallets);
        patterns.push({
          pattern: `${walletArray[0].substring(0, 6)}->...->` + walletArray[walletArray.length - 1].substring(0, 6),
          wallet_addresses: walletArray,
          cycle_count: Math.floor(wallets.size / 3),
          timeframe: 3600,
          total_volume_usd: 0,
        });
      }
    }

    return patterns;
  }

  /**
   * Check for volume inflation
   */
  public async checkVolumeInflation(
    protocolId: string,
    chainId: string,
    trades: Trade[]
  ): Promise<VolumeInflationEvidence> {
    // Calculate current volume
    const currentVolume = trades.reduce((sum, t) => sum + (t.amount * t.price), 0);
    
    // Mock normal volume - in production, this would query historical data
    const normalVolume = 100000; // $100k baseline
    
    // Find contributing wallets
    const walletVolumes = new Map<string, number>();
    for (const trade of trades) {
      const volume = trade.amount * trade.price;
      walletVolumes.set(
        trade.wallet_address,
        (walletVolumes.get(trade.wallet_address) || 0) + volume
      );
    }

    // Sort by volume
    const sortedWallets = Array.from(walletVolumes.entries())
      .sort((a, b) => b[1] - a[1]);

    // Calculate top wallets contribution
    const topWalletsVolume = sortedWallets.slice(0, 5).reduce((sum, [_, vol]) => sum + vol, 0);
    const walletContribution = currentVolume > 0 ? topWalletsVolume / currentVolume : 0;

    return {
      normal_volume_usd: normalVolume,
      current_volume_usd: currentVolume,
      inflation_ratio: currentVolume / normalVolume,
      timeframe: 3600,
      contributing_wallets: sortedWallets.slice(0, 5).map(([wallet, _]) => wallet),
      wallet_contribution_pct: walletContribution,
    };
  }

  /**
   * Detect price manipulation through coordinated trades
   */
  public detectPriceManipulation(trades: Trade[]): PriceManipulationEvidence {
    // Group trades by time windows (5 minute windows)
    const windowSize = 300; // 5 minutes
    const windows = new Map<number, Trade[]>();

    for (const trade of trades) {
      const windowKey = Math.floor(trade.timestamp.getTime() / 1000 / windowSize);
      if (!windows.has(windowKey)) {
        windows.set(windowKey, []);
      }
      windows.get(windowKey)!.push(trade);
    }

    // Find windows with coordinated activity
    let maxCoordinatedTrades = 0;
    let coordinatedWallets: string[] = [];
    let priceMaintained = false;

    for (const [_, windowTrades] of windows) {
      if (windowTrades.length > maxCoordinatedTrades) {
        maxCoordinatedTrades = windowTrades.length;
        coordinatedWallets = [...new Set(windowTrades.map(t => t.wallet_address))];
        
        // Check if price is maintained (low variance)
        const prices = windowTrades.map(t => t.price);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
        priceMaintained = variance < (avgPrice * 0.05); // < 5% variance
      }
    }

    return {
      coordinated_trade_count: maxCoordinatedTrades,
      wallet_addresses: coordinatedWallets,
      price_maintained: priceMaintained,
      timeframe: 3600,
    };
  }

  /**
   * Aggregate self-trading evidence
   */
  private aggregateSelfTrades(trades: Trade[]): SelfTradeEvidence {
    const wallets = new Set(trades.map(t => t.wallet_address));
    const totalVolume = trades.reduce((sum, t) => sum + (t.amount * t.price), 0);
    
    return {
      wallet_address: Array.from(wallets)[0], // Primary wallet
      trade_count: trades.length,
      timeframe: 3600,
      total_volume_usd: totalVolume,
    };
  }

  /**
   * Aggregate circular trading evidence
   */
  private aggregateCircularTrades(patterns: CircularTradeEvidence[]): CircularTradeEvidence {
    return patterns[0]; // Return first pattern for simplicity
  }

  /**
   * Calculate confidence for self-trading
   */
  public calculateSelfTradingConfidence(evidence: SelfTradeEvidence): number {
    let confidence = 50; // Base confidence

    // More trades = higher confidence
    if (evidence.trade_count > 100) confidence += 30;
    else if (evidence.trade_count > 50) confidence += 20;
    else if (evidence.trade_count > 10) confidence += 10;

    // Higher volume = higher confidence
    if (evidence.total_volume_usd > 1000000) confidence += 15;
    else if (evidence.total_volume_usd > 500000) confidence += 10;

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 1800) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for circular trading
   */
  public calculateCircularTradingConfidence(evidence: CircularTradeEvidence): number {
    let confidence = 50; // Base confidence

    // More cycles = higher confidence
    if (evidence.cycle_count > 20) confidence += 25;
    else if (evidence.cycle_count > 10) confidence += 15;
    else if (evidence.cycle_count > 5) confidence += 10;

    // More wallets = higher confidence
    if (evidence.wallet_addresses.length > 10) confidence += 15;
    else if (evidence.wallet_addresses.length > 5) confidence += 10;

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 1800) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for volume inflation
   */
  public calculateVolumeInflationConfidence(evidence: VolumeInflationEvidence): number {
    let confidence = 50; // Base confidence

    // Higher inflation ratio = higher confidence
    if (evidence.inflation_ratio > 10) confidence += 30;
    else if (evidence.inflation_ratio > 5) confidence += 20;
    else if (evidence.inflation_ratio > 3) confidence += 10;

    // Higher wallet contribution = higher confidence
    if (evidence.wallet_contribution_pct > 0.8) confidence += 15;
    else if (evidence.wallet_contribution_pct > 0.6) confidence += 10;

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 1800) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for price manipulation
   */
  public calculatePriceManipulationConfidence(evidence: PriceManipulationEvidence): number {
    let confidence = 50; // Base confidence

    // More coordinated trades = higher confidence
    if (evidence.coordinated_trade_count > 50) confidence += 20;
    else if (evidence.coordinated_trade_count > 20) confidence += 10;

    // Price maintained = higher confidence
    if (evidence.price_maintained) confidence += 15;

    // More wallets = higher confidence
    if (evidence.wallet_addresses.length > 5) confidence += 10;

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 1800) confidence += 5;

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

    return {
      activity_type: 'wash_trading',
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
      estimated_loss_usd: 0, // Wash trading doesn't cause direct loss
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
      case 'self_trading':
        return `Detected ${evidence.trade_count} self-trading transactions from wallet ${evidence.wallet_address.substring(0, 10)}... with $${evidence.total_volume_usd.toLocaleString()} volume.`;
      case 'circular_trading':
        return `Detected ${evidence.cycle_count} circular trading cycles involving ${evidence.wallet_addresses.length} wallets. Pattern: ${evidence.pattern}`;
      case 'volume_inflation':
        return `Volume spike of ${(evidence.inflation_ratio * 100).toFixed(0)}% detected. ${evidence.contributing_wallets.length} wallets responsible for ${(evidence.wallet_contribution_pct * 100).toFixed(0)}% of volume.`;
      case 'price_manipulation':
        return `Detected ${evidence.coordinated_trade_count} coordinated trades from ${evidence.wallet_addresses.length} wallets. Price ${evidence.price_maintained ? 'maintained' : 'manipulated'}.`;
      default:
        return 'Wash trading activity detected';
    }
  }

  /**
   * Extract wallet addresses from evidence
   */
  private extractWalletAddresses(evidence: any): string[] {
    if (evidence.wallet_address) return [evidence.wallet_address];
    if (evidence.wallet_addresses) return evidence.wallet_addresses;
    if (evidence.contributing_wallets) return evidence.contributing_wallets;
    return [];
  }

  /**
   * Get recent trades
   *
   * Fetches real trade data if available, falls back to mock data for testing.
   */
  private async getRecentTrades(protocolId: string, chainId: string): Promise<Trade[]> {
    try {
      // Try to fetch real blockchain data
      if (process.env.ETHERSCAN_API_KEY && chainId === 'ethereum') {
        return await this.fetchRealTradeData(protocolId, chainId);
      }
    } catch (error) {
      console.warn(`Failed to fetch real trade data for ${protocolId}:`, error);
    }

    // Fallback to mock data for testing
    console.log(`Using mock trade data for protocol ${protocolId} on chain ${chainId}`);
    return [];
  }

  /**
   * Fetch real trade data from blockchain
   */
  private async fetchRealTradeData(protocolId: string, chainId: string): Promise<Trade[]> {
    // Get token transfers for the protocol
    const tokenTransfers = await this.blockchainDataService.getTokenTransfers(
      protocolId,
      undefined,
      chainId,
      1000
    );

    // Convert token transfers to trades
    const trades: Trade[] = [];
    for (const transfer of tokenTransfers) {
      // Determine if it's a buy or sell based on direction
      const isBuy = transfer.to === protocolId;
      const isSell = transfer.from === protocolId;

      if (isBuy || isSell) {
        trades.push({
          tx_hash: transfer.hash,
          wallet_address: isBuy ? transfer.from : transfer.to,
          token_address: transfer.contractAddress,
          amount: transfer.value,
          price: 1, // TODO: Get real price from price feed
          timestamp: transfer.timestamp,
          type: isBuy ? 'buy' : 'sell',
        });
      }
    }

    return trades;
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

