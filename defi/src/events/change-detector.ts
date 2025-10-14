/**
 * Change Detection Logic
 * Detects significant changes in TVL, price, and protocol data
 */

import {
  DynamoDBEventRecord,
  DetectedChange,
  ThresholdConfig,
  DEFAULT_THRESHOLD_CONFIG,
} from './event-types';

/**
 * Detect change type from DynamoDB PK
 */
export function detectChangeType(pk: string): 'tvl' | 'price' | 'protocol' {
  if (pk.startsWith('hourlyTvl#') || pk.startsWith('dailyTvl#')) {
    return 'tvl';
  }
  
  if (pk.startsWith('coingecko#') || pk.includes(':0x')) {
    return 'price';
  }
  
  return 'protocol';
}

/**
 * Extract protocol ID from PK
 */
export function extractProtocolId(pk: string): string | undefined {
  if (pk.startsWith('hourlyTvl#')) {
    return pk.replace('hourlyTvl#', '');
  }
  if (pk.startsWith('dailyTvl#')) {
    return pk.replace('dailyTvl#', '');
  }
  return undefined;
}

/**
 * Extract token ID from PK
 */
export function extractTokenId(pk: string): string | undefined {
  if (pk.startsWith('coingecko#')) {
    return pk.replace('coingecko#', '');
  }
  if (pk.startsWith('asset#')) {
    return pk.replace('asset#', '');
  }
  return undefined;
}

/**
 * Calculate change percentage
 */
