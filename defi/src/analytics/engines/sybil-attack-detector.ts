/**
 * Sybil Attack Detector Engine
 * Story: 3.2.2 - Suspicious Activity Detection
 *
 * Detects sybil attack activities including:
 * - Wallet clustering (groups of wallets with similar behavior)
 * - Behavior similarity (coordinated actions)
 * - Airdrop farming (multiple wallets claiming airdrops)
 * - Coordinated voting (governance manipulation)
 */

import { query } from '../db/connection';
import { SuspiciousActivity } from './rug-pull-detector';
import { BlockchainDataService } from '../services/blockchain-data-service';

// ============================================================================
// Types
// ============================================================================

export interface WalletInfo {
  address: string;
  creation_time: Date;
  balance: number;
  transaction_count: number;
  last_activity: Date;
}

export interface Transaction {
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: number;
  gas_price: number;
  timestamp: Date;
  nonce: number;
}

export interface WalletClusterEvidence {
  wallet_addresses: string[];
  cluster_size: number;
  average_similarity_score: number;
  pattern_type: string; // 'transaction_timing', 'amount_similarity', 'address_similarity'
}

export interface BehaviorSimilarityEvidence {
  wallet_addresses: string[];
  similarity_score: number;
  matching_patterns: string[]; // ['same_gas_price', 'same_nonce_pattern', 'same_contracts']
  timeframe: number; // seconds
}

export interface AirdropFarmingEvidence {
  wallet_addresses: string[];
  airdrop_contract: string;
  claim_count: number;
  claim_timing_similarity: number; // 0-1
  claim_amount_similarity: number; // 0-1
}

export interface CoordinatedVotingEvidence {
  wallet_addresses: string[];
  proposal_id: string;
  vote_direction: string; // 'for', 'against', 'abstain'
  vote_count: number;
  voting_timing_similarity: number; // 0-1
  total_voting_power: number;
}

// ============================================================================
// Sybil Attack Detector
// ============================================================================

