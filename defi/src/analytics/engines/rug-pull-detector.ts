/**
 * Rug Pull Detector Engine
 * Story: 3.2.2 - Suspicious Activity Detection
 * 
 * Detects rug pull activities including:
 * - Liquidity removal (>50% in <1 hour)
 * - Token dumps (>30% supply sold in <1 hour)
 * - Contract manipulation (ownership transfer, pause, upgrade)
 */

import { query } from '../db/connection';
import { BlockchainDataService } from '../services/blockchain-data-service';

// ============================================================================
// Types
// ============================================================================

export interface SuspiciousActivity {
  id?: string;
  activity_type: 'rug_pull' | 'wash_trading' | 'pump_dump' | 'sybil_attack';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence_score: number;
  protocol_id?: string;
  wallet_addresses?: string[];
  token_addresses?: string[];
  chain_id: string;
  detection_timestamp: Date;
  detection_method: 'ml_model' | 'rule_based' | 'manual_report' | 'hybrid';
  detector_version: string;
  evidence_tx_hashes?: string[];
  evidence_description: string;
  evidence_metrics: Record<string, any>;
  estimated_loss_usd?: number;
  affected_users?: number;
  affected_protocols?: string[];
  status: 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  alert_sent: boolean;
  reported_to_authorities: boolean;
}

export interface LiquidityRemovalEvidence {
  percentage: number;
  timeframe: number; // seconds
  removed_amount_usd: number;
  remaining_amount_usd: number;
  wallet_address: string;
}

export interface TokenDumpEvidence {
  percentage: number;
  timeframe: number; // seconds
  sold_amount: number;
  total_supply: number;
  price_impact: number;
  wallet_address: string;
}

export interface ContractManipulationEvidence {
  detected: boolean;
  action: 'ownership_transfer' | 'emergency_pause' | 'contract_upgrade' | 'mint_function_call';
  from_address?: string;
  to_address?: string;
  timelock_delay?: number;
}

// ============================================================================
// Rug Pull Detector
// ============================================================================

