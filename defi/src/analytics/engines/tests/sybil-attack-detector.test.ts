/**
 * Unit Tests for SybilAttackDetector
 * Story: 3.2.2 - Suspicious Activity Detection
 */

import { SybilAttackDetector, WalletInfo, WalletClusterEvidence, BehaviorSimilarityEvidence, AirdropFarmingEvidence, CoordinatedVotingEvidence } from '../sybil-attack-detector';

describe('SybilAttackDetector', () => {
  let detector: SybilAttackDetector;

  beforeAll(() => {
    detector = SybilAttackDetector.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SybilAttackDetector.getInstance();
      const instance2 = SybilAttackDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('detectWalletClustering', () => {
    it('should detect cluster when >10 wallets have >0.8 similarity', () => {
      const now = new Date();
      const wallets: WalletInfo[] = Array(15).fill(null).map((_, i) => ({
        address: `0xwallet${i}`,
        creation_time: new Date(now.getTime() + i * 60000), // 1 minute apart
        balance: 1000 + i * 10,
        transaction_count: 50 + i,
        last_activity: new Date(now.getTime() + i * 120000),
      }));

      const result = detector.detectWalletClustering(wallets);
      expect(result).not.toBeNull();
      expect(result!.cluster_size).toBeGreaterThanOrEqual(10);
    });

    it('should not detect cluster when <10 wallets', () => {
      const now = new Date();
      const wallets: WalletInfo[] = Array(5).fill(null).map((_, i) => ({
        address: `0xwallet${i}`,
        creation_time: new Date(now.getTime() + i * 60000),
        balance: 1000,
        transaction_count: 50,
        last_activity: new Date(now.getTime() + i * 120000),
      }));

      const result = detector.detectWalletClustering(wallets);
      expect(result).toBeNull();
    });

    it('should not detect cluster when similarity is low', () => {
      const now = new Date();
      const wallets: WalletInfo[] = Array(15).fill(null).map((_, i) => ({
        address: `0xwallet${i}`,
        creation_time: new Date(now.getTime() + i * 86400000), // 1 day apart
        balance: 1000 * (i + 1),
        transaction_count: 50 * (i + 1),
        last_activity: new Date(now.getTime() + i * 86400000),
      }));

      const result = detector.detectWalletClustering(wallets);
      expect(result).toBeNull();
    });
  });

  describe('calculateWalletClusteringConfidence', () => {
    it('should return high confidence for >50 wallets with >0.95 similarity', () => {
      const evidence: WalletClusterEvidence = {
        wallet_addresses: Array(60).fill('0x').map((_, i) => `0x${i}`),
        cluster_size: 60,
        average_similarity_score: 0.96,
        pattern_type: 'address_similarity',
      };

      const confidence = detector.calculateWalletClusteringConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 30-50 wallets with 0.9-0.95 similarity', () => {
      const evidence: WalletClusterEvidence = {
        wallet_addresses: Array(40).fill('0x').map((_, i) => `0x${i}`),
        cluster_size: 40,
        average_similarity_score: 0.92,
        pattern_type: 'address_similarity',
      };

      const confidence = detector.calculateWalletClusteringConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(95);
    });

    it('should return lower confidence for 10-30 wallets with 0.8-0.9 similarity', () => {
      const evidence: WalletClusterEvidence = {
        wallet_addresses: Array(20).fill('0x').map((_, i) => `0x${i}`),
        cluster_size: 20,
        average_similarity_score: 0.85,
        pattern_type: 'address_similarity',
      };

      const confidence = detector.calculateWalletClusteringConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(65);
      expect(confidence).toBeLessThan(85);
    });

    it('should cap confidence at 100', () => {
      const evidence: WalletClusterEvidence = {
        wallet_addresses: Array(100).fill('0x').map((_, i) => `0x${i}`),
        cluster_size: 100,
        average_similarity_score: 0.99,
        pattern_type: 'address_similarity',
      };

      const confidence = detector.calculateWalletClusteringConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateBehaviorSimilarityConfidence', () => {
    it('should return high confidence for >0.95 similarity with >3 patterns', () => {
      const evidence: BehaviorSimilarityEvidence = {
        wallet_addresses: Array(25).fill('0x').map((_, i) => `0x${i}`),
        similarity_score: 0.96,
        matching_patterns: ['same_gas_price', 'same_nonce_pattern', 'same_contracts', 'same_timing'],
        timeframe: 3600,
      };

      const confidence = detector.calculateBehaviorSimilarityConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 0.9-0.95 similarity with 1-3 patterns', () => {
      const evidence: BehaviorSimilarityEvidence = {
        wallet_addresses: Array(15).fill('0x').map((_, i) => `0x${i}`),
        similarity_score: 0.92,
        matching_patterns: ['same_gas_price', 'same_nonce_pattern'],
        timeframe: 3600,
      };

      const confidence = detector.calculateBehaviorSimilarityConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(95);
    });

    it('should cap confidence at 100', () => {
      const evidence: BehaviorSimilarityEvidence = {
        wallet_addresses: Array(30).fill('0x').map((_, i) => `0x${i}`),
        similarity_score: 0.99,
        matching_patterns: ['same_gas_price', 'same_nonce_pattern', 'same_contracts', 'same_timing', 'same_amounts'],
        timeframe: 3600,
      };

      const confidence = detector.calculateBehaviorSimilarityConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateAirdropFarmingConfidence', () => {
    it('should return high confidence for >50 claims with >0.9 timing similarity', () => {
      const evidence: AirdropFarmingEvidence = {
        wallet_addresses: Array(60).fill('0x').map((_, i) => `0x${i}`),
        airdrop_contract: '0xairdrop',
        claim_count: 60,
        claim_timing_similarity: 0.95,
        claim_amount_similarity: 0.92,
      };

      const confidence = detector.calculateAirdropFarmingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 30-50 claims with 0.8-0.9 timing similarity', () => {
      const evidence: AirdropFarmingEvidence = {
        wallet_addresses: Array(40).fill('0x').map((_, i) => `0x${i}`),
        airdrop_contract: '0xairdrop',
        claim_count: 40,
        claim_timing_similarity: 0.85,
        claim_amount_similarity: 0.82,
      };

      const confidence = detector.calculateAirdropFarmingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(95);
    });

    it('should cap confidence at 100', () => {
      const evidence: AirdropFarmingEvidence = {
        wallet_addresses: Array(100).fill('0x').map((_, i) => `0x${i}`),
        airdrop_contract: '0xairdrop',
        claim_count: 100,
        claim_timing_similarity: 0.99,
        claim_amount_similarity: 0.98,
      };

      const confidence = detector.calculateAirdropFarmingConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateCoordinatedVotingConfidence', () => {
    it('should return high confidence for >50 votes with >0.9 timing similarity and high voting power', () => {
      const evidence: CoordinatedVotingEvidence = {
        wallet_addresses: Array(60).fill('0x').map((_, i) => `0x${i}`),
        proposal_id: '0xproposal',
        vote_direction: 'for',
        vote_count: 60,
        voting_timing_similarity: 0.95,
        total_voting_power: 1500000,
      };

      const confidence = detector.calculateCoordinatedVotingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 30-50 votes with 0.8-0.9 timing similarity', () => {
      const evidence: CoordinatedVotingEvidence = {
        wallet_addresses: Array(40).fill('0x').map((_, i) => `0x${i}`),
        proposal_id: '0xproposal',
        vote_direction: 'for',
        vote_count: 40,
        voting_timing_similarity: 0.85,
        total_voting_power: 750000,
      };

      const confidence = detector.calculateCoordinatedVotingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(95);
    });

    it('should cap confidence at 100', () => {
      const evidence: CoordinatedVotingEvidence = {
        wallet_addresses: Array(100).fill('0x').map((_, i) => `0x${i}`),
        proposal_id: '0xproposal',
        vote_direction: 'for',
        vote_count: 100,
        voting_timing_similarity: 0.99,
        total_voting_power: 2000000,
      };

      const confidence = detector.calculateCoordinatedVotingConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });
});

