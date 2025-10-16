/**
 * RPC Requirements Calculator
 * Calculate minimum number of free RPC endpoints needed for smooth operation
 * 
 * Features:
 * - Calculate RPC requirements per chain
 * - Estimate rate limit impact
 * - Recommend optimal RPC configuration
 * - Cost-benefit analysis
 */

interface ChainMetrics {
  chainId: string;
  blockTime: number; // seconds
  avgTransactionsPerBlock: number;
  avgMEVOpportunitiesPerBlock: number;
  blocksPerDay: number;
  requestsPerBlock: number; // RPC requests needed per block
}

interface RPCProviderLimits {
  provider: string;
  requestsPerSecond: number;
  requestsPerDay: number;
  cost: string;
}

interface RPCRequirements {
  chainId: string;
  requestsPerSecond: number;
  requestsPerDay: number;
  minimumFreeRPCs: number;
  recommendedFreeRPCs: number;
  alternativePaidRPC: {
    provider: string;
    cost: string;
    benefit: string;
  };
}

export class RPCCalculator {
  // Chain metrics (based on real-world data)
  private chainMetrics: ChainMetrics[] = [
    {
      chainId: 'ethereum',
      blockTime: 12, // seconds
      avgTransactionsPerBlock: 150,
      avgMEVOpportunitiesPerBlock: 10,
      blocksPerDay: 7200,
      requestsPerBlock: 3, // 1 for block, 1 for transactions, 1 for receipts
    },
    {
      chainId: 'arbitrum',
      blockTime: 0.25, // 250ms
      avgTransactionsPerBlock: 50,
      avgMEVOpportunitiesPerBlock: 3,
      blocksPerDay: 345600,
      requestsPerBlock: 3,
    },
    {
      chainId: 'optimism',
      blockTime: 2, // seconds
      avgTransactionsPerBlock: 30,
      avgMEVOpportunitiesPerBlock: 2,
      blocksPerDay: 43200,
      requestsPerBlock: 3,
    },
    {
      chainId: 'bsc',
      blockTime: 3, // seconds
      avgTransactionsPerBlock: 100,
      avgMEVOpportunitiesPerBlock: 8,
      blocksPerDay: 28800,
      requestsPerBlock: 3,
    },
    {
      chainId: 'polygon',
      blockTime: 2, // seconds
      avgTransactionsPerBlock: 80,
      avgMEVOpportunitiesPerBlock: 5,
      blocksPerDay: 43200,
      requestsPerBlock: 3,
    },
  ];

  // Free RPC provider limits (conservative estimates)
  private freeRPCLimits: RPCProviderLimits[] = [
    {
      provider: 'Infura Free',
      requestsPerSecond: 10,
      requestsPerDay: 100000,
      cost: 'Free',
    },
    {
      provider: 'Alchemy Free',
      requestsPerSecond: 5,
      requestsPerDay: 300000,
      cost: 'Free',
    },
    {
      provider: 'QuickNode Free',
      requestsPerSecond: 5,
      requestsPerDay: 50000,
      cost: 'Free',
    },
    {
      provider: 'Ankr Free',
      requestsPerSecond: 3,
      requestsPerDay: 50000,
      cost: 'Free',
    },
    {
      provider: 'LlamaRPC',
      requestsPerSecond: 2,
      requestsPerDay: 100000,
      cost: 'Free',
    },
  ];

  // Paid RPC options
  private paidRPCOptions: RPCProviderLimits[] = [
    {
      provider: 'Infura Growth',
      requestsPerSecond: 100,
      requestsPerDay: 10000000,
      cost: '$50/month',
    },
    {
      provider: 'Alchemy Growth',
      requestsPerSecond: 200,
      requestsPerDay: 15000000,
      cost: '$49/month',
    },
    {
      provider: 'QuickNode Starter',
      requestsPerSecond: 50,
      requestsPerDay: 5000000,
      cost: '$49/month',
    },
  ];

