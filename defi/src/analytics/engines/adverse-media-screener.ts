/**
 * Adverse Media Screener Engine
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 6: Adverse Media Screening
 * 
 * Screens for adverse media mentions:
 * - News source monitoring
 * - Negative mention detection (fraud, crime, sanctions)
 * - Severity classification (low, medium, high)
 * - Source credibility scoring
 */

export interface AdverseMediaMention {
  source: string;
  title: string;
  category: 'fraud' | 'scam' | 'money_laundering' | 'sanctions' | 'crime' | 'other';
  severity: 'low' | 'medium' | 'high';
  credibility: number;
  publishedDate: Date;
  url?: string;
}

export interface AdverseMediaResult {
  match: boolean;
  matchCount: number;
  highSeverityCount: number;
  categories: string[];
  details: AdverseMediaMention[];
}

export interface AdverseMediaScreeningResult {
  walletAddress: string;
  match: boolean;
  matchCount: number;
  highSeverityCount: number;
  categories: string[];
  mentions: AdverseMediaMention[];
  overallSeverity: 'low' | 'medium' | 'high';
  credibilityScore: number;
  timestamp: Date;
}

/**
 * Mock adverse media database
 */
const ADVERSE_MEDIA_DATABASE = new Map<string, AdverseMediaMention[]>([
  ['0x7890123456789012345678901234567890123456', [
    {
      source: 'News A',
      title: 'Wallet linked to fraud scheme',
      category: 'fraud',
      severity: 'high',
      credibility: 85,
      publishedDate: new Date('2024-01-15'),
      url: 'https://news-a.com/article1',
    },
    {
      source: 'News B',
      title: 'Investigation into scam operations',
      category: 'scam',
      severity: 'medium',
      credibility: 75,
      publishedDate: new Date('2024-02-01'),
      url: 'https://news-b.com/article2',
    },
    {
      source: 'News C',
      title: 'Suspicious activity reported',
      category: 'other',
      severity: 'low',
      credibility: 60,
      publishedDate: new Date('2024-03-01'),
      url: 'https://news-c.com/article3',
    },
  ]],
  ['0x8901234567890123456789012345678901234567', [
    {
      source: 'News C',
      title: 'Money laundering allegations',
      category: 'money_laundering',
      severity: 'high',
      credibility: 90,
      publishedDate: new Date('2024-01-20'),
      url: 'https://news-c.com/article4',
    },
    {
      source: 'News D',
      title: 'Sanctions evasion suspected',
      category: 'sanctions',
      severity: 'high',
      credibility: 85,
      publishedDate: new Date('2024-02-10'),
      url: 'https://news-d.com/article5',
    },
    {
      source: 'News E',
      title: 'Criminal investigation ongoing',
      category: 'crime',
      severity: 'medium',
      credibility: 80,
      publishedDate: new Date('2024-03-05'),
      url: 'https://news-e.com/article6',
    },
    {
      source: 'News F',
      title: 'Regulatory concerns raised',
      category: 'other',
      severity: 'medium',
      credibility: 70,
      publishedDate: new Date('2024-03-15'),
      url: 'https://news-f.com/article7',
    },
    {
      source: 'News G',
      title: 'Compliance violations reported',
      category: 'other',
      severity: 'low',
      credibility: 65,
      publishedDate: new Date('2024-04-01'),
      url: 'https://news-g.com/article8',
    },
  ]],
]);

/**
 * Adverse Media Screener Engine
 */
export class AdverseMediaScreener {
  private static instance: AdverseMediaScreener;

  private constructor() {}

  public static getInstance(): AdverseMediaScreener {
    if (!AdverseMediaScreener.instance) {
      AdverseMediaScreener.instance = new AdverseMediaScreener();
    }
    return AdverseMediaScreener.instance;
  }

  /**
   * Screen a wallet address for adverse media
   */
  public async screenWallet(walletAddress: string): Promise<AdverseMediaScreeningResult> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Check adverse media database
    const mentions = ADVERSE_MEDIA_DATABASE.get(normalizedAddress) || [];

