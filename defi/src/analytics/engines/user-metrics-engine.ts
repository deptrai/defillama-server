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
   */
  async calculateDAU(protocolId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await query<{ count: number }>(
      `SELECT COUNT(DISTINCT user_address) as count
       FROM dailyUsers
       WHERE protocol_id = $1
         AND timestamp >= $2
         AND timestamp <= $3`,
      [protocolId, startOfDay, endOfDay]
    );

    return result[0]?.count || 0;
  }

  /**
   * Calculate Weekly Active Users (WAU)
   */
  async calculateWAU(protocolId: string, date: Date): Promise<number> {
    const endDate = new Date(date);
    const startDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);

    const result = await query<{ count: number }>(
      `SELECT COUNT(DISTINCT user_address) as count
       FROM dailyUsers
       WHERE protocol_id = $1
         AND timestamp >= $2
         AND timestamp <= $3`,
      [protocolId, startDate, endDate]
    );

    return result[0]?.count || 0;
  }

  /**
   * Calculate Monthly Active Users (MAU)
   */
  async calculateMAU(protocolId: string, date: Date): Promise<number> {
    const endDate = new Date(date);
    const startDate = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await query<{ count: number }>(
      `SELECT COUNT(DISTINCT user_address) as count
       FROM dailyUsers
       WHERE protocol_id = $1
         AND timestamp >= $2
         AND timestamp <= $3`,
      [protocolId, startDate, endDate]
    );

    return result[0]?.count || 0;
  }

  /**
   * Calculate new vs returning users
   */
  async calculateNewVsReturning(
    protocolId: string,
    date: Date
  ): Promise<{ newUsers: number; returningUsers: number }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all users active today
    const todayUsers = await query<{ user_address: string }>(
      `SELECT DISTINCT user_address
       FROM dailyUsers
       WHERE protocol_id = $1
         AND timestamp >= $2
         AND timestamp <= $3`,
      [protocolId, startOfDay, endOfDay]
    );

    if (todayUsers.length === 0) {
      return { newUsers: 0, returningUsers: 0 };
    }

    // Check which users were active before today
    const userAddresses = todayUsers.map(u => u.user_address);
    
    const previousUsers = await query<{ user_address: string }>(
      `SELECT DISTINCT user_address
       FROM dailyUsers
       WHERE protocol_id = $1
         AND user_address = ANY($2)
         AND timestamp < $3`,
      [protocolId, userAddresses, startOfDay]
    );

    const previousUserSet = new Set(previousUsers.map(u => u.user_address));
    
    const newUsers = todayUsers.filter(u => !previousUserSet.has(u.user_address)).length;
    const returningUsers = todayUsers.length - newUsers;

    return { newUsers, returningUsers };
  }

  /**
   * Calculate churned users
   */
  async calculateChurnedUsers(protocolId: string, date: Date): Promise<number> {
    // Users active 30 days ago but not in last 7 days
    const thirtyDaysAgo = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get users active 30 days ago
    const oldUsers = await query<{ user_address: string }>(
      `SELECT DISTINCT user_address
       FROM dailyUsers
       WHERE protocol_id = $1
         AND timestamp >= $2
         AND timestamp < $3`,
      [protocolId, thirtyDaysAgo, sevenDaysAgo]
    );

    if (oldUsers.length === 0) {
      return 0;
    }

    // Check which of these users are still active in last 7 days
    const userAddresses = oldUsers.map(u => u.user_address);
    
    const recentUsers = await query<{ user_address: string }>(
      `SELECT DISTINCT user_address
       FROM dailyUsers
       WHERE protocol_id = $1
         AND user_address = ANY($2)
         AND timestamp >= $3
         AND timestamp <= $4`,
      [protocolId, userAddresses, sevenDaysAgo, date]
    );

    const recentUserSet = new Set(recentUsers.map(u => u.user_address));
    const churnedUsers = oldUsers.filter(u => !recentUserSet.has(u.user_address)).length;

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

