/**
 * Integration Tests for Protocol Performance Collector
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 2 - Data Collection Pipeline
 * 
 * These tests require a running PostgreSQL database with test data.
 */

import { ProtocolPerformanceCollector } from '../protocol-performance-collector';
import { query, closePool } from '../../db/connection';
import { CollectorOptions } from '../types';

describe('ProtocolPerformanceCollector Integration Tests', () => {
  let collector: ProtocolPerformanceCollector;
  
  beforeAll(async () => {
    collector = new ProtocolPerformanceCollector();
    
    // Ensure database tables exist
    // Migration should have been run before tests
  });
  
  afterAll(async () => {
    await closePool();
  });
  
  describe('collect()', () => {
    it('should collect metrics for all protocols', async () => {
      const options: CollectorOptions = {
        skip_existing: false,
      };
      
      const results = await collector.collect(options);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Check result structure
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('success');
      expect(firstResult).toHaveProperty('protocol_id');
      expect(firstResult).toHaveProperty('timestamp');
      expect(firstResult).toHaveProperty('metrics_collected');
      expect(firstResult).toHaveProperty('duration_ms');
    }, 60000); // 60 second timeout
    
    it('should collect metrics for specific protocols', async () => {
      const options: CollectorOptions = {
        protocol_ids: ['uniswap', 'aave'],
        skip_existing: false,
      };
      
      const results = await collector.collect(options);
      
      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      
      const protocolIds = results.map(r => r.protocol_id);
      expect(protocolIds).toContain('uniswap');
      expect(protocolIds).toContain('aave');
    }, 30000);
    
    it('should skip existing data when skip_existing is true', async () => {
      // First collection
      const options1: CollectorOptions = {
        protocol_ids: ['uniswap'],
        skip_existing: false,
      };
      
      await collector.collect(options1);
      
      // Second collection with skip_existing
      const options2: CollectorOptions = {
        protocol_ids: ['uniswap'],
        skip_existing: true,
      };
      
      const results = await collector.collect(options2);
      
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].metrics_collected).toContain('skipped');
    }, 30000);
    
    it('should handle errors gracefully', async () => {
      const options: CollectorOptions = {
        protocol_ids: ['non-existent-protocol-xyz'],
        skip_existing: false,
      };
      
      const results = await collector.collect(options);
      
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errors).toBeDefined();
      expect(results[0].errors!.length).toBeGreaterThan(0);
    }, 30000);
  });
  
  describe('Data Storage', () => {
    it('should store metrics in protocol_performance_metrics table', async () => {
      const options: CollectorOptions = {
        protocol_ids: ['uniswap'],
        skip_existing: false,
      };
      
      await collector.collect(options);
      
      // Query database to verify data was stored
      const result = await query(`
        SELECT * FROM protocol_performance_metrics
        WHERE protocol_id = 'uniswap'
        ORDER BY timestamp DESC
        LIMIT 1
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const metrics = result.rows[0];
      expect(metrics).toHaveProperty('protocol_id');
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics.protocol_id).toBe('uniswap');
    }, 30000);
    
    it('should store valid metric values', async () => {
      const options: CollectorOptions = {
        protocol_ids: ['uniswap'],
        skip_existing: false,
      };
      
      await collector.collect(options);
      
      // Query database to verify metric values
      const result = await query(`
        SELECT * FROM protocol_performance_metrics
        WHERE protocol_id = 'uniswap'
        ORDER BY timestamp DESC
        LIMIT 1
      `);
      
      const metrics = result.rows[0];
      
      // Check that numeric fields are valid (not NaN, not negative where shouldn't be)
      if (metrics.apy_7d !== null) {
        expect(typeof metrics.apy_7d).toBe('number');
        expect(isNaN(metrics.apy_7d)).toBe(false);
      }
      
      if (metrics.dau !== null) {
        expect(typeof metrics.dau).toBe('number');
        expect(metrics.dau).toBeGreaterThanOrEqual(0);
      }
      
      if (metrics.wau !== null) {
        expect(typeof metrics.wau).toBe('number');
        expect(metrics.wau).toBeGreaterThanOrEqual(0);
      }
      
      if (metrics.mau !== null) {
        expect(typeof metrics.mau).toBe('number');
        expect(metrics.mau).toBeGreaterThanOrEqual(0);
      }
    }, 30000);
  });
  
  describe('Performance', () => {
    it('should complete collection within reasonable time', async () => {
      const startTime = Date.now();
      
      const options: CollectorOptions = {
        protocol_ids: ['uniswap', 'aave', 'compound'],
        skip_existing: false,
      };
      
      await collector.collect(options);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 30 seconds for 3 protocols
      expect(duration).toBeLessThan(30000);
    }, 35000);
  });
  
  describe('Error Handling', () => {
    it('should continue collection even if one protocol fails', async () => {
      const options: CollectorOptions = {
        protocol_ids: ['uniswap', 'non-existent-protocol', 'aave'],
        skip_existing: false,
      };
      
      const results = await collector.collect(options);
      
      expect(results.length).toBe(3);
      
      // Check that at least some succeeded
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
      
      // Check that the non-existent protocol failed
      const failedResult = results.find(r => r.protocol_id === 'non-existent-protocol');
      expect(failedResult).toBeDefined();
      expect(failedResult!.success).toBe(false);
    }, 30000);
  });
});