export class SybilAttackDetector {
  private static instance: SybilAttackDetector;
  private readonly DETECTOR_VERSION = 'v1.0.0';
  private blockchainDataService: BlockchainDataService;

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
  }

  public static getInstance(): SybilAttackDetector {
    if (!SybilAttackDetector.instance) {
      SybilAttackDetector.instance = new SybilAttackDetector();
    }
    return SybilAttackDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectSybilAttack(protocolId: string, chainId: string = 'ethereum'): Promise<SuspiciousActivity[]> {
    try {
      const activities: SuspiciousActivity[] = [];

      // Get wallet data
      const wallets = await this.getWalletData(protocolId, chainId);
      if (wallets.length === 0) {
        return activities;
      }

      // Check wallet clustering
      const walletClustering = this.detectWalletClustering(wallets);
      if (walletClustering && walletClustering.cluster_size > 10) {
        activities.push(this.createActivity(
          'wallet_clustering',
          'high',
          this.calculateWalletClusteringConfidence(walletClustering),
          protocolId,
          chainId,
          walletClustering
        ));
      }

      // Check behavior similarity
      const behaviorSimilarity = await this.analyzeBehaviorSimilarity(wallets);
      if (behaviorSimilarity && behaviorSimilarity.similarity_score > 0.8) {
        activities.push(this.createActivity(
          'behavior_similarity',
          'high',
          this.calculateBehaviorSimilarityConfidence(behaviorSimilarity),
          protocolId,
          chainId,
          behaviorSimilarity
        ));
      }

      // Check airdrop farming
      const airdropFarming = await this.detectAirdropFarming(protocolId, chainId);
      if (airdropFarming && airdropFarming.claim_count > 10) {
        activities.push(this.createActivity(
          'airdrop_farming',
          'medium',
          this.calculateAirdropFarmingConfidence(airdropFarming),
          protocolId,
          chainId,
          airdropFarming
        ));
      }

      // Check coordinated voting
      const coordinatedVoting = await this.detectCoordinatedVoting(protocolId, chainId);
      if (coordinatedVoting && coordinatedVoting.vote_count > 10) {
        activities.push(this.createActivity(
          'coordinated_voting',
          'high',
          this.calculateCoordinatedVotingConfidence(coordinatedVoting),
          protocolId,
          chainId,
          coordinatedVoting
        ));
      }

      return activities;
    } catch (error) {
      console.error('Error detecting sybil attack:', error);
      return [];
    }
  }

  /**
   * Detect wallet clustering (groups of wallets with similar behavior)
   */
  public detectWalletClustering(wallets: WalletInfo[]): WalletClusterEvidence | null {
    if (wallets.length < 10) return null;

    // Calculate similarity scores between wallets
    const clusters: Map<string, WalletInfo[]> = new Map();

    for (let i = 0; i < wallets.length; i++) {
      for (let j = i + 1; j < wallets.length; j++) {
        const similarity = this.calculateWalletSimilarity(wallets[i], wallets[j]);

        if (similarity > 0.8) {
          const key = `cluster_${i}`;
          if (!clusters.has(key)) {
            clusters.set(key, [wallets[i]]);
          }
          clusters.get(key)!.push(wallets[j]);
        }
      }
    }

    // Find largest cluster
    let largestCluster: WalletInfo[] = [];
    for (const cluster of clusters.values()) {
      if (cluster.length > largestCluster.length) {
        largestCluster = cluster;
      }
    }

    if (largestCluster.length < 10) return null;

    // Calculate average similarity
    let totalSimilarity = 0;
    let pairCount = 0;
    for (let i = 0; i < largestCluster.length; i++) {
      for (let j = i + 1; j < largestCluster.length; j++) {
        totalSimilarity += this.calculateWalletSimilarity(largestCluster[i], largestCluster[j]);
        pairCount++;
      }
    }
    const avgSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;

    return {
      wallet_addresses: largestCluster.map(w => w.address),
      cluster_size: largestCluster.length,
      average_similarity_score: avgSimilarity,
      pattern_type: 'address_similarity',
    };
  }

  /**
   * Calculate similarity score between two wallets
   */
  private calculateWalletSimilarity(wallet1: WalletInfo, wallet2: WalletInfo): number {
    let similarity = 0;

    // Creation time similarity (within 1 hour)
    const timeDiff = Math.abs(wallet1.creation_time.getTime() - wallet2.creation_time.getTime()) / 1000;
    if (timeDiff < 3600) similarity += 0.3;

    // Balance similarity (within 10%)
    const balanceDiff = Math.abs(wallet1.balance - wallet2.balance) / Math.max(wallet1.balance, wallet2.balance);
    if (balanceDiff < 0.1) similarity += 0.3;

    // Transaction count similarity (within 10%)
    const txDiff = Math.abs(wallet1.transaction_count - wallet2.transaction_count) / Math.max(wallet1.transaction_count, wallet2.transaction_count);
    if (txDiff < 0.1) similarity += 0.2;

    // Last activity similarity (within 1 hour)
    const activityDiff = Math.abs(wallet1.last_activity.getTime() - wallet2.last_activity.getTime()) / 1000;
    if (activityDiff < 3600) similarity += 0.2;

    return similarity;
  }

  /**
   * Analyze behavior similarity between wallets
   */
  public async analyzeBehaviorSimilarity(wallets: WalletInfo[]): Promise<BehaviorSimilarityEvidence | null> {
    if (wallets.length < 2) return null;

    // Get transaction histories
    const histories = await Promise.all(
      wallets.map(w => this.getTransactionHistory(w.address))
    );

    // Find matching patterns
    const matchingPatterns: string[] = [];
    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < histories.length; i++) {
      for (let j = i + 1; j < histories.length; j++) {
        const similarity = this.calculateTransactionSimilarity(histories[i], histories[j]);
        totalSimilarity += similarity;
        pairCount++;

        if (similarity > 0.8) {
          // Check for specific patterns
          if (this.hasSameGasPrice(histories[i], histories[j])) {
            matchingPatterns.push('same_gas_price');
          }
          if (this.hasSameNoncePattern(histories[i], histories[j])) {
            matchingPatterns.push('same_nonce_pattern');
          }
        }
      }
    }

    const avgSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;
    if (avgSimilarity < 0.8) return null;

    return {
      wallet_addresses: wallets.map(w => w.address),
      similarity_score: avgSimilarity,
      matching_patterns: [...new Set(matchingPatterns)],
      timeframe: 3600,
    };
  }

  /**
   * Calculate similarity between transaction histories
   */
  private calculateTransactionSimilarity(txs1: Transaction[], txs2: Transaction[]): number {
    if (txs1.length === 0 || txs2.length === 0) return 0;

    let similarity = 0;

    // Check gas price similarity
    const avgGas1 = txs1.reduce((sum, tx) => sum + tx.gas_price, 0) / txs1.length;
    const avgGas2 = txs2.reduce((sum, tx) => sum + tx.gas_price, 0) / txs2.length;
    const gasDiff = Math.abs(avgGas1 - avgGas2) / Math.max(avgGas1, avgGas2);
    if (gasDiff < 0.1) similarity += 0.5;

    // Check amount similarity
    const avgAmount1 = txs1.reduce((sum, tx) => sum + tx.amount, 0) / txs1.length;
    const avgAmount2 = txs2.reduce((sum, tx) => sum + tx.amount, 0) / txs2.length;
    const amountDiff = Math.abs(avgAmount1 - avgAmount2) / Math.max(avgAmount1, avgAmount2);
    if (amountDiff < 0.1) similarity += 0.5;

    return similarity;
  }


  /**
   * Detect airdrop farming (multiple wallets claiming airdrops)
   */
  public async detectAirdropFarming(protocolId: string, chainId: string): Promise<AirdropFarmingEvidence | null> {
    // Mock implementation - in production, this would query airdrop claim transactions
    // For now, return null to indicate no airdrop farming detected
    return null;
  }

  /**
   * Detect coordinated voting (governance manipulation)
   */
  public async detectCoordinatedVoting(protocolId: string, chainId: string): Promise<CoordinatedVotingEvidence | null> {
    // Mock implementation - in production, this would query governance voting transactions
    // For now, return null to indicate no coordinated voting detected
    return null;
  }

  /**
   * Calculate confidence for wallet clustering
   */
  public calculateWalletClusteringConfidence(evidence: WalletClusterEvidence): number {
    let confidence = 50; // Base confidence

    // Larger cluster = higher confidence
    if (evidence.cluster_size > 50) confidence += 25;
    else if (evidence.cluster_size > 30) confidence += 15;
    else if (evidence.cluster_size > 10) confidence += 10;

    // Higher similarity = higher confidence
    if (evidence.average_similarity_score > 0.95) confidence += 20;
    else if (evidence.average_similarity_score > 0.9) confidence += 15;
    else if (evidence.average_similarity_score > 0.8) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for behavior similarity
   */
  public calculateBehaviorSimilarityConfidence(evidence: BehaviorSimilarityEvidence): number {
    let confidence = 50; // Base confidence

    // Higher similarity = higher confidence
    if (evidence.similarity_score > 0.95) confidence += 25;
    else if (evidence.similarity_score > 0.9) confidence += 15;
    else if (evidence.similarity_score > 0.8) confidence += 10;

    // More matching patterns = higher confidence
    if (evidence.matching_patterns.length > 3) confidence += 15;
    else if (evidence.matching_patterns.length > 1) confidence += 10;

    // More wallets = higher confidence
    if (evidence.wallet_addresses.length > 20) confidence += 10;
    else if (evidence.wallet_addresses.length > 10) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for airdrop farming
   */
  public calculateAirdropFarmingConfidence(evidence: AirdropFarmingEvidence): number {
    let confidence = 50; // Base confidence

    // More claims = higher confidence
    if (evidence.claim_count > 50) confidence += 20;
    else if (evidence.claim_count > 30) confidence += 15;
    else if (evidence.claim_count > 10) confidence += 10;

    // Higher timing similarity = higher confidence
    if (evidence.claim_timing_similarity > 0.9) confidence += 15;
    else if (evidence.claim_timing_similarity > 0.8) confidence += 10;

    // Higher amount similarity = higher confidence
    if (evidence.claim_amount_similarity > 0.9) confidence += 15;
    else if (evidence.claim_amount_similarity > 0.8) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Calculate confidence for coordinated voting
   */
  public calculateCoordinatedVotingConfidence(evidence: CoordinatedVotingEvidence): number {
    let confidence = 50; // Base confidence

    // More votes = higher confidence
    if (evidence.vote_count > 50) confidence += 20;
    else if (evidence.vote_count > 30) confidence += 15;
    else if (evidence.vote_count > 10) confidence += 10;

    // Higher timing similarity = higher confidence
    if (evidence.voting_timing_similarity > 0.9) confidence += 15;
    else if (evidence.voting_timing_similarity > 0.8) confidence += 10;

    // Higher voting power = higher confidence
    if (evidence.total_voting_power > 1000000) confidence += 15;
    else if (evidence.total_voting_power > 500000) confidence += 10;

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
      activity_type: 'sybil_attack',
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
      estimated_loss_usd: 0,
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
      case 'wallet_clustering':
        return `Detected cluster of ${evidence.cluster_size} wallets with ${(evidence.average_similarity_score * 100).toFixed(1)}% similarity. Pattern: ${evidence.pattern_type}`;
      case 'behavior_similarity':
        return `Detected ${evidence.wallet_addresses.length} wallets with ${(evidence.similarity_score * 100).toFixed(1)}% behavioral similarity. Matching patterns: ${evidence.matching_patterns.join(', ')}`;
      case 'airdrop_farming':
        return `Detected ${evidence.claim_count} airdrop claims from ${evidence.wallet_addresses.length} wallets with ${(evidence.claim_timing_similarity * 100).toFixed(1)}% timing similarity`;
      case 'coordinated_voting':
        return `Detected ${evidence.vote_count} coordinated votes (${evidence.vote_direction}) from ${evidence.wallet_addresses.length} wallets with ${(evidence.voting_timing_similarity * 100).toFixed(1)}% timing similarity. Total voting power: ${evidence.total_voting_power.toLocaleString()}`;
      default:
        return 'Sybil attack activity detected';
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
   * Check if transactions have same gas price
   */
  private hasSameGasPrice(txs1: Transaction[], txs2: Transaction[]): boolean {
    if (txs1.length === 0 || txs2.length === 0) return false;
    const gas1 = txs1[0].gas_price;
    const gas2 = txs2[0].gas_price;
    return Math.abs(gas1 - gas2) / Math.max(gas1, gas2) < 0.01;
  }

  /**
   * Check if transactions have same nonce pattern
   */
  private hasSameNoncePattern(txs1: Transaction[], txs2: Transaction[]): boolean {
    if (txs1.length < 2 || txs2.length < 2) return false;
    const pattern1 = txs1[1].nonce - txs1[0].nonce;
    const pattern2 = txs2[1].nonce - txs2[0].nonce;
    return pattern1 === pattern2;
  }

  /**
   * Get wallet data
   *
   * Fetches real wallet data if available, falls back to mock data for testing.
   */
  private async getWalletData(protocolId: string, chainId: string): Promise<WalletInfo[]> {
    try {
      // Try to fetch real blockchain data
      if (process.env.ETHERSCAN_API_KEY && chainId === 'ethereum') {
        // Get token transfers to find wallets interacting with protocol
        const tokenTransfers = await this.blockchainDataService.getTokenTransfers(
          protocolId,
          undefined,
          chainId,
          1000
        );

        // Extract unique wallet addresses
        const walletAddresses = new Set<string>();
        for (const transfer of tokenTransfers) {
          walletAddresses.add(transfer.from);
          walletAddresses.add(transfer.to);
        }

        // Remove protocol address
        walletAddresses.delete(protocolId);

        // Get wallet info for each address
        const walletInfos = await this.blockchainDataService.getWalletInfos(
          Array.from(walletAddresses).slice(0, 100), // Limit to 100 wallets
          chainId
        );

        // Convert to WalletInfo format
        return walletInfos.map(info => ({
          address: info.address,
          creation_time: info.creationTime,
          balance: info.balance,
          transaction_count: info.transactionCount,
          last_activity: info.lastActivity,
        }));
      }
    } catch (error) {
      console.warn(`Failed to fetch real wallet data for ${protocolId}:`, error);
    }

    // Fallback to mock data for testing
    console.log(`Using mock wallet data for protocol ${protocolId} on chain ${chainId}`);
    return [];
  }

  /**
   * Get transaction history for a wallet
   *
   * Fetches real transaction data if available, falls back to mock data for testing.
   */
  private async getTransactionHistory(walletAddress: string): Promise<Transaction[]> {
    try {
      // Try to fetch real blockchain data
      if (process.env.ETHERSCAN_API_KEY) {
        const transactions = await this.blockchainDataService.getWalletTransactions(
          walletAddress,
          'ethereum',
          100
        );

        // Convert to Transaction format
        return transactions.map(tx => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gas_price: tx.gasPrice,
          timestamp: tx.timestamp,
        }));
      }
    } catch (error) {
      console.warn(`Failed to fetch transaction history for ${walletAddress}:`, error);
    }

    // Fallback to mock data for testing
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
