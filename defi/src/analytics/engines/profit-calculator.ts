/**
 * Profit Calculator Utility
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Reusable profit calculation functions for MEV opportunities
 * 
 * Features:
 * - Calculate gross profit
 * - Estimate gas costs
 * - Account for slippage
 * - Calculate net profit
 * - Calculate ROI and profit margin
 */

import { ProfitCalculationInput, ProfitCalculationResult } from './mev-types';

// ============================================================================
// Profit Calculator
// ============================================================================

export class ProfitCalculator {
  private static instance: ProfitCalculator;

  // Gas price constants (can be updated based on network conditions)
  private readonly DEFAULT_GAS_PRICE_GWEI = 150;
  private readonly ETH_PRICE_USD = 2000;
  private readonly GAS_UNITS_PER_TX = 21000;

  private constructor() {}

  public static getInstance(): ProfitCalculator {
    if (!ProfitCalculator.instance) {
      ProfitCalculator.instance = new ProfitCalculator();
    }
    return ProfitCalculator.instance;
  }

  /**
   * Calculate complete profit metrics
   */
  public calculateProfit(input: ProfitCalculationInput): ProfitCalculationResult {
    const {
      gross_profit_usd,
      gas_cost_usd,
      slippage_pct = 0,
      protocol_fees_usd = 0,
      other_costs_usd = 0,
    } = input;

    // Calculate slippage cost
    const slippageCost = gross_profit_usd * (slippage_pct / 100);

    // Calculate total costs
    const totalCosts = gas_cost_usd + slippageCost + protocol_fees_usd + other_costs_usd;

    // Calculate net profit
    const netProfit = gross_profit_usd - totalCosts;

    // Calculate profit margin
    const profitMargin = gross_profit_usd > 0 ? (netProfit / gross_profit_usd) * 100 : 0;

    // Calculate ROI
    const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;

    return {
      gross_profit_usd,
      total_costs_usd: totalCosts,
      net_profit_usd: netProfit,
      profit_margin_pct: profitMargin,
      roi_pct: roi,
    };
  }

  /**
   * Estimate gas cost in USD
   */
  public estimateGasCost(
    gasPriceGwei: number = this.DEFAULT_GAS_PRICE_GWEI,
    gasUnits: number = this.GAS_UNITS_PER_TX,
    ethPriceUsd: number = this.ETH_PRICE_USD
  ): number {
    // Convert gwei to ETH
    const gasPriceEth = gasPriceGwei / 1e9;

    // Calculate gas cost in ETH
    const gasCostEth = gasPriceEth * gasUnits;

    // Convert to USD
    return gasCostEth * ethPriceUsd;
  }

  /**
   * Calculate slippage cost
   */
  public calculateSlippageCost(
    tradeAmountUsd: number,
    slippagePct: number
  ): number {
    return tradeAmountUsd * (slippagePct / 100);
  }

  /**
   * Calculate sandwich attack profit
   */
  public calculateSandwichProfit(
    frontrunInput: number,
    backrunOutput: number,
    gasPriceGwei: number = this.DEFAULT_GAS_PRICE_GWEI
  ): ProfitCalculationResult {
    const grossProfit = backrunOutput - frontrunInput;

    // Estimate gas costs for 2 transactions (frontrun + backrun)
    const gasCost = this.estimateGasCost(gasPriceGwei, this.GAS_UNITS_PER_TX * 2);

    return this.calculateProfit({
      gross_profit_usd: grossProfit,
      gas_cost_usd: gasCost,
      slippage_pct: 0.1, // Minimal slippage for sandwich
    });
  }

  /**
   * Calculate frontrun profit
   */
  public calculateFrontrunProfit(
    amount: number,
    priceIncrease: number,
    gasPriceGwei: number = this.DEFAULT_GAS_PRICE_GWEI
  ): ProfitCalculationResult {
    const grossProfit = amount * priceIncrease;
    const gasCost = this.estimateGasCost(gasPriceGwei);

    return this.calculateProfit({
      gross_profit_usd: grossProfit,
      gas_cost_usd: gasCost,
      slippage_pct: 0.2,
    });
  }

  /**
   * Calculate arbitrage profit
   */
  public calculateArbitrageProfit(
    tradeSize: number,
    priceDifferencePct: number,
    gasPriceGwei: number = this.DEFAULT_GAS_PRICE_GWEI,
    slippagePct: number = 0.3
  ): ProfitCalculationResult {
    const grossProfit = tradeSize * (priceDifferencePct / 100);

    // Gas costs for 2 transactions (buy + sell)
    const gasCost = this.estimateGasCost(gasPriceGwei, this.GAS_UNITS_PER_TX * 2);

    return this.calculateProfit({
      gross_profit_usd: grossProfit,
      gas_cost_usd: gasCost,
      slippage_pct: slippagePct,
    });
  }

