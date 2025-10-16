/**
 * Compliance Screening Engine
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 7: API Development (Engine Integration)
 * 
 * Comprehensive compliance screening combining:
 * - Sanctions screening
 * - AML monitoring
 * - KYC verification
 * - PEP screening
 * - Adverse media screening
 */

import { SanctionsScreener } from './sanctions-screener';
import { AMLMonitor } from './aml-monitor';
import { KYCVerifier } from './kyc-verifier';
import { PEPScreener } from './pep-screener';
import { AdverseMediaScreener } from './adverse-media-screener';

export interface ComplianceScreeningResult {
  walletAddress: string;
  screeningResult: 'clear' | 'flagged' | 'review_required';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  sanctions: {
    match: boolean;
    list: string | null;
    confidence: number;
  };
  aml: {
    riskScore: number;
    structuring: boolean;
    layering: boolean;
    highRiskJurisdiction: boolean;
  };
  kyc: {
    status: 'verified' | 'unverified' | 'pending';
    level: 'basic' | 'enhanced' | 'full' | null;
  };
  pep: {
    match: boolean;
    category: string | null;
    confidence: number;
  };
  adverseMedia: {
    match: boolean;
    count: number;
    severity: 'low' | 'medium' | 'high';
  };
  timestamp: Date;
}

/**
 * Compliance Screening Engine
 */
export class ComplianceScreeningEngine {
  private static instance: ComplianceScreeningEngine;
  private sanctionsScreener: SanctionsScreener;
  private amlMonitor: AMLMonitor;
  private kycVerifier: KYCVerifier;
  private pepScreener: PEPScreener;
  private adverseMediaScreener: AdverseMediaScreener;

  private constructor() {
    this.sanctionsScreener = SanctionsScreener.getInstance();
    this.amlMonitor = AMLMonitor.getInstance();
    this.kycVerifier = KYCVerifier.getInstance();
    this.pepScreener = PEPScreener.getInstance();
    this.adverseMediaScreener = AdverseMediaScreener.getInstance();
  }

  public static getInstance(): ComplianceScreeningEngine {
    if (!ComplianceScreeningEngine.instance) {
      ComplianceScreeningEngine.instance = new ComplianceScreeningEngine();
    }
    return ComplianceScreeningEngine.instance;
  }

  /**
   * Perform comprehensive compliance screening
   */
  public async screenWallet(walletAddress: string): Promise<ComplianceScreeningResult> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Run all screenings in parallel
    const [sanctionsResult, amlResult, kycResult, pepResult, adverseMediaResult] = await Promise.all([
      this.sanctionsScreener.screenWallet(normalizedAddress),
      this.amlMonitor.monitorWallet(normalizedAddress),
      this.kycVerifier.verifyWallet(normalizedAddress),
      this.pepScreener.screenWallet(normalizedAddress),
      this.adverseMediaScreener.screenWallet(normalizedAddress),
    ]);

    // Calculate overall risk score
    const riskScore = this.calculateOverallRiskScore({
      sanctions: sanctionsResult.match ? 100 : 0,
      aml: amlResult.riskScore,
      pep: pepResult.match ? pepResult.confidence : 0,
      adverseMedia: adverseMediaResult.match ? this.severityToScore(adverseMediaResult.overallSeverity) : 0,
    });

    // Determine risk level
    const riskLevel = this.categorizeRisk(riskScore);

    // Determine screening result
    const screeningResult = this.determineScreeningResult({
      sanctionsMatch: sanctionsResult.match,
      amlRiskScore: amlResult.riskScore,
      pepMatch: pepResult.match,
      adverseMediaMatch: adverseMediaResult.match,
      kycStatus: kycResult.status,
    });

    return {
      walletAddress: normalizedAddress,
      screeningResult,
      riskLevel,
      riskScore: Math.round(riskScore * 100) / 100,
      sanctions: {
        match: sanctionsResult.match,
        list: sanctionsResult.sanctionsList,
        confidence: sanctionsResult.confidence,
      },
      aml: {
        riskScore: amlResult.riskScore,
        structuring: amlResult.structuring,
        layering: amlResult.layering,
        highRiskJurisdiction: amlResult.highRiskJurisdiction,
      },
      kyc: {
        status: kycResult.status,
        level: kycResult.level,
      },
      pep: {
        match: pepResult.match,
        category: pepResult.category,
        confidence: pepResult.confidence,
      },
      adverseMedia: {
        match: adverseMediaResult.match,
        count: adverseMediaResult.matchCount,
        severity: adverseMediaResult.overallSeverity,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateOverallRiskScore(scores: {
    sanctions: number;
    aml: number;
    pep: number;
    adverseMedia: number;
  }): number {
    // Weighted average
    const weights = {
      sanctions: 0.40, // 40%
      aml: 0.30,       // 30%
      pep: 0.15,       // 15%
      adverseMedia: 0.15, // 15%
    };

    return (
      scores.sanctions * weights.sanctions +
      scores.aml * weights.aml +
      scores.pep * weights.pep +
      scores.adverseMedia * weights.adverseMedia
    );
  }

  /**
   * Convert severity to score
   */
  private severityToScore(severity: 'low' | 'medium' | 'high'): number {
    const severityMap = {
      low: 25,
      medium: 50,
      high: 75,
    };
    return severityMap[severity];
  }

  /**
   * Categorize risk level
   */
  private categorizeRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Determine screening result
   */
  private determineScreeningResult(params: {
    sanctionsMatch: boolean;
    amlRiskScore: number;
    pepMatch: boolean;
    adverseMediaMatch: boolean;
    kycStatus: 'verified' | 'unverified' | 'pending';
  }): 'clear' | 'flagged' | 'review_required' {
    // Flagged if sanctions match
    if (params.sanctionsMatch) {
      return 'flagged';
    }

    // Flagged if high AML risk
    if (params.amlRiskScore >= 75) {
      return 'flagged';
    }

    // Review required if PEP match or adverse media
    if (params.pepMatch || params.adverseMediaMatch) {
      return 'review_required';
    }

    // Review required if KYC pending
    if (params.kycStatus === 'pending') {
      return 'review_required';
    }

    // Review required if medium AML risk
    if (params.amlRiskScore >= 50) {
      return 'review_required';
    }

    // Clear otherwise
    return 'clear';
  }

  /**
   * Batch screen multiple wallets
   */
  public async screenWallets(walletAddresses: string[]): Promise<ComplianceScreeningResult[]> {
    const results: ComplianceScreeningResult[] = [];

    for (const address of walletAddresses) {
      const result = await this.screenWallet(address);
      results.push(result);
    }

    return results;
  }

  /**
   * Get screening statistics
   */
  public getStatistics(): {
    sanctions: any;
    aml: any;
    kyc: any;
    pep: any;
    adverseMedia: any;
  } {
    return {
      sanctions: this.sanctionsScreener.getStatistics(),
      aml: {}, // AML monitor doesn't have statistics method
      kyc: this.kycVerifier.getStatistics(),
      pep: this.pepScreener.getStatistics(),
      adverseMedia: this.adverseMediaScreener.getStatistics(),
    };
  }
}