  /**
   * Calculate RPC requirements for a specific chain
   */
  public calculateChainRequirements(chainId: string): RPCRequirements {
    const metrics = this.chainMetrics.find(m => m.chainId === chainId);
    if (!metrics) {
      throw new Error(`No metrics found for chain: ${chainId}`);
    }

    // Calculate requests per second
    const requestsPerSecond = metrics.requestsPerBlock / metrics.blockTime;

    // Calculate requests per day
    const requestsPerDay = metrics.blocksPerDay * metrics.requestsPerBlock;

    // Calculate minimum free RPCs needed
    // Use most conservative free RPC limit (2 req/s from LlamaRPC)
    const minFreeRPCLimit = Math.min(...this.freeRPCLimits.map(l => l.requestsPerSecond));
    const minimumFreeRPCs = Math.ceil(requestsPerSecond / minFreeRPCLimit);

    // Calculate recommended free RPCs (with 50% buffer for rate limits)
    const recommendedFreeRPCs = Math.ceil(minimumFreeRPCs * 1.5);

    // Find best paid alternative
    const bestPaidRPC = this.paidRPCOptions[0]; // Infura Growth

    return {
      chainId,
      requestsPerSecond,
      requestsPerDay,
      minimumFreeRPCs,
      recommendedFreeRPCs,
      alternativePaidRPC: {
        provider: bestPaidRPC.provider,
        cost: bestPaidRPC.cost,
        benefit: `${bestPaidRPC.requestsPerSecond}x faster, 99.9% uptime`,
      },
    };
  }

  /**
   * Calculate total RPC requirements for all chains
   */
  public calculateTotalRequirements(): {
    chains: RPCRequirements[];
    totalMinimumFreeRPCs: number;
    totalRecommendedFreeRPCs: number;
    totalCostWithPaidRPCs: string;
    recommendation: string;
  } {
    const chains = this.chainMetrics.map(m => this.calculateChainRequirements(m.chainId));

    const totalMinimumFreeRPCs = chains.reduce((sum, c) => sum + c.minimumFreeRPCs, 0);
    const totalRecommendedFreeRPCs = chains.reduce((sum, c) => sum + c.recommendedFreeRPCs, 0);

    // Calculate cost with paid RPCs (one paid RPC per chain)
    const costPerChain = 50; // Average $50/month per chain
    const totalCostWithPaidRPCs = `$${chains.length * costPerChain}/month`;

    // Generate recommendation
    let recommendation = '';
    if (totalRecommendedFreeRPCs <= 10) {
      recommendation = `✅ Feasible with free RPCs (${totalRecommendedFreeRPCs} endpoints needed)`;
    } else if (totalRecommendedFreeRPCs <= 20) {
      recommendation = `⚠️ Challenging with free RPCs (${totalRecommendedFreeRPCs} endpoints needed). Consider paid RPCs for critical chains.`;
    } else {
      recommendation = `❌ Not recommended with free RPCs (${totalRecommendedFreeRPCs} endpoints needed). Use paid RPCs.`;
    }

    return {
      chains,
      totalMinimumFreeRPCs,
      totalRecommendedFreeRPCs,
      totalCostWithPaidRPCs,
      recommendation,
    };
  }

