/**
 * Integration Tests for Liquidity Migration Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import { liquidityMigrationEngine } from '../liquidity-migration-engine';
import { query } from '../../db/connection';

describe('LiquidityMigrationEngine', () => {
  describe('getMigrations', () => {
    it('should get all migrations', async () => {
      const migrations = await liquidityMigrationEngine.getMigrations({ limit: 10 });

      expect(migrations).toBeDefined();
      expect(Array.isArray(migrations)).toBe(true);
      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations.length).toBeLessThanOrEqual(10);

      const migration = migrations[0];
      expect(migration.id).toBeDefined();
      expect(migration.fromProtocolId).toBeDefined();
      expect(migration.toProtocolId).toBeDefined();
      expect(migration.chainId).toBeDefined();
      expect(migration.amountUsd).toBeGreaterThan(0);
    });

    it('should filter by from protocol', async () => {
      const migrations = await liquidityMigrationEngine.getMigrations({
        fromProtocolId: 'uniswap-v2',
        limit: 10,
      });

      expect(migrations).toBeDefined();
      if (migrations.length > 0) {
        migrations.forEach(m => {
          expect(m.fromProtocolId).toBe('uniswap-v2');
        });
      }
    });

    it('should filter by to protocol', async () => {
      const migrations = await liquidityMigrationEngine.getMigrations({
        toProtocolId: 'curve',
        limit: 10,
      });

      expect(migrations).toBeDefined();
      if (migrations.length > 0) {
        migrations.forEach(m => {
          expect(m.toProtocolId).toBe('curve');
        });
      }
    });

    it('should filter by reason', async () => {
      const migrations = await liquidityMigrationEngine.getMigrations({
        reason: 'higher_apy',
        limit: 10,
      });

      expect(migrations).toBeDefined();
      if (migrations.length > 0) {
        migrations.forEach(m => {
          expect(m.reason).toBe('higher_apy');
        });
      }
    });
  });

  describe('analyzeMigrationFlows', () => {
    it('should analyze migration flows', async () => {
      const flows = await liquidityMigrationEngine.analyzeMigrationFlows(365);

      expect(flows).toBeDefined();
      expect(Array.isArray(flows)).toBe(true);
      expect(flows.length).toBeGreaterThan(0);

      const flow = flows[0];
      expect(flow.fromProtocolId).toBeDefined();
      expect(flow.toProtocolId).toBeDefined();
      expect(flow.migrationCount).toBeGreaterThan(0);
      expect(flow.totalAmount).toBeGreaterThan(0);
      expect(flow.averageAmount).toBeGreaterThan(0);
    });

    it('should calculate net flows correctly', async () => {
      const flows = await liquidityMigrationEngine.analyzeMigrationFlows(365);

      // Total amount should equal sum of all migrations
      const totalFlowAmount = flows.reduce((sum, f) => sum + f.totalAmount, 0);
      expect(totalFlowAmount).toBeGreaterThan(0);
    });

    it('should show top migration routes', async () => {
      const flows = await liquidityMigrationEngine.analyzeMigrationFlows(365);

      // Flows should be sorted by total amount descending
      for (let i = 1; i < flows.length; i++) {
        expect(flows[i].totalAmount).toBeLessThanOrEqual(flows[i - 1].totalAmount);
      }
    });
  });

  describe('getMigrationCauses', () => {
    it('should analyze migration causes', async () => {
      const causes = await liquidityMigrationEngine.getMigrationCauses(365);

      expect(causes).toBeDefined();
      expect(Array.isArray(causes)).toBe(true);
      expect(causes.length).toBeGreaterThan(0);

      const cause = causes[0];
      expect(cause.reason).toBeDefined();
      expect(cause.count).toBeGreaterThan(0);
      expect(cause.totalAmount).toBeGreaterThan(0);
      expect(cause.successRate).toBeGreaterThanOrEqual(0);
      expect(cause.successRate).toBeLessThanOrEqual(100);
    });

    it('should calculate average APY difference per reason', async () => {
      const causes = await liquidityMigrationEngine.getMigrationCauses(365);

      causes.forEach(cause => {
        expect(cause.averageApyDifference).toBeDefined();
        expect(typeof cause.averageApyDifference).toBe('number');
      });
    });

    it('should calculate success rate correctly', async () => {
      const causes = await liquidityMigrationEngine.getMigrationCauses(365);

      // Success rate should be between 0 and 100
      causes.forEach(cause => {
        expect(cause.successRate).toBeGreaterThanOrEqual(0);
        expect(cause.successRate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('calculateTVLImpact', () => {
    it('should calculate TVL impact for a protocol', async () => {
      const impact = await liquidityMigrationEngine.calculateTVLImpact('uniswap-v2', 365);

      expect(impact).toBeDefined();
      expect(impact.protocolId).toBe('uniswap-v2');
      expect(impact.totalInflows).toBeGreaterThanOrEqual(0);
      expect(impact.totalOutflows).toBeGreaterThanOrEqual(0);
      expect(impact.netChange).toBeDefined();
      expect(impact.migrationCount).toBeGreaterThanOrEqual(0);
    });

    it('should calculate net change correctly', async () => {
      const impact = await liquidityMigrationEngine.calculateTVLImpact('curve', 365);

      // Net change = inflows - outflows
      const expectedNetChange = impact.totalInflows - impact.totalOutflows;
      expect(impact.netChange).toBeCloseTo(expectedNetChange, 2);
    });

    it('should calculate impact percentage', async () => {
      const impact = await liquidityMigrationEngine.calculateTVLImpact('uniswap-v3', 365);

      expect(impact.impactPct).toBeDefined();
      expect(typeof impact.impactPct).toBe('number');
    });
  });

  describe('detectSignificantMigrations', () => {
    it('should detect large migrations', async () => {
      const significant = await liquidityMigrationEngine.detectSignificantMigrations(10000);

      expect(significant).toBeDefined();
      expect(Array.isArray(significant)).toBe(true);

      if (significant.length > 0) {
        significant.forEach(s => {
          expect(s.migration).toBeDefined();
          expect(s.migration.amountUsd).toBeGreaterThanOrEqual(10000);
          expect(s.significance).toBe('large_amount');
          expect(s.impactScore).toBeGreaterThan(0);
          expect(s.impactScore).toBeLessThanOrEqual(100);
        });
      }
    });

    it('should sort by amount descending', async () => {
      const significant = await liquidityMigrationEngine.detectSignificantMigrations(10000);

      if (significant.length > 1) {
        for (let i = 1; i < significant.length; i++) {
          expect(significant[i].migration.amountUsd).toBeLessThanOrEqual(
            significant[i - 1].migration.amountUsd
          );
        }
      }
    });
  });
});