export function calculateChangePercent(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calculate absolute change
 */
export function calculateChangeAbsolute(oldValue: number, newValue: number): number {
  return newValue - oldValue;
}

/**
 * Check if change meets threshold
 */
export function meetsThreshold(
  changePercent: number,
  changeAbsolute: number,
  changeType: 'tvl' | 'price' | 'protocol',
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): boolean {
  const threshold = config[changeType];
  
  if (changeType === 'protocol') {
    return threshold.alwaysTrigger;
  }

  return (
    Math.abs(changePercent) >= threshold.minChangePercent ||
    Math.abs(changeAbsolute) >= threshold.minChangeAbsolute
  );
}

/**
 * Detect changes from DynamoDB event records
 */
export function detectChanges(
  currentRecords: DynamoDBEventRecord[],
  previousValues: Map<string, number>,
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): DetectedChange[] {
  const changes: DetectedChange[] = [];

  for (const record of currentRecords) {
    const changeType = detectChangeType(record.PK);
    const previousValue = previousValues.get(record.PK) || 0;
    
    let currentValue = 0;
    
    // Extract current value based on change type
    if (changeType === 'tvl') {
      currentValue = record.tvl || 0;
    } else if (changeType === 'price') {
      currentValue = record.price || 0;
    }

    // Skip if no change
    if (currentValue === previousValue) continue;

    const changePercent = calculateChangePercent(previousValue, currentValue);
    const changeAbsolute = calculateChangeAbsolute(previousValue, currentValue);

    // Check threshold
    if (!meetsThreshold(changePercent, changeAbsolute, changeType, config)) {
      continue;
    }

    // Create detected change
    const change: DetectedChange = {
      type: changeType,
      pk: record.PK,
      oldValue: previousValue,
      newValue: currentValue,
      changePercent,
      changeAbsolute,
      timestamp: record.SK,
      rawData: record,
    };

    // Add type-specific fields
    if (changeType === 'tvl') {
      change.protocolId = extractProtocolId(record.PK);
      change.protocolName = record.protocolName || change.protocolId;
      change.chain = record.chain;
    } else if (changeType === 'price') {
      change.tokenId = extractTokenId(record.PK);
      change.symbol = record.symbol;
      change.chain = record.chain;
      change.decimals = record.decimals;
    }

    changes.push(change);
  }

  return changes;
}

/**
 * Group records by PK (for deduplication)
 */
export function groupRecordsByPK(
  records: DynamoDBEventRecord[]
): Map<string, DynamoDBEventRecord> {
  const grouped = new Map<string, DynamoDBEventRecord>();

  for (const record of records) {
    const existing = grouped.get(record.PK);
    
    // Keep the latest record (highest SK)
    if (!existing || record.SK > existing.SK) {
      grouped.set(record.PK, record);
    }
  }

  return grouped;
}

/**
 * Filter records by source
 */
export function filterRecordsBySource(
  records: DynamoDBEventRecord[],
  sources: string[]
): DynamoDBEventRecord[] {
  return records.filter(record => sources.includes(record.source));
}

/**
 * Filter records by time range
 */
export function filterRecordsByTimeRange(
  records: DynamoDBEventRecord[],
  startTime: number,
  endTime: number
): DynamoDBEventRecord[] {
  return records.filter(record => 
    record.SK >= startTime && record.SK <= endTime
  );
}

/**
 * Extract numeric value from record based on type
 */
export function extractValue(
  record: DynamoDBEventRecord,
  changeType: 'tvl' | 'price' | 'protocol'
): number {
  if (changeType === 'tvl') {
    return record.tvl || 0;
  }
  if (changeType === 'price') {
    return record.price || 0;
  }
  return 0;
}

/**
 * Validate record has required fields
 */
export function validateRecord(record: DynamoDBEventRecord): boolean {
  if (!record.PK || !record.SK || !record.source) {
    return false;
  }

  const changeType = detectChangeType(record.PK);
  
  if (changeType === 'tvl' && typeof record.tvl !== 'number') {
    return false;
  }
  
  if (changeType === 'price' && typeof record.price !== 'number') {
    return false;
  }

  return true;
}

/**
 * Batch detect changes with validation
 */
export function batchDetectChanges(
  records: DynamoDBEventRecord[],
  previousValues: Map<string, number>,
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): {
  changes: DetectedChange[];
  invalidRecords: DynamoDBEventRecord[];
  skippedRecords: DynamoDBEventRecord[];
} {
  const validRecords: DynamoDBEventRecord[] = [];
  const invalidRecords: DynamoDBEventRecord[] = [];

  // Validate records
  for (const record of records) {
    if (validateRecord(record)) {
      validRecords.push(record);
    } else {
      invalidRecords.push(record);
    }
  }

  // Group by PK to get latest values
  const grouped = groupRecordsByPK(validRecords);
  const latestRecords = Array.from(grouped.values());

  // Detect changes
  const allChanges = detectChanges(latestRecords, previousValues, config);
  
  // Separate significant changes from skipped
  const changes: DetectedChange[] = [];
  const skippedRecords: DynamoDBEventRecord[] = [];

  for (const record of latestRecords) {
    const hasChange = allChanges.some(c => c.pk === record.PK);
    if (!hasChange) {
      skippedRecords.push(record);
    }
  }

  return {
    changes: allChanges,
    invalidRecords,
    skippedRecords,
  };
}

/**
 * Get change summary statistics
 */
export function getChangeSummary(changes: DetectedChange[]): {
  totalChanges: number;
  tvlChanges: number;
  priceChanges: number;
  protocolChanges: number;
  avgChangePercent: number;
  maxChangePercent: number;
  minChangePercent: number;
} {
  const tvlChanges = changes.filter(c => c.type === 'tvl').length;
  const priceChanges = changes.filter(c => c.type === 'price').length;
  const protocolChanges = changes.filter(c => c.type === 'protocol').length;

  const changePercents = changes.map(c => Math.abs(c.changePercent));
  const avgChangePercent = changePercents.length > 0
    ? changePercents.reduce((a, b) => a + b, 0) / changePercents.length
    : 0;
  const maxChangePercent = changePercents.length > 0
    ? Math.max(...changePercents)
    : 0;
  const minChangePercent = changePercents.length > 0
    ? Math.min(...changePercents)
    : 0;

  return {
    totalChanges: changes.length,
    tvlChanges,
    priceChanges,
    protocolChanges,
    avgChangePercent,
    maxChangePercent,
    minChangePercent,
  };
}