  /**
   * Generate detailed report
   */
  public generateReport(): string {
    const requirements = this.calculateTotalRequirements();

    let report = '\n';
    report += '═'.repeat(80) + '\n';
    report += '  RPC REQUIREMENTS ANALYSIS\n';
    report += '═'.repeat(80) + '\n\n';

    // Per-chain analysis
    report += '📊 PER-CHAIN REQUIREMENTS:\n\n';
    for (const chain of requirements.chains) {
      const metrics = this.chainMetrics.find(m => m.chainId === chain.chainId)!;
      
      report += `${chain.chainId.toUpperCase()}:\n`;
      report += `  Block Time: ${metrics.blockTime}s\n`;
      report += `  Blocks/Day: ${metrics.blocksPerDay.toLocaleString()}\n`;
      report += `  Requests/Second: ${chain.requestsPerSecond.toFixed(2)}\n`;
      report += `  Requests/Day: ${chain.requestsPerDay.toLocaleString()}\n`;
      report += `  Minimum Free RPCs: ${chain.minimumFreeRPCs}\n`;
      report += `  Recommended Free RPCs: ${chain.recommendedFreeRPCs}\n`;
      report += `  Alternative: ${chain.alternativePaidRPC.provider} (${chain.alternativePaidRPC.cost})\n`;
      report += '\n';
    }

    // Total requirements
    report += '═'.repeat(80) + '\n';
    report += '📈 TOTAL REQUIREMENTS:\n\n';
    report += `  Minimum Free RPCs: ${requirements.totalMinimumFreeRPCs}\n`;
    report += `  Recommended Free RPCs: ${requirements.totalRecommendedFreeRPCs}\n`;
    report += `  Cost with Paid RPCs: ${requirements.totalCostWithPaidRPCs}\n`;
    report += '\n';
    report += `  ${requirements.recommendation}\n`;
    report += '\n';

    // Free RPC providers
    report += '═'.repeat(80) + '\n';
    report += '🆓 FREE RPC PROVIDERS:\n\n';
    for (const provider of this.freeRPCLimits) {
      report += `  ${provider.provider}:\n`;
      report += `    - ${provider.requestsPerSecond} req/s\n`;
      report += `    - ${provider.requestsPerDay.toLocaleString()} req/day\n`;
      report += '\n';
    }

    // Paid RPC options
    report += '═'.repeat(80) + '\n';
    report += '💰 PAID RPC OPTIONS:\n\n';
    for (const provider of this.paidRPCOptions) {
      report += `  ${provider.provider} (${provider.cost}):\n`;
      report += `    - ${provider.requestsPerSecond} req/s\n`;
      report += `    - ${provider.requestsPerDay.toLocaleString()} req/day\n`;
      report += '\n';
    }

    // Recommendations
    report += '═'.repeat(80) + '\n';
    report += '💡 RECOMMENDATIONS:\n\n';
    
    if (requirements.totalRecommendedFreeRPCs <= 10) {
      report += '  ✅ Strategy: Use Free RPCs\n';
      report += `     - Setup ${requirements.totalRecommendedFreeRPCs} free RPC endpoints\n`;
      report += '     - Distribute across multiple providers\n';
      report += '     - Enable automatic failover\n';
      report += '     - Monitor rate limits\n';
    } else {
      report += '  ✅ Strategy: Hybrid Approach\n';
      report += '     - Use paid RPCs for high-volume chains (Ethereum, Arbitrum)\n';
      report += '     - Use free RPCs for low-volume chains (Optimism, BSC, Polygon)\n';
      report += `     - Estimated cost: $100-150/month\n`;
      report += '     - 99.9% uptime guarantee\n';
    }

    report += '\n';
    report += '═'.repeat(80) + '\n';

    return report;
  }

  /**
   * Get recommended RPC configuration
   */
  public getRecommendedConfig(): Record<string, string[]> {
    const config: Record<string, string[]> = {};

    for (const metrics of this.chainMetrics) {
      const requirements = this.calculateChainRequirements(metrics.chainId);
      const urls: string[] = [];

      // Add recommended number of free RPC URLs
      for (let i = 0; i < requirements.recommendedFreeRPCs; i++) {
        const provider = this.freeRPCLimits[i % this.freeRPCLimits.length];
        urls.push(`wss://${metrics.chainId}-mainnet.${provider.provider.toLowerCase().split(' ')[0]}.io/ws/v3/YOUR_KEY_${i + 1}`);
      }

      config[metrics.chainId] = urls;
    }

    return config;
  }
}

// Export singleton instance
export const rpcCalculator = new RPCCalculator();