    if (mentions.length === 0) {
      return {
        walletAddress: normalizedAddress,
        match: false,
        matchCount: 0,
        highSeverityCount: 0,
        categories: [],
        mentions: [],
        overallSeverity: 'low',
        credibilityScore: 0,
        timestamp: new Date(),
      };
    }

    // Calculate statistics
    const highSeverityCount = mentions.filter(m => m.severity === 'high').length;
    const categories = [...new Set(mentions.map(m => m.category))];
    const overallSeverity = this.calculateOverallSeverity(mentions);
    const credibilityScore = this.calculateCredibilityScore(mentions);

    return {
      walletAddress: normalizedAddress,
      match: true,
      matchCount: mentions.length,
      highSeverityCount,
      categories,
      mentions,
      overallSeverity,
      credibilityScore,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate overall severity based on mentions
   */
  private calculateOverallSeverity(mentions: AdverseMediaMention[]): 'low' | 'medium' | 'high' {
    const highCount = mentions.filter(m => m.severity === 'high').length;
    const mediumCount = mentions.filter(m => m.severity === 'medium').length;

    if (highCount >= 2) return 'high';
    if (highCount >= 1 || mediumCount >= 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate credibility score (0-100)
   */
  private calculateCredibilityScore(mentions: AdverseMediaMention[]): number {
    if (mentions.length === 0) return 0;

    const totalCredibility = mentions.reduce((sum, m) => sum + m.credibility, 0);
    return Math.round(totalCredibility / mentions.length);
  }

  /**
   * Batch screen multiple wallet addresses
   */
  public async screenWallets(walletAddresses: string[]): Promise<AdverseMediaScreeningResult[]> {
    const results: AdverseMediaScreeningResult[] = [];

    for (const address of walletAddresses) {
      const result = await this.screenWallet(address);
      results.push(result);
    }

    return results;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalAddresses: number;
    totalMentions: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    fraud: number;
    scam: number;
    moneyLaundering: number;
    sanctions: number;
    crime: number;
    other: number;
  } {
    let totalMentions = 0;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let lowSeverity = 0;
    let fraud = 0;
    let scam = 0;
    let moneyLaundering = 0;
    let sanctions = 0;
    let crime = 0;
    let other = 0;

    ADVERSE_MEDIA_DATABASE.forEach(mentions => {
      totalMentions += mentions.length;
      mentions.forEach(m => {
        if (m.severity === 'high') highSeverity++;
        if (m.severity === 'medium') mediumSeverity++;
        if (m.severity === 'low') lowSeverity++;
        if (m.category === 'fraud') fraud++;
        if (m.category === 'scam') scam++;
        if (m.category === 'money_laundering') moneyLaundering++;
        if (m.category === 'sanctions') sanctions++;
        if (m.category === 'crime') crime++;
        if (m.category === 'other') other++;
      });
    });

    return {
      totalAddresses: ADVERSE_MEDIA_DATABASE.size,
      totalMentions,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      fraud,
      scam,
      moneyLaundering,
      sanctions,
      crime,
      other,
    };
  }

  /**
   * Get mentions by category
   */
  public getMentionsByCategory(category: 'fraud' | 'scam' | 'money_laundering' | 'sanctions' | 'crime' | 'other'): AdverseMediaMention[] {
    const results: AdverseMediaMention[] = [];

    ADVERSE_MEDIA_DATABASE.forEach(mentions => {
      mentions.forEach(m => {
        if (m.category === category) {
          results.push(m);
        }
      });
    });

    return results;
  }

  /**
   * Get mentions by severity
   */
  public getMentionsBySeverity(severity: 'low' | 'medium' | 'high'): AdverseMediaMention[] {
    const results: AdverseMediaMention[] = [];

    ADVERSE_MEDIA_DATABASE.forEach(mentions => {
      mentions.forEach(m => {
        if (m.severity === severity) {
          results.push(m);
        }
      });
    });

    return results;
  }
}

