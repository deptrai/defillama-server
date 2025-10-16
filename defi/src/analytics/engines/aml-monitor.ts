/**
 * AML (Anti-Money Laundering) Monitor Engine
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 3: AML Monitoring
 * 
 * Monitors transactions for AML risks:
 * - Structuring (multiple small transactions to avoid reporting thresholds)
 * - Layering (complex transaction chains to obscure origin)
 * - High-risk jurisdiction detection
 */

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  timestamp: Date;
  chainId: string;
}

export interface StructuringDetectionResult {
  detected: boolean;
  score: number;
  details: {
    transactionCount: number;
    totalValue: number;
    averageValue: number;
    timeWindow: string;
    threshold: number;
  };
}

export interface LayeringDetectionResult {
  detected: boolean;
  score: number;
  details: {
    chainLength: number;
    uniqueAddresses: number;
    totalHops: number;
    complexity: number;
  };
}

export interface HighRiskJurisdictionResult {
  detected: boolean;
  score: number;
  details: {
    jurisdictions: string[];
    riskLevel: string;
    countries: string[];
  };
}

export interface AMLMonitoringResult {
  walletAddress: string;
  riskScore: number;
  riskLevel: string;
  structuring: boolean;
  layering: boolean;
  highRiskJurisdiction: boolean;
  details: {
    structuring: StructuringDetectionResult['details'];
    layering: LayeringDetectionResult['details'];
    highRiskJurisdiction: HighRiskJurisdictionResult['details'];
  };
  timestamp: Date;
}

/**
 * High-risk jurisdictions (mock data)
 */
const HIGH_RISK_JURISDICTIONS = new Set([
  'DPRK', // North Korea
  'IRAN', // Iran
  'SYRIA', // Syria
  'CUBA', // Cuba
  'CRIMEA', // Crimea
]);

/**
 * AML Monitor Engine
 */
export class AMLMonitor {
  private static instance: AMLMonitor;

  // Thresholds
  private readonly STRUCTURING_THRESHOLD = 10000; // USD
  private readonly STRUCTURING_COUNT_THRESHOLD = 5; // transactions
  private readonly STRUCTURING_TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
  private readonly LAYERING_CHAIN_THRESHOLD = 5; // hops
  private readonly LAYERING_COMPLEXITY_THRESHOLD = 0.7; // 0-1

  private constructor() {}

  public static getInstance(): AMLMonitor {
    if (!AMLMonitor.instance) {
      AMLMonitor.instance = new AMLMonitor();
    }
    return AMLMonitor.instance;
  }

  /**
   * Monitor wallet for AML risks
   */
  public async monitorWallet(walletAddress: string, transactions?: Transaction[]): Promise<AMLMonitoringResult> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Get transactions if not provided
    const txs = transactions || await this.getWalletTransactions(normalizedAddress);

    // Detect structuring
    const structuring = this.detectStructuring(txs);

    // Detect layering
    const layering = this.detectLayering(txs);

    // Check high-risk jurisdiction
    const highRiskJurisdiction = await this.checkHighRiskJurisdiction(normalizedAddress);

    // Calculate overall AML risk score
    const riskScore = (
      structuring.score * 0.40 +
      layering.score * 0.40 +
      highRiskJurisdiction.score * 0.20
    );

    const riskLevel = this.categorizeRisk(riskScore);

