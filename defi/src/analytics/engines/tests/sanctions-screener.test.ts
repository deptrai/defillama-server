/**
 * Sanctions Screener Engine Tests
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 2: Sanctions Screening
 */

import { SanctionsScreener } from '../sanctions-screener';

describe('SanctionsScreener', () => {
  let screener: SanctionsScreener;

  beforeAll(() => {
    screener = SanctionsScreener.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SanctionsScreener.getInstance();
      const instance2 = SanctionsScreener.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('OFAC SDN Screening', () => {
    it('should detect OFAC sanctioned address', async () => {
      const result = await screener.screenWallet('0x3456789012345678901234567890123456789012');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('OFAC SDN');
      expect(result.confidence).toBe(100);
      expect(result.entity).toBe('Sanctioned Entity A');
      expect(result.program).toBe('CYBER2');
      expect(result.details).toBeDefined();
      expect(result.details.list).toBe('OFAC SDN');
    });

    it('should detect another OFAC sanctioned address', async () => {
      const result = await screener.screenWallet('0x5555555555555555555555555555555555555555');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('OFAC SDN');
      expect(result.confidence).toBe(100);
      expect(result.entity).toBe('Sanctioned Entity C');
      expect(result.program).toBe('IRAN');
    });

    it('should handle case-insensitive addresses', async () => {
      const result = await screener.screenWallet('0X3456789012345678901234567890123456789012');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('OFAC SDN');
    });
  });

  describe('UN Sanctions Screening', () => {
    it('should detect UN sanctioned address', async () => {
      const result = await screener.screenWallet('0x4567890123456789012345678901234567890123');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('UN Sanctions');
      expect(result.confidence).toBe(100);
      expect(result.entity).toBe('Sanctioned Entity B');
      expect(result.program).toBe('DPRK');
      expect(result.details).toBeDefined();
      expect(result.details.list).toBe('UN Sanctions');
    });

    it('should detect another UN sanctioned address', async () => {
      const result = await screener.screenWallet('0x8888888888888888888888888888888888888888');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('UN Sanctions');
      expect(result.confidence).toBe(100);
    });
  });

  describe('EU Sanctions Screening', () => {
    it('should detect EU sanctioned address', async () => {
      const result = await screener.screenWallet('0xabcdef0123456789abcdef0123456789abcdef01');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('EU Sanctions');
      expect(result.confidence).toBe(100);
      expect(result.entity).toBe('EU Sanctioned Entity');
      expect(result.program).toBe('RUSSIA');
      expect(result.details).toBeDefined();
      expect(result.details.list).toBe('EU Sanctions');
    });

    it('should detect another EU sanctioned address', async () => {
      const result = await screener.screenWallet('0x9999999999999999999999999999999999999999');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('EU Sanctions');
      expect(result.confidence).toBe(100);
    });
  });

  describe('Clean Addresses', () => {
    it('should return no match for clean address', async () => {
      const result = await screener.screenWallet('0x1234567890123456789012345678901234567890');
      
      expect(result.match).toBe(false);
      expect(result.sanctionsList).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.entity).toBeUndefined();
      expect(result.program).toBeUndefined();
    });

    it('should return no match for another clean address', async () => {
      const result = await screener.screenWallet('0x2345678901234567890123456789012345678901');
      
      expect(result.match).toBe(false);
      expect(result.sanctionsList).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should return no match for random address', async () => {
      const result = await screener.screenWallet('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      
      expect(result.match).toBe(false);
      expect(result.sanctionsList).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  describe('Batch Screening', () => {
    it('should screen multiple addresses', async () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890', // Clean
        '0x3456789012345678901234567890123456789012', // OFAC
        '0x4567890123456789012345678901234567890123', // UN
        '0x2345678901234567890123456789012345678901', // Clean
        '0xabcdef0123456789abcdef0123456789abcdef01', // EU
      ];

      const results = await screener.screenWallets(addresses);
      
      expect(results).toHaveLength(5);
      expect(results[0].match).toBe(false);
      expect(results[1].match).toBe(true);
      expect(results[1].sanctionsList).toBe('OFAC SDN');
      expect(results[2].match).toBe(true);
      expect(results[2].sanctionsList).toBe('UN Sanctions');
      expect(results[3].match).toBe(false);
      expect(results[4].match).toBe(true);
      expect(results[4].sanctionsList).toBe('EU Sanctions');
    });

    it('should handle empty array', async () => {
      const results = await screener.screenWallets([]);
      expect(results).toHaveLength(0);
    });

    it('should handle single address', async () => {
      const results = await screener.screenWallets(['0x3456789012345678901234567890123456789012']);
      expect(results).toHaveLength(1);
      expect(results[0].match).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const stats = screener.getStatistics();
      
      expect(stats.ofacCount).toBeGreaterThan(0);
      expect(stats.unCount).toBeGreaterThan(0);
      expect(stats.euCount).toBeGreaterThan(0);
      expect(stats.totalCount).toBe(stats.ofacCount + stats.unCount + stats.euCount);
    });

    it('should have at least 3 OFAC addresses', () => {
      const stats = screener.getStatistics();
      expect(stats.ofacCount).toBeGreaterThanOrEqual(3);
    });

    it('should have at least 2 UN addresses', () => {
      const stats = screener.getStatistics();
      expect(stats.unCount).toBeGreaterThanOrEqual(2);
    });

    it('should have at least 2 EU addresses', () => {
      const stats = screener.getStatistics();
      expect(stats.euCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Response Format', () => {
    it('should include timestamp in response', async () => {
      const result = await screener.screenWallet('0x1234567890123456789012345678901234567890');
      
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include wallet address in response', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const result = await screener.screenWallet(address);
      
      expect(result.walletAddress).toBe(address.toLowerCase());
    });

    it('should normalize address to lowercase', async () => {
      const result = await screener.screenWallet('0X1234567890123456789012345678901234567890');
      
      expect(result.walletAddress).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('Performance', () => {
    it('should screen address in less than 100ms', async () => {
      const start = Date.now();
      await screener.screenWallet('0x1234567890123456789012345678901234567890');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
    });

    it('should screen 10 addresses in less than 500ms', async () => {
      const addresses = Array(10).fill(0).map((_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      const start = Date.now();
      await screener.screenWallets(addresses);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle address with mixed case', async () => {
      const result = await screener.screenWallet('0xAbCdEf0123456789AbCdEf0123456789AbCdEf01');
      
      expect(result.match).toBe(true);
      expect(result.sanctionsList).toBe('EU Sanctions');
    });

    it('should handle address with leading zeros', async () => {
      const result = await screener.screenWallet('0x0000000000000000000000000000000000000000');
      
      expect(result.match).toBe(false);
    });

    it('should handle address with all same characters', async () => {
      const result = await screener.screenWallet('0xffffffffffffffffffffffffffffffffffffffff');
      
      expect(result.match).toBe(false);
    });
  });
});

