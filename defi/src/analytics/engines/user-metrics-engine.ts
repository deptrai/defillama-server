/**
 * User Metrics Engine
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 * 
 * Calculates user retention, activity, and cohort analysis metrics
 */

import { query } from '../db/connection';
import {
  UserMetrics,
  UserActivityData,
  RetentionAnalysis,
  CohortData,
  CalculationResult,
} from './types';

/**
 * User Metrics Engine
 * Calculates DAU/WAU/MAU, retention, and cohort analysis
 */
export class UserMetricsEngine {
  /**
   * Calculate Daily Active Users (DAU)
   * Note: dailyUsers table stores aggregated user counts per protocol per chain
   * Table structure: (start INT, protocolId VARCHAR, chain VARCHAR, users INT)
   */
  async calculateDAU(protocolId: string, date: Date): Promise<number> {
    // Convert date to Unix timestamp (start of day)
    const startOfDay = Math.floor(date.getTime() / 1000);
    startOfDay - (startOfDay % 86400); // Round to start of day

    const endOfDay = startOfDay + 86400; // Add 24 hours

    // Sum users across all chains for this protocol
    const result = await query<{ count: string }>(
      `SELECT SUM(users) as count
       FROM dailyUsers
       WHERE protocolId = $1
         AND start >= $2
         AND start < $3`,
      [protocolId, startOfDay, endOfDay]
    );

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Calculate Weekly Active Users (WAU)
   * Aggregates unique users over 7-day period
   */
  async calculateWAU(protocolId: string, date: Date): Promise<number> {
    const endTimestamp = Math.floor(date.getTime() / 1000);
    const startTimestamp = endTimestamp - (7 * 24 * 60 * 60); // 7 days ago

    // Sum users across all chains and days in the week
    const result = await query<{ count: string }>(
      `SELECT SUM(users) as count
       FROM dailyUsers
       WHERE protocolId = $1
         AND start >= $2
         AND start <= $3`,
      [protocolId, startTimestamp, endTimestamp]
    );

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Calculate Monthly Active Users (MAU)
   * Aggregates unique users over 30-day period
   */
  async calculateMAU(protocolId: string, date: Date): Promise<number> {
    const endTimestamp = Math.floor(date.getTime() / 1000);
    const startTimestamp = endTimestamp - (30 * 24 * 60 * 60); // 30 days ago

    // Sum users across all chains and days in the month
    const result = await query<{ count: string }>(
      `SELECT SUM(users) as count
       FROM dailyUsers
       WHERE protocolId = $1
         AND start >= $2
         AND start <= $3`,
      [protocolId, startTimestamp, endTimestamp]
    );

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Calculate new vs returning users
   *
   * TODO: Current implementation limitation
   * The dailyUsers table stores aggregated counts, not individual user addresses.
   * To properly calculate new vs returning users, we need either:
   * 1. A separate table tracking individual user activity (user_address, timestamp)
   * 2. Use dailyNewUsers table which tracks new user counts
   *
   * For now, returning placeholder values based on dailyNewUsers table
   */
  async calculateNewVsReturning(
    protocolId: string,
    date: Date
  ): Promise<{ newUsers: number; returningUsers: number }> {
    const startTimestamp = Math.floor(date.getTime() / 1000);
    const startOfDay = startTimestamp - (startTimestamp % 86400);
    const endOfDay = startOfDay + 86400;

    // Get total users for the day
    const totalResult = await query<{ count: string }>(
      `SELECT SUM(users) as count
       FROM dailyUsers
       WHERE protocolId = $1
         AND start >= $2
         AND start < $3`,
      [protocolId, startOfDay, endOfDay]
    );

    // Get new users from dailyNewUsers table
    const newUsersResult = await query<{ count: string }>(
      `SELECT SUM(users) as count
       FROM dailyNewUsers
       WHERE protocolId = $1
         AND start >= $2
         AND start < $3`,
      [protocolId, startOfDay, endOfDay]
    );

    const totalUsers = parseInt(totalResult[0]?.count || '0', 10);
    const newUsers = parseInt(newUsersResult[0]?.count || '0', 10);
    const returningUsers = Math.max(0, totalUsers - newUsers);

    return { newUsers, returningUsers };
  }

  /**
   * Calculate churned users
   *
   * TODO: Current implementation limitation
   * The dailyUsers table stores aggregated counts, not individual user addresses.
   * Accurate churn calculation requires tracking individual user activity over time.
   *
   * For now, estimating churn as: (Users 30d ago) - (Users last 7d)
   * This is an approximation and may not reflect true churn.
   */
  async calculateChurnedUsers(protocolId: string, date: Date): Promise<number> {
    const currentTimestamp = Math.floor(date.getTime() / 1000);

    // Users active 30 days ago
    const thirtyDaysAgo = currentTimestamp - (30 * 24 * 60 * 60);
    const twentyThreeDaysAgo = currentTimestamp - (23 * 24 * 60 * 60);

    // Users active in last 7 days
    const sevenDaysAgo = currentTimestamp - (7 * 24 * 60 * 60);

    // Get average daily users from 30 days ago
    const oldUsersResult = await query<{ count: string }>(
      `SELECT AVG(users) as count
       FROM dailyUsers
       WHERE protocolId = $1
         AND start >= $2
         AND start < $3`,
      [protocolId, thirtyDaysAgo, twentyThreeDaysAgo]
    );

    // Get average daily users in last 7 days
    const recentUsersResult = await query<{ count: string }>(
      `SELECT AVG(users) as count
       FROM dailyUsers
       WHERE protocolId = $1
         AND start >= $2
         AND start <= $3`,
      [protocolId, sevenDaysAgo, currentTimestamp]
    );

    const oldUsers = parseFloat(oldUsersResult[0]?.count || '0');
    const recentUsers = parseFloat(recentUsersResult[0]?.count || '0');

    // Estimate churned users as the difference
    const churnedUsers = Math.max(0, Math.floor(oldUsers - recentUsers));

    return churnedUsers;
  }

  /**
   * Calculate comprehensive user metrics
   */
  async calculateUserMetrics(protocolId: string, date: Date = new Date()): Promise<CalculationResult<UserMetrics>> {
    const startTime = Date.now();

    try {
      // Calculate all metrics in parallel
      const [dau, wau, mau, newVsReturning, churnedUsers] = await Promise.all([
        this.calculateDAU(protocolId, date),
        this.calculateWAU(protocolId, date),
        this.calculateMAU(protocolId, date),
        this.calculateNewVsReturning(protocolId, date),
        this.calculateChurnedUsers(protocolId, date),
      ]);

      // Calculate ratios
      const dauWauRatio = wau > 0 ? (dau / wau) * 100 : 0;
      const wauMauRatio = mau > 0 ? (wau / mau) * 100 : 0;
      const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

      const metrics: UserMetrics = {
        protocolId,
        timestamp: date,
        dau,
        wau,
        mau,
        newUsers: newVsReturning.newUsers,
        returningUsers: newVsReturning.returningUsers,
        churnedUsers,
        dauWauRatio,
        wauMauRatio,
        stickiness,
      };

      return {
        success: true,
        data: metrics,
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_METRICS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          protocolId,
          timestamp: new Date(),
        },
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate cohort retention analysis
   * Note: Queries protocol_user_cohorts table which should be populated by collector
   */
  async calculateRetentionAnalysis(
    protocolId: string,
    periods: number = 12
  ): Promise<CalculationResult<RetentionAnalysis>> {
    const startTime = Date.now();

    try {
      // Get cohort data from database
      const cohortData = await query<CohortData>(
        `SELECT 
           cohort_date,
           cohort_size,
           period_number,
           active_users,
           retention_rate,
           avg_transaction_value,
           total_volume
         FROM protocol_user_cohorts
         WHERE protocol_id = $1
           AND period_number <= $2
         ORDER BY cohort_date DESC, period_number ASC`,
        [protocolId, periods]
      );

      if (cohortData.length === 0) {
        throw new Error('No cohort data available');
      }

      // Group by cohort date
      const cohortMap = new Map<string, CohortData[]>();
      
      for (const data of cohortData) {
        const dateKey = new Date(data.cohort_date).toISOString().split('T')[0];
        if (!cohortMap.has(dateKey)) {
          cohortMap.set(dateKey, []);
        }
        cohortMap.get(dateKey)!.push(data);
      }

      // Build cohort analysis
      const cohorts = Array.from(cohortMap.entries()).map(([dateKey, data]) => ({
        cohortDate: dateKey,
        cohortSize: data[0].cohort_size,
        retentionByPeriod: data.map(d => ({
          period: d.period_number,
          activeUsers: d.active_users,
          retentionRate: d.retention_rate,
        })),
      }));

      // Calculate average retention rates
      const averageRetention = this.calculateAverageRetention(cohorts, periods);

      // Calculate overall churn rate
      const latestCohort = cohorts[0];
      const churnRate = latestCohort.retentionByPeriod.length > 0
        ? 100 - latestCohort.retentionByPeriod[latestCohort.retentionByPeriod.length - 1].retentionRate
        : 0;

      // Calculate user growth rate
      const userGrowthRate = this.calculateUserGrowthRate(cohorts);

      const analysis: RetentionAnalysis = {
        protocolId,
        cohorts,
        averageRetention,
        churnRate,
        userGrowthRate,
      };

      return {
        success: true,
        data: analysis,
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RETENTION_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          protocolId,
          timestamp: new Date(),
        },
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate average retention rates across cohorts
   */
  private calculateAverageRetention(
    cohorts: Array<{ retentionByPeriod: Array<{ period: number; retentionRate: number }> }>,
    maxPeriods: number
  ): { period1: number; period3: number; period6: number; period12: number } {
    const getAverageForPeriod = (period: number): number => {
      const rates = cohorts
        .map(c => c.retentionByPeriod.find(r => r.period === period)?.retentionRate)
        .filter((r): r is number => r !== undefined);
      
      return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    };

    return {
      period1: getAverageForPeriod(1),
      period3: getAverageForPeriod(3),
      period6: getAverageForPeriod(6),
      period12: getAverageForPeriod(12),
    };
  }

  /**
   * Calculate user growth rate
   */
  private calculateUserGrowthRate(
    cohorts: Array<{ cohortDate: string; cohortSize: number }>
  ): number {
    if (cohorts.length < 2) return 0;

    const latest = cohorts[0].cohortSize;
    const previous = cohorts[1].cohortSize;

    return previous > 0 ? ((latest - previous) / previous) * 100 : 0;
  }
}

// Export singleton instance
export const userMetricsEngine = new UserMetricsEngine();