  /**
   * Calculate liquidation profit
   */
  public calculateLiquidationProfit(
    liquidationAmount: number,
    liquidationBonusPct: number,
    gasPriceGwei: number = this.DEFAULT_GAS_PRICE_GWEI
  ): ProfitCalculationResult {
    const grossProfit = liquidationAmount * (liquidationBonusPct / 100);
    const gasCost = this.estimateGasCost(gasPriceGwei);

    return this.calculateProfit({
      gross_profit_usd: grossProfit,
      gas_cost_usd: gasCost,
      slippage_pct: 0, // No slippage for liquidations
    });
  }

  /**
   * Calculate backrun profit
   */
  public calculateBackrunProfit(
    amount: number,
    priceChange: number,
    gasPriceGwei: number = this.DEFAULT_GAS_PRICE_GWEI
  ): ProfitCalculationResult {
    const grossProfit = amount * Math.abs(priceChange);
    const gasCost = this.estimateGasCost(gasPriceGwei);

    return this.calculateProfit({
      gross_profit_usd: grossProfit,
      gas_cost_usd: gasCost,
      slippage_pct: 0.2,
    });
  }

  /**
   * Check if opportunity is profitable
   */
  public isProfitable(
    input: ProfitCalculationInput,
    minProfitUsd: number = 100
  ): boolean {
    const result = this.calculateProfit(input);
    return result.net_profit_usd >= minProfitUsd;
  }

  /**
   * Calculate profit margin percentage
   */
  public calculateProfitMargin(
    grossProfit: number,
    totalCosts: number
  ): number {
    if (grossProfit === 0) return 0;
    const netProfit = grossProfit - totalCosts;
    return (netProfit / grossProfit) * 100;
  }

  /**
   * Calculate ROI percentage
   */
  public calculateROI(
    netProfit: number,
    totalCosts: number
  ): number {
    if (totalCosts === 0) return 0;
    return (netProfit / totalCosts) * 100;
  }

  /**
   * Estimate total costs
   */
  public estimateTotalCosts(
    gasCostUsd: number,
    slippagePct: number,
    tradeAmountUsd: number,
    protocolFeesUsd: number = 0,
    otherCostsUsd: number = 0
  ): number {
    const slippageCost = this.calculateSlippageCost(tradeAmountUsd, slippagePct);
    return gasCostUsd + slippageCost + protocolFeesUsd + otherCostsUsd;
  }

  /**
   * Calculate break-even price
   */
  public calculateBreakEvenPrice(
    entryPrice: number,
    totalCosts: number,
    amount: number
  ): number {
    if (amount === 0) return 0;
    return entryPrice + (totalCosts / amount);
  }

  /**
   * Calculate profit per transaction
   */
  public calculateProfitPerTx(
    totalProfit: number,
    numberOfTransactions: number
  ): number {
    if (numberOfTransactions === 0) return 0;
    return totalProfit / numberOfTransactions;
  }

  /**
   * Calculate profit efficiency (profit per gas unit)
   */
  public calculateProfitEfficiency(
    netProfit: number,
    gasUnitsUsed: number
  ): number {
    if (gasUnitsUsed === 0) return 0;
    return netProfit / gasUnitsUsed;
  }

  /**
   * Estimate maximum profitable trade size
   */
  public estimateMaxTradeSize(
    priceDifferencePct: number,
    gasCostUsd: number,
    slippagePct: number,
    minProfitUsd: number = 100
  ): number {
    // Solve for trade size where net profit = minProfitUsd
    // netProfit = tradeSize * (priceDiff% - slippage%) - gasCost
    // minProfit = tradeSize * (priceDiff% - slippage%) - gasCost
    // tradeSize = (minProfit + gasCost) / (priceDiff% - slippage%)

    const effectivePriceDiff = (priceDifferencePct - slippagePct) / 100;
    if (effectivePriceDiff <= 0) return 0;

    return (minProfitUsd + gasCostUsd) / effectivePriceDiff;
  }

  /**
   * Calculate profit with multiple scenarios
   */
  public calculateProfitScenarios(
    baseInput: ProfitCalculationInput
  ): {
    best_case: ProfitCalculationResult;
    expected_case: ProfitCalculationResult;
    worst_case: ProfitCalculationResult;
  } {
    // Best case: Lower gas, lower slippage
    const bestCase = this.calculateProfit({
      ...baseInput,
      gas_cost_usd: baseInput.gas_cost_usd * 0.7,
      slippage_pct: (baseInput.slippage_pct || 0) * 0.5,
    });

    // Expected case: Normal conditions
    const expectedCase = this.calculateProfit(baseInput);

    // Worst case: Higher gas, higher slippage
    const worstCase = this.calculateProfit({
      ...baseInput,
      gas_cost_usd: baseInput.gas_cost_usd * 1.5,
      slippage_pct: (baseInput.slippage_pct || 0) * 2,
    });

    return {
      best_case: bestCase,
      expected_case: expectedCase,
      worst_case: worstCase,
    };
  }
}

// Export singleton instance
export const profitCalculator = ProfitCalculator.getInstance();

