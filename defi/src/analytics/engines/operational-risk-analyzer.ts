/**
 * Operational Risk Analyzer Engine
 * Story: 3.2.1 - Protocol Risk Assessment
 * 
 * Analyzes operational risk based on:
 * - Protocol age
 * - Team reputation and doxxed status
 * - Incident history
 */

import { query } from '../db/connection';

export interface OperationalRiskMetrics {
  protocolId: string;
  protocolAgeDays: number | null;
  launchDate: string | null;
  teamDoxxed: boolean;
  teamReputationScore: number | null;
  teamSize: number | null;
  incidentCount: number;
  criticalIncidents: number;
  highIncidents: number;
  mediumIncidents: number;
  lowIncidents: number;
  lastIncidentDate: string | null;
  operationalRiskScore: number;
  breakdown: {
    ageScore: number;
    teamScore: number;
    incidentScore: number;
  };
}

export class OperationalRiskAnalyzer {
  private static instance: OperationalRiskAnalyzer;

  private constructor() {}

  public static getInstance(): OperationalRiskAnalyzer {
    if (!OperationalRiskAnalyzer.instance) {
      OperationalRiskAnalyzer.instance = new OperationalRiskAnalyzer();
    }
    return OperationalRiskAnalyzer.instance;
  }

  public async analyzeOperationalRisk(protocolId: string): Promise<OperationalRiskMetrics> {
    const result = await query<any>(
      `SELECT * FROM protocol_operational_risks WHERE protocol_id = $1`,
      [protocolId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Operational risk data not found for protocol: ${protocolId}`);
    }

    const data = result.rows[0];

    const ageScore = this.calculateAgeScore(data.protocol_age_days);
    const teamScore = this.calculateTeamScore(
      data.team_doxxed,
      data.team_reputation_score,
      data.team_size
    );
    const incidentScore = this.calculateIncidentScore(
      data.critical_incidents,
      data.high_incidents,
      data.medium_incidents,
      data.low_incidents
    );

    const operationalRiskScore = this.calculateOverallScore(
      ageScore,
      teamScore,
      incidentScore
    );

    return {
      protocolId: data.protocol_id,
      protocolAgeDays: data.protocol_age_days,
      launchDate: data.launch_date,
      teamDoxxed: data.team_doxxed,
      teamReputationScore: data.team_reputation_score ? parseFloat(data.team_reputation_score) : null,
      teamSize: data.team_size,
      incidentCount: data.incident_count,
      criticalIncidents: data.critical_incidents,
      highIncidents: data.high_incidents,
      mediumIncidents: data.medium_incidents,
      lowIncidents: data.low_incidents,
      lastIncidentDate: data.last_incident_date,
      operationalRiskScore: Math.round(operationalRiskScore * 100) / 100,
      breakdown: {
        ageScore: Math.round(ageScore * 100) / 100,
        teamScore: Math.round(teamScore * 100) / 100,
        incidentScore: Math.round(incidentScore * 100) / 100,
      },
    };
  }

  public calculateAgeScore(ageDays: number | null): number {
    if (ageDays === null) return 70;

    if (ageDays >= 730) return 10; // >2 years
    else if (ageDays >= 365) return 25; // 1-2 years
    else if (ageDays >= 180) return 45; // 6-12 months
    else if (ageDays >= 90) return 65; // 3-6 months
    else return 85; // <3 months
  }

  public calculateTeamScore(
    doxxed: boolean,
    reputation: number | null,
    teamSize: number | null
  ): number {
    let score = doxxed ? 20 : 70;

    if (reputation !== null) {
      if (reputation >= 90) score = Math.max(score - 15, 0);
      else if (reputation >= 75) score = Math.max(score - 10, 0);
      else if (reputation >= 60) score = Math.max(score - 5, 0);
      else score += 10;
    }

    if (teamSize !== null && teamSize >= 20) {
      score = Math.max(score - 5, 0);
    }

    return Math.min(score, 100);
  }

  public calculateIncidentScore(
    critical: number,
    high: number,
    medium: number,
    low: number
  ): number {
    const score = critical * 60 + high * 40 + medium * 20 + low * 10;
    return Math.min((score / 240) * 100, 100);
  }

  private calculateOverallScore(
    ageScore: number,
    teamScore: number,
    incidentScore: number
  ): number {
    return ageScore * 0.4 + teamScore * 0.35 + incidentScore * 0.25;
  }

  public async storeOperationalRisk(metrics: OperationalRiskMetrics): Promise<void> {
    await query(
      `UPDATE protocol_operational_risks 
       SET operational_risk_score = $1, updated_at = NOW()
       WHERE protocol_id = $2`,
      [metrics.operationalRiskScore, metrics.protocolId]
    );
  }
}