export class RugPullDetector {
  private static instance: RugPullDetector;
  private readonly DETECTOR_VERSION = 'v1.0.0';
  private blockchainDataService: BlockchainDataService;

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
  }

  public static getInstance(): RugPullDetector {
    if (!RugPullDetector.instance) {
      RugPullDetector.instance = new RugPullDetector();
    }
    return RugPullDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectRugPull(protocolId: string, chainId: string = 'ethereum'): Promise<SuspiciousActivity | null> {
    try {
      // Get protocol data
      const protocol = await this.getProtocolData(protocolId, chainId);
      if (!protocol) {
        return null;
      }

      // Check liquidity removal
      const liquidityRemoval = await this.checkLiquidityRemoval(protocol);
      if (liquidityRemoval.percentage > 0.5 && liquidityRemoval.timeframe < 3600) {
        return this.createActivity(
          'liquidity_removal',
          'critical',
          this.calculateLiquidityRemovalConfidence(liquidityRemoval),
          protocol,
          liquidityRemoval
        );
      }

      // Check token dump
      const tokenDump = await this.checkTokenDump(protocol);
      if (tokenDump.percentage > 0.3 && tokenDump.timeframe < 3600) {
        return this.createActivity(
          'token_dump',
          'critical',
          this.calculateTokenDumpConfidence(tokenDump),
          protocol,
          tokenDump
        );
      }

      // Check contract manipulation
      const contractManipulation = await this.checkContractManipulation(protocol);
      if (contractManipulation.detected) {
        return this.createActivity(
          'contract_manipulation',
          this.getManipulationSeverity(contractManipulation),
          this.calculateManipulationConfidence(contractManipulation),
          protocol,
          contractManipulation
        );
      }

      return null;
    } catch (error) {
      console.error('Error detecting rug pull:', error);
      return null;
    }
  }

  /**
   * Check for liquidity removal
   */
  public async checkLiquidityRemoval(protocol: any): Promise<LiquidityRemovalEvidence> {
    // Mock implementation - in production, this would query blockchain data
    const currentLiquidity = protocol.current_liquidity_usd || 1000000;
    const previousLiquidity = protocol.previous_liquidity_usd || 1000000;
    const timeframe = protocol.liquidity_change_timeframe || 3600;
    
    const removed = previousLiquidity - currentLiquidity;
    const percentage = removed / previousLiquidity;

    return {
      percentage: Math.max(0, percentage),
      timeframe,
      removed_amount_usd: Math.max(0, removed),
      remaining_amount_usd: currentLiquidity,
      wallet_address: protocol.owner_address || '0x0000...0000',
    };
  }

  /**
   * Check for token dump
   */
  public async checkTokenDump(protocol: any): Promise<TokenDumpEvidence> {
    // Mock implementation - in production, this would query blockchain data
    const totalSupply = protocol.total_supply || 1000000000;
    const soldAmount = protocol.recent_sold_amount || 0;
    const timeframe = protocol.dump_timeframe || 3600;
    const priceImpact = protocol.price_impact || 0;

    const percentage = soldAmount / totalSupply;

    return {
      percentage,
      timeframe,
      sold_amount: soldAmount,
      total_supply: totalSupply,
      price_impact: priceImpact,
      wallet_address: protocol.seller_address || '0x0000...0000',
    };
  }

  /**
   * Check for contract manipulation
   */
  public async checkContractManipulation(protocol: any): Promise<ContractManipulationEvidence> {
    // Mock implementation - in production, this would query blockchain events
    const hasOwnershipTransfer = protocol.ownership_transferred || false;
    const hasEmergencyPause = protocol.emergency_paused || false;
    const hasContractUpgrade = protocol.contract_upgraded || false;
    const hasMintCall = protocol.mint_function_called || false;

    if (hasOwnershipTransfer) {
      return {
        detected: true,
        action: 'ownership_transfer',
        from_address: protocol.old_owner || '0x0000...0000',
        to_address: protocol.new_owner || '0x0000...0000',
      };
    }

    if (hasEmergencyPause) {
      return {
        detected: true,
        action: 'emergency_pause',
        from_address: protocol.pauser_address || '0x0000...0000',
      };
    }

    if (hasContractUpgrade) {
      return {
        detected: true,
        action: 'contract_upgrade',
        from_address: protocol.upgrader_address || '0x0000...0000',
        timelock_delay: protocol.timelock_delay || 0,
      };
    }

    if (hasMintCall) {
      return {
        detected: true,
        action: 'mint_function_call',
        from_address: protocol.minter_address || '0x0000...0000',
      };
    }

    return {
      detected: false,
      action: 'ownership_transfer',
    };
  }

  /**
   * Calculate confidence score for liquidity removal
   */
  public calculateLiquidityRemovalConfidence(evidence: LiquidityRemovalEvidence): number {
    let confidence = 50; // Base confidence

    // Higher percentage = higher confidence
    if (evidence.percentage > 0.9) confidence += 40;
    else if (evidence.percentage > 0.7) confidence += 30;
    else if (evidence.percentage > 0.5) confidence += 20;

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 900) confidence += 10; // < 15 minutes
    else if (evidence.timeframe < 1800) confidence += 5; // < 30 minutes

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence score for token dump
   */
  public calculateTokenDumpConfidence(evidence: TokenDumpEvidence): number {
    let confidence = 50; // Base confidence

    // Higher percentage = higher confidence
    if (evidence.percentage > 0.5) confidence += 30;
    else if (evidence.percentage > 0.3) confidence += 20;

    // Higher price impact = higher confidence
    if (evidence.price_impact > 0.7) confidence += 15;
    else if (evidence.price_impact > 0.5) confidence += 10;

    // Shorter timeframe = higher confidence
    if (evidence.timeframe < 900) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence score for contract manipulation
   */
  public calculateManipulationConfidence(evidence: ContractManipulationEvidence): number {
    if (!evidence.detected) return 0;

    let confidence = 70; // Base confidence for detected manipulation

    switch (evidence.action) {
      case 'ownership_transfer':
        confidence += 25; // Very suspicious
        break;
      case 'emergency_pause':
        confidence += 20;
        break;
      case 'contract_upgrade':
        // Lower confidence if there's a timelock
        if (evidence.timelock_delay && evidence.timelock_delay > 0) {
          confidence += 5;
        } else {
          confidence += 20;
        }
        break;
      case 'mint_function_call':
        confidence += 15;
        break;
    }

    return Math.min(100, confidence);
  }

  /**
   * Get severity for contract manipulation
   */
  private getManipulationSeverity(evidence: ContractManipulationEvidence): 'critical' | 'high' | 'medium' | 'low' {
    if (!evidence.detected) return 'low';

    switch (evidence.action) {
      case 'ownership_transfer':
        return 'critical';
      case 'emergency_pause':
        return 'high';
      case 'contract_upgrade':
        return evidence.timelock_delay && evidence.timelock_delay > 0 ? 'medium' : 'high';
      case 'mint_function_call':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Create suspicious activity record
   */
  private createActivity(
    type: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    confidence: number,
    protocol: any,
    evidence: any
  ): SuspiciousActivity {
    const description = this.generateDescription(type, evidence);
    const estimatedLoss = this.estimateLoss(type, evidence);

    return {
      activity_type: 'rug_pull',
      severity,
      confidence_score: confidence,
      protocol_id: protocol.id,
      wallet_addresses: this.extractWalletAddresses(evidence),
      token_addresses: protocol.token_addresses || [],
      chain_id: protocol.chain_id || 'ethereum',
      detection_timestamp: new Date(),
      detection_method: 'rule_based',
      detector_version: this.DETECTOR_VERSION,
      evidence_tx_hashes: protocol.tx_hashes || [],
      evidence_description: description,
      evidence_metrics: evidence,
      estimated_loss_usd: estimatedLoss,
      affected_users: protocol.affected_users || 0,
      affected_protocols: [protocol.id],
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
      case 'liquidity_removal':
        return `Detected ${(evidence.percentage * 100).toFixed(1)}% liquidity removal ($${evidence.removed_amount_usd.toLocaleString()}) in ${Math.floor(evidence.timeframe / 60)} minutes.`;
      case 'token_dump':
        return `Detected ${(evidence.percentage * 100).toFixed(1)}% of total supply sold in ${Math.floor(evidence.timeframe / 60)} minutes, causing ${(evidence.price_impact * 100).toFixed(1)}% price drop.`;
      case 'contract_manipulation':
        return `Detected ${evidence.action.replace('_', ' ')}: ${evidence.from_address} → ${evidence.to_address || 'N/A'}`;
      default:
        return 'Suspicious activity detected';
    }
  }

  /**
   * Estimate financial loss
   */
  private estimateLoss(type: string, evidence: any): number {
    switch (type) {
      case 'liquidity_removal':
        return evidence.removed_amount_usd || 0;
      case 'token_dump':
        return (evidence.sold_amount * evidence.price_impact) || 0;
      case 'contract_manipulation':
        return 0; // Cannot estimate without more data
      default:
        return 0;
    }
  }

  /**
   * Extract wallet addresses from evidence
   */
  private extractWalletAddresses(evidence: any): string[] {
    const addresses: string[] = [];
    
    if (evidence.wallet_address) addresses.push(evidence.wallet_address);
    if (evidence.from_address) addresses.push(evidence.from_address);
    if (evidence.to_address) addresses.push(evidence.to_address);

    return addresses.filter(addr => addr && addr !== '0x0000...0000');
  }

  /**
   * Get protocol data
   *
   * Fetches real blockchain data if available, falls back to mock data for testing.
   *
   * @param protocolId - Protocol identifier (contract address)
   * @param chainId - Blockchain identifier
   * @returns Protocol data with liquidity, supply, and contract info
   */
  private async getProtocolData(protocolId: string, chainId: string): Promise<any> {
    try {
      // Try to fetch real blockchain data
      if (process.env.ETHERSCAN_API_KEY && chainId === 'ethereum') {
        return await this.fetchRealProtocolData(protocolId, chainId);
      }
    } catch (error) {
      console.warn(`Failed to fetch real protocol data for ${protocolId}:`, error);
    }

    // Fallback to mock data for testing
    console.log(`Using mock data for protocol ${protocolId} on chain ${chainId}`);
    return {
      id: protocolId,
      chain_id: chainId,
      current_liquidity_usd: 1000000,
      previous_liquidity_usd: 1000000,
      liquidity_change_timeframe: 3600,
      total_supply: 1000000000,
      recent_sold_amount: 0,
      dump_timeframe: 3600,
      price_impact: 0,
      ownership_transferred: false,
      emergency_paused: false,
      contract_upgraded: false,
      mint_function_called: false,
      token_addresses: [],
      tx_hashes: [],
      affected_users: 0,
    };
  }

  /**
   * Fetch real protocol data from blockchain
   */
  private async fetchRealProtocolData(protocolId: string, chainId: string): Promise<any> {
    // Get liquidity pool data
    const liquidityData = await this.blockchainDataService.getLiquidityPoolData(protocolId, chainId);

    // Get recent token transfers to detect dumps
    const tokenTransfers = await this.blockchainDataService.getTokenTransfers(
      protocolId,
      undefined,
      chainId,
      1000
    );

    // Calculate recent sold amount (last hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentSells = tokenTransfers.filter(
      transfer => transfer.timestamp.getTime() > oneHourAgo && transfer.from === protocolId
    );
    const recentSoldAmount = recentSells.reduce((sum, transfer) => sum + transfer.value, 0);

    // Get contract events to detect manipulation
    const currentBlock = await this.getCurrentBlock(chainId);
    const oneHourAgoBlock = currentBlock - 300; // ~300 blocks in 1 hour
    const contractEvents = await this.blockchainDataService.getContractEvents(
      protocolId,
      oneHourAgoBlock,
      currentBlock,
      chainId
    );

    // Detect ownership transfer events
    const ownershipTransferTopic = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0';
    const ownershipTransfers = contractEvents.filter(event => event.topics[0] === ownershipTransferTopic);

    // Detect pause events
    const pauseTopic = '0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258';
    const pauseEvents = contractEvents.filter(event => event.topics[0] === pauseTopic);

    return {
      id: protocolId,
      chain_id: chainId,
      current_liquidity_usd: liquidityData.reserve0 + liquidityData.reserve1,
      previous_liquidity_usd: liquidityData.reserve0 + liquidityData.reserve1, // TODO: Track historical data
      liquidity_change_timeframe: 3600,
      total_supply: liquidityData.totalSupply,
      recent_sold_amount: recentSoldAmount,
      dump_timeframe: 3600,
      price_impact: 0, // TODO: Calculate from price data
      ownership_transferred: ownershipTransfers.length > 0,
      emergency_paused: pauseEvents.length > 0,
      contract_upgraded: false, // TODO: Detect upgrade events
      mint_function_called: false, // TODO: Detect mint events
      token_addresses: [liquidityData.token0, liquidityData.token1],
      tx_hashes: recentSells.map(transfer => transfer.hash),
      affected_users: new Set(recentSells.map(transfer => transfer.to)).size,
    };
  }

  /**
   * Get current block number
   */
  private async getCurrentBlock(chainId: string): Promise<number> {
    // TODO: Implement real block number fetching
    return 18000000; // Placeholder
  }

  /**
   * Store suspicious activity in database
   *
   * @param activity - Suspicious activity to store
   * @returns Activity ID
   * @throws Error if database operation fails
   */
  public async storeActivity(activity: SuspiciousActivity): Promise<string> {
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

      return result.rows[0].id;
    } catch (error) {
      console.error('Error storing suspicious activity:', error);
      throw new Error(`Failed to store suspicious activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

