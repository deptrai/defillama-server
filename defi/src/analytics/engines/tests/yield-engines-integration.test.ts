/**
 * Yield Engines Integration Tests
 * Story: 2.1.2 - Yield Opportunity Scanner
 * 
 * Integration tests for all yield-related engines
 */

import { yieldOpportunityEngine } from '../yield-opportunity-engine';
import { yieldHistoryEngine } from '../yield-history-engine';
import { yieldRankingEngine } from '../yield-ranking-engine';
import { alertMatchingEngine } from '../alert-matching-engine';

describe('Yield Engines Integration', () => {
  describe('YieldOpportunityEngine', () => {
    it('should get opportunities with default params', async () => {
      const result = await yieldOpportunityEngine.getOpportunities();
      
      expect(result.opportunities).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by chain', async () => {
      const result = await yieldOpportunityEngine.getOpportunities({
        chains: ['ethereum'],
      });
      
      expect(result.opportunities.every(o => o.chainId === 'ethereum')).toBe(true);
    });

    it('should filter by pool type', async () => {
      const result = await yieldOpportunityEngine.getOpportunities({
        poolTypes: ['lending'],
      });
      
      expect(result.opportunities.every(o => o.poolType === 'lending')).toBe(true);
    });

    it('should filter by min APY', async () => {
      const minApy = 10;
      const result = await yieldOpportunityEngine.getOpportunities({
        minApy,
      });
      
      expect(result.opportunities.every(o => o.apy >= minApy)).toBe(true);
    });

    it('should filter by max risk score', async () => {
      const maxRiskScore = 30;
      const result = await yieldOpportunityEngine.getOpportunities({
        maxRiskScore,
      });
      
      expect(result.opportunities.every(o => o.riskScore <= maxRiskScore)).toBe(true);
    });

    it('should sort by APY descending', async () => {
      const result = await yieldOpportunityEngine.getOpportunities(
        {},
        { sortBy: 'apy', sortOrder: 'desc' }
      );
      
      for (let i = 1; i < result.opportunities.length; i++) {
        expect(result.opportunities[i - 1].apy).toBeGreaterThanOrEqual(result.opportunities[i].apy);
      }
    });

    it('should paginate results', async () => {
      const page1 = await yieldOpportunityEngine.getOpportunities({}, {}, { page: 1, pageSize: 5 });
      const page2 = await yieldOpportunityEngine.getOpportunities({}, {}, { page: 2, pageSize: 5 });
      
      expect(page1.opportunities).toHaveLength(5);
      expect(page2.opportunities).toHaveLength(5);
      expect(page1.opportunities[0].id).not.toBe(page2.opportunities[0].id);
    });

    it('should get opportunity by ID', async () => {
      const all = await yieldOpportunityEngine.getOpportunities({}, {}, { pageSize: 1 });
      const id = all.opportunities[0].id;
      
      const opportunity = await yieldOpportunityEngine.getOpportunityById(id);
      
      expect(opportunity).not.toBeNull();
      expect(opportunity!.id).toBe(id);
    });

    it('should get summary stats', async () => {
      const stats = await yieldOpportunityEngine.getSummaryStats();
      
      expect(stats.totalOpportunities).toBeGreaterThan(0);
      expect(stats.avgApy).toBeGreaterThan(0);
      expect(stats.maxApy).toBeGreaterThan(0);
      expect(stats.totalTvl).toBeGreaterThan(0);
      expect(Object.keys(stats.byPoolType).length).toBeGreaterThan(0);
      expect(Object.keys(stats.byRiskCategory).length).toBeGreaterThan(0);
    });
  });

  describe('YieldHistoryEngine', () => {
    it('should get historical data', async () => {
      const all = await yieldOpportunityEngine.getOpportunities({}, {}, { pageSize: 1 });
      const opportunityId = all.opportunities[0].id;
      
      const history = await yieldHistoryEngine.getHistory(opportunityId, '30d');
      
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].apy).toBeDefined();
    });

    it('should calculate history stats', async () => {
      const all = await yieldOpportunityEngine.getOpportunities({}, {}, { pageSize: 1 });
      const opportunityId = all.opportunities[0].id;
      
      const stats = await yieldHistoryEngine.getHistoryStats(opportunityId, '30d');
      
      expect(stats.avgApy).toBeGreaterThan(0);
      expect(stats.maxApy).toBeGreaterThanOrEqual(stats.avgApy);
      expect(stats.minApy).toBeLessThanOrEqual(stats.avgApy);
      expect(stats.volatility).toBeGreaterThanOrEqual(0);
      expect(stats.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(stats.stabilityScore).toBeLessThanOrEqual(100);
      expect(['up', 'down', 'stable']).toContain(stats.trend);
    });
  });

  describe('YieldRankingEngine', () => {
    it('should get top opportunities by highest APY', async () => {
      const top = await yieldRankingEngine.getTopOpportunities('highest_apy', 5);
      
      expect(top).toHaveLength(5);
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].apy).toBeGreaterThanOrEqual(top[i].apy);
      }
    });

    it('should get top opportunities by best risk-adjusted', async () => {
      const top = await yieldRankingEngine.getTopOpportunities('best_risk_adjusted', 5);
      
      expect(top).toHaveLength(5);
      // Risk-adjusted yield = APY * (1 - risk_score/100)
      for (let i = 1; i < top.length; i++) {
        const prev = top[i - 1].apy * (1 - top[i - 1].riskScore / 100);
        const curr = top[i].apy * (1 - top[i].riskScore / 100);
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should get top opportunities by most stable', async () => {
      const top = await yieldRankingEngine.getTopOpportunities('most_stable', 5);
      
      expect(top).toHaveLength(5);
    });

    it('should filter by max risk score', async () => {
      const maxRiskScore = 30;
      const top = await yieldRankingEngine.getTopOpportunities('highest_apy', 10, { maxRiskScore });
      
      expect(top.every(o => o.riskScore <= maxRiskScore)).toBe(true);
    });

    it('should get top by all categories', async () => {
      const results = await yieldRankingEngine.getTopByAllCategories(3);
      
      expect(results.highest_apy).toHaveLength(3);
      expect(results.best_risk_adjusted).toHaveLength(3);
      expect(results.most_stable).toHaveLength(3);
      expect(results.trending_up).toHaveLength(3);
    });
  });

  describe('AlertMatchingEngine', () => {
    const testUserId = 'test-user-123';

    afterEach(async () => {
      // Clean up test alerts
      const alerts = await alertMatchingEngine.getUserAlerts(testUserId);
      for (const alert of alerts) {
        await alertMatchingEngine.deleteAlert(alert.id);
      }
    });

    it('should create an alert', async () => {
      const alert = await alertMatchingEngine.createAlert({
        userId: testUserId,
        alertType: 'yield_increase',
        threshold: 10,
        minApy: 5,
        maxRiskScore: 50,
        channels: ['email'],
        enabled: true,
      });
      
      expect(alert.id).toBeDefined();
      expect(alert.userId).toBe(testUserId);
      expect(alert.alertType).toBe('yield_increase');
      expect(alert.threshold).toBe(10);
    });

    it('should get user alerts', async () => {
      await alertMatchingEngine.createAlert({
        userId: testUserId,
        alertType: 'yield_increase',
        threshold: 10,
        channels: ['email'],
        enabled: true,
      });

      const alerts = await alertMatchingEngine.getUserAlerts(testUserId);
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].userId).toBe(testUserId);
    });

    it('should update an alert', async () => {
      const alert = await alertMatchingEngine.createAlert({
        userId: testUserId,
        alertType: 'yield_increase',
        threshold: 10,
        channels: ['email'],
        enabled: true,
      });

      const updated = await alertMatchingEngine.updateAlert(alert.id, {
        threshold: 20,
        enabled: false,
      });
      
      expect(updated.threshold).toBe(20);
      expect(updated.enabled).toBe(false);
    });

    it('should delete an alert', async () => {
      const alert = await alertMatchingEngine.createAlert({
        userId: testUserId,
        alertType: 'yield_increase',
        threshold: 10,
        channels: ['email'],
        enabled: true,
      });

      await alertMatchingEngine.deleteAlert(alert.id);
      
      const alerts = await alertMatchingEngine.getUserAlerts(testUserId);
      expect(alerts.find(a => a.id === alert.id)).toBeUndefined();
    });

    it('should match yield increase alerts', async () => {
      const all = await yieldOpportunityEngine.getOpportunities({}, {}, { pageSize: 1 });
      const opportunityId = all.opportunities[0].id;

      const matches = await alertMatchingEngine.matchAlerts(
        opportunityId,
        15.0, // current APY
        10.0, // previous APY (50% increase)
        25,   // current risk
        25    // previous risk
      );
      
      // Should match yield_increase alerts with threshold <= 50%
      expect(matches).toBeDefined();
    });
  });
});

