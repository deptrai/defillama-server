/**
 * Sandwich Risk Calculator Tests
 * Story: 4.1.2 - MEV Protection Insights
 */

import { SandwichRiskCalculator, SandwichRiskInput } from '../sandwich-risk-calculator';

describe('SandwichRiskCalculator', () => {
  let calculator: SandwichRiskCalculator;

  beforeEach(() => {
    calculator = SandwichRiskCalculator.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SandwichRiskCalculator.getInstance();
      const instance2 = SandwichRiskCalculator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Low Risk Scenarios', () => {
    it('should calculate low risk for small transaction with low slippage', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 1000,              // $1K
        slippage_tolerance_pct: 0.30,     // 0.3%
        pool_liquidity_usd: 10000000,     // $10M
        pool_volume_24h_usd: 5000000,     // $5M
        gas_price_gwei: 40,               // 40 gwei
        mempool_pending_txs: 500,         // 500 pending
      };

      const result = calculator.calculateRisk(input);

      expect(result.overall_risk).toBeLessThan(30);
      expect(result.risk_level).toBe('low');
      expect(result.risk_factors.size_risk).toBeLessThan(30);
      expect(result.risk_factors.slippage_risk).toBeLessThan(30);
      expect(result.risk_factors.liquidity_risk).toBeLessThan(30);
      expect(result.risk_factors.congestion_risk).toBeLessThan(30);
    });

    it('should calculate low risk for tiny transaction', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 100,               // $100
        slippage_tolerance_pct: 0.50,     // 0.5%
        pool_liquidity_usd: 50000000,     // $50M
        pool_volume_24h_usd: 20000000,    // $20M
        gas_price_gwei: 30,               // 30 gwei
        mempool_pending_txs: 300,         // 300 pending
      };

      const result = calculator.calculateRisk(input);

      expect(result.overall_risk).toBeLessThan(25);
      expect(result.risk_level).toBe('low');
    });
  });

  describe('Medium Risk Scenarios', () => {
    it('should calculate medium risk for moderate transaction', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 50000,             // $50K
        slippage_tolerance_pct: 1.00,     // 1%
        pool_liquidity_usd: 2000000,      // $2M
        pool_volume_24h_usd: 1000000,     // $1M
        gas_price_gwei: 80,               // 80 gwei
        mempool_pending_txs: 3000,        // 3K pending
      };

      const result = calculator.calculateRisk(input);

      expect(result.overall_risk).toBeGreaterThanOrEqual(30);
      expect(result.overall_risk).toBeLessThan(60);
      expect(result.risk_level).toBe('medium');
    });
  });

  describe('High Risk Scenarios', () => {
    it('should calculate high risk for large transaction with high slippage', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 80000,             // $80K
        slippage_tolerance_pct: 1.20,     // 1.2%
        pool_liquidity_usd: 1200000,      // $1.2M
        pool_volume_24h_usd: 600000,      // $600K
        gas_price_gwei: 110,              // 110 gwei
        mempool_pending_txs: 5000,        // 5K pending
      };

      const result = calculator.calculateRisk(input);

      expect(result.overall_risk).toBeGreaterThanOrEqual(60);
      expect(result.overall_risk).toBeLessThan(80);
      expect(result.risk_level).toBe('high');
    });
  });

  describe('Critical Risk Scenarios', () => {
    it('should calculate critical risk for very large transaction', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 500000,            // $500K
        slippage_tolerance_pct: 5.00,     // 5%
        pool_liquidity_usd: 100000,       // $100K
        pool_volume_24h_usd: 50000,       // $50K
        gas_price_gwei: 250,              // 250 gwei
        mempool_pending_txs: 15000,       // 15K pending
      };

      const result = calculator.calculateRisk(input);

      expect(result.overall_risk).toBeGreaterThanOrEqual(80);
      expect(result.risk_level).toBe('critical');
      expect(result.risk_factors.size_risk).toBeGreaterThan(80);
      expect(result.risk_factors.slippage_risk).toBeGreaterThan(80);
    });

    it('should calculate critical risk for zero liquidity', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 10000,             // $10K
        slippage_tolerance_pct: 1.00,     // 1%
        pool_liquidity_usd: 0,            // No liquidity
        pool_volume_24h_usd: 0,           // No volume
        gas_price_gwei: 100,              // 100 gwei
        mempool_pending_txs: 5000,        // 5K pending
      };

      const result = calculator.calculateRisk(input);

      expect(result.overall_risk).toBeGreaterThan(70);
      expect(result.risk_factors.size_risk).toBe(100);
      expect(result.risk_factors.liquidity_risk).toBeGreaterThan(90);
    });
  });

  describe('Individual Risk Factors', () => {
    it('should calculate size risk correctly', () => {
      const baseInput: SandwichRiskInput = {
        amount_in_usd: 0,
        slippage_tolerance_pct: 0.50,
        pool_liquidity_usd: 1000000,
        pool_volume_24h_usd: 500000,
        gas_price_gwei: 50,
        mempool_pending_txs: 1000,
      };

      // <1% of pool = low risk
      let result = calculator.calculateRisk({ ...baseInput, amount_in_usd: 5000 });
      expect(result.risk_factors.size_risk).toBeLessThan(30);

      // 1-5% of pool = medium risk
      result = calculator.calculateRisk({ ...baseInput, amount_in_usd: 30000 });
      expect(result.risk_factors.size_risk).toBeGreaterThanOrEqual(30);
      expect(result.risk_factors.size_risk).toBeLessThan(60);

      // 5-10% of pool = high risk
      result = calculator.calculateRisk({ ...baseInput, amount_in_usd: 70000 });
      expect(result.risk_factors.size_risk).toBeGreaterThanOrEqual(60);

      // >10% of pool = critical risk
      result = calculator.calculateRisk({ ...baseInput, amount_in_usd: 150000 });
      expect(result.risk_factors.size_risk).toBeGreaterThan(90);
    });

    it('should calculate slippage risk correctly', () => {
      const baseInput: SandwichRiskInput = {
        amount_in_usd: 10000,
        slippage_tolerance_pct: 0,
        pool_liquidity_usd: 10000000,
        pool_volume_24h_usd: 5000000,
        gas_price_gwei: 50,
        mempool_pending_txs: 1000,
      };

      // <0.5% = low risk
      let result = calculator.calculateRisk({ ...baseInput, slippage_tolerance_pct: 0.30 });
      expect(result.risk_factors.slippage_risk).toBeLessThan(30);

      // 0.5-1% = medium risk
      result = calculator.calculateRisk({ ...baseInput, slippage_tolerance_pct: 0.75 });
      expect(result.risk_factors.slippage_risk).toBeGreaterThanOrEqual(30);
      expect(result.risk_factors.slippage_risk).toBeLessThan(60);

      // 1-2% = high risk
      result = calculator.calculateRisk({ ...baseInput, slippage_tolerance_pct: 1.50 });
      expect(result.risk_factors.slippage_risk).toBeGreaterThanOrEqual(60);

      // >2% = critical risk
      result = calculator.calculateRisk({ ...baseInput, slippage_tolerance_pct: 3.00 });
      expect(result.risk_factors.slippage_risk).toBeGreaterThan(90);
    });

    it('should calculate liquidity risk correctly', () => {
      const baseInput: SandwichRiskInput = {
        amount_in_usd: 10000,
        slippage_tolerance_pct: 0.50,
        pool_liquidity_usd: 0,
        pool_volume_24h_usd: 500000,
        gas_price_gwei: 50,
        mempool_pending_txs: 1000,
      };

      // >$10M = low risk
      let result = calculator.calculateRisk({ ...baseInput, pool_liquidity_usd: 20000000 });
      expect(result.risk_factors.liquidity_risk).toBeLessThan(30);

      // $1M-$10M = medium risk
      result = calculator.calculateRisk({ ...baseInput, pool_liquidity_usd: 5000000 });
      expect(result.risk_factors.liquidity_risk).toBeGreaterThanOrEqual(30);
      expect(result.risk_factors.liquidity_risk).toBeLessThan(60);

      // $100K-$1M = high risk
      result = calculator.calculateRisk({ ...baseInput, pool_liquidity_usd: 500000 });
      expect(result.risk_factors.liquidity_risk).toBeGreaterThanOrEqual(60);

      // <$100K = critical risk
      result = calculator.calculateRisk({ ...baseInput, pool_liquidity_usd: 50000 });
      expect(result.risk_factors.liquidity_risk).toBeGreaterThan(90);
    });

    it('should calculate congestion risk correctly', () => {
      const baseInput: SandwichRiskInput = {
        amount_in_usd: 10000,
        slippage_tolerance_pct: 0.50,
        pool_liquidity_usd: 10000000,
        pool_volume_24h_usd: 5000000,
        gas_price_gwei: 0,
        mempool_pending_txs: 1000,
      };

      // <50 gwei = low risk
      let result = calculator.calculateRisk({ ...baseInput, gas_price_gwei: 30 });
      expect(result.risk_factors.congestion_risk).toBeLessThan(30);

      // 50-100 gwei = medium risk
      result = calculator.calculateRisk({ ...baseInput, gas_price_gwei: 75 });
      expect(result.risk_factors.congestion_risk).toBeGreaterThanOrEqual(30);
      expect(result.risk_factors.congestion_risk).toBeLessThan(60);

      // 100-200 gwei = high risk
      result = calculator.calculateRisk({ ...baseInput, gas_price_gwei: 150 });
      expect(result.risk_factors.congestion_risk).toBeGreaterThanOrEqual(60);

      // >200 gwei = critical risk
      result = calculator.calculateRisk({ ...baseInput, gas_price_gwei: 300 });
      expect(result.risk_factors.congestion_risk).toBeGreaterThan(90);
    });
  });

  describe('Explanation Generation', () => {
    it('should generate explanation for low risk', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 1000,
        slippage_tolerance_pct: 0.30,
        pool_liquidity_usd: 10000000,
        pool_volume_24h_usd: 5000000,
        gas_price_gwei: 40,
        mempool_pending_txs: 500,
      };

      const result = calculator.calculateRisk(input);

      expect(result.explanation).toContain('LOW');
      expect(result.explanation).not.toContain('Recommendations');
    });

    it('should generate explanation with recommendations for high risk', () => {
      const input: SandwichRiskInput = {
        amount_in_usd: 80000,             // $80K
        slippage_tolerance_pct: 1.20,     // 1.2%
        pool_liquidity_usd: 1200000,      // $1.2M
        pool_volume_24h_usd: 600000,      // $600K
        gas_price_gwei: 110,              // 110 gwei
        mempool_pending_txs: 5000,        // 5K pending
      };

      const result = calculator.calculateRisk(input);

      expect(result.explanation).toContain('HIGH');
      expect(result.explanation).toContain('Recommendations');
    });
  });
});