    return {
      walletAddress: normalizedAddress,
      riskScore: Math.round(riskScore * 100) / 100,
      riskLevel,
      structuring: structuring.detected,
      layering: layering.detected,
      highRiskJurisdiction: highRiskJurisdiction.detected,
      details: {
        structuring: structuring.details,
        layering: layering.details,
        highRiskJurisdiction: highRiskJurisdiction.details,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Detect structuring (multiple small transactions)
   */
  public detectStructuring(transactions: Transaction[]): StructuringDetectionResult {
    if (transactions.length === 0) {
      return {
        detected: false,
        score: 0,
        details: {
          transactionCount: 0,
          totalValue: 0,
          averageValue: 0,
          timeWindow: '24h',
          threshold: this.STRUCTURING_THRESHOLD,
        },
      };
    }

    // Group transactions by time window
    const now = Date.now();
    const recentTxs = transactions.filter(tx => 
      now - tx.timestamp.getTime() < this.STRUCTURING_TIME_WINDOW
    );

    if (recentTxs.length < this.STRUCTURING_COUNT_THRESHOLD) {
      return {
        detected: false,
        score: 0,
        details: {
          transactionCount: recentTxs.length,
          totalValue: recentTxs.reduce((sum, tx) => sum + tx.value, 0),
          averageValue: recentTxs.length > 0 
            ? recentTxs.reduce((sum, tx) => sum + tx.value, 0) / recentTxs.length 
            : 0,
          timeWindow: '24h',
          threshold: this.STRUCTURING_THRESHOLD,
        },
      };
    }

    const totalValue = recentTxs.reduce((sum, tx) => sum + tx.value, 0);
    const averageValue = totalValue / recentTxs.length;

    // Detect if multiple small transactions just below threshold
    const detected = (
      recentTxs.length >= this.STRUCTURING_COUNT_THRESHOLD &&
      averageValue < this.STRUCTURING_THRESHOLD &&
      totalValue > this.STRUCTURING_THRESHOLD
    );

    // Calculate score based on pattern strength
    let score = 0;
    if (detected) {
      const countFactor = Math.min(recentTxs.length / (this.STRUCTURING_COUNT_THRESHOLD * 2), 1);
      const valueFactor = Math.min(totalValue / (this.STRUCTURING_THRESHOLD * 5), 1);
      score = (countFactor * 0.6 + valueFactor * 0.4);
    }

    return {
      detected,
      score,
      details: {
        transactionCount: recentTxs.length,
        totalValue,
        averageValue,
        timeWindow: '24h',
        threshold: this.STRUCTURING_THRESHOLD,
      },
    };
  }

  /**
   * Detect layering (complex transaction chains)
   */
  public detectLayering(transactions: Transaction[]): LayeringDetectionResult {
    if (transactions.length === 0) {
      return {
        detected: false,
        score: 0,
        details: {
          chainLength: 0,
          uniqueAddresses: 0,
          totalHops: 0,
          complexity: 0,
        },
      };
    }

    // Build transaction graph
    const addressSet = new Set<string>();
    transactions.forEach(tx => {
      addressSet.add(tx.from.toLowerCase());
      addressSet.add(tx.to.toLowerCase());
    });

    const uniqueAddresses = addressSet.size;
    const totalHops = transactions.length;

    // Calculate chain length (longest path)
    const chainLength = this.calculateChainLength(transactions);

    // Calculate complexity (ratio of unique addresses to transactions)
    const complexity = uniqueAddresses / Math.max(totalHops, 1);

    // Detect layering
    const detected = (
      chainLength >= this.LAYERING_CHAIN_THRESHOLD &&
      complexity >= this.LAYERING_COMPLEXITY_THRESHOLD
    );

    // Calculate score
    let score = 0;
    if (detected) {
      const chainFactor = Math.min(chainLength / (this.LAYERING_CHAIN_THRESHOLD * 2), 1);
      const complexityFactor = Math.min(complexity / this.LAYERING_COMPLEXITY_THRESHOLD, 1);
      score = (chainFactor * 0.5 + complexityFactor * 0.5);
    }

    return {
      detected,
      score,
      details: {
        chainLength,
        uniqueAddresses,
        totalHops,
        complexity: Math.round(complexity * 100) / 100,
      },
    };
  }

  /**
   * Check high-risk jurisdiction
   */
  public async checkHighRiskJurisdiction(walletAddress: string): Promise<HighRiskJurisdictionResult> {
    // Mock implementation
    // In production, this would check wallet's transaction history against jurisdiction databases
    
    // For testing, check if address contains certain patterns
    const addressLower = walletAddress.toLowerCase();
    const highRiskPatterns = ['dprk', 'iran', 'syria', 'cuba', 'crimea'];
    
    const matchedJurisdictions: string[] = [];
    highRiskPatterns.forEach(pattern => {
      if (addressLower.includes(pattern)) {
        matchedJurisdictions.push(pattern.toUpperCase());
      }
    });

    const detected = matchedJurisdictions.length > 0;
    const score = detected ? 0.9 : 0;

    return {
      detected,
      score,
      details: {
        jurisdictions: matchedJurisdictions,
        riskLevel: detected ? 'high' : 'low',
        countries: matchedJurisdictions,
      },
    };
  }

  /**
   * Calculate chain length (longest path in transaction graph)
   */
  private calculateChainLength(transactions: Transaction[]): number {
    if (transactions.length === 0) return 0;

    // Build adjacency list
    const graph = new Map<string, string[]>();
    transactions.forEach(tx => {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      if (!graph.has(from)) {
        graph.set(from, []);
      }
      graph.get(from)!.push(to);
    });

    // Find longest path using DFS
    let maxLength = 0;
    const visited = new Set<string>();

    const dfs = (node: string, length: number) => {
      visited.add(node);
      maxLength = Math.max(maxLength, length);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, length + 1);
        }
      }

      visited.delete(node);
    };

    // Start DFS from each node
    graph.forEach((_, node) => {
      dfs(node, 1);
    });

    return maxLength;
  }

  /**
   * Categorize risk level based on score
   */
  private categorizeRisk(score: number): string {
    if (score >= 0.75) return 'critical';
    if (score >= 0.50) return 'high';
    if (score >= 0.25) return 'medium';
    return 'low';
  }

  /**
   * Get wallet transactions (mock implementation)
   */
  private async getWalletTransactions(walletAddress: string): Promise<Transaction[]> {
    // Mock implementation
    // In production, this would fetch from blockchain data service
    return [];
  }
}

