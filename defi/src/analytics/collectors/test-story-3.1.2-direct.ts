/**
 * Direct Test for Story 3.1.2: Trade Pattern Analysis
 * Tests database queries and pattern recognition without API server
 */

import { query } from '../db/connection';
import { TradePatternRecognizer } from '../engines/trade-pattern-recognizer';
import { BehavioralAnalyzer } from '../engines/behavioral-analyzer';

interface Trade {
  id: string;
  walletId: string;
  txHash: string;
  timestamp: Date;
  tradeType: 'buy' | 'sell' | 'swap';
  tokenInAddress: string;
  tokenInSymbol: string;
  tokenInAmount: number;
  tokenInValueUsd: number;
  tokenOutAddress: string;
  tokenOutSymbol: string;
  tokenOutAmount: number;
  tokenOutValueUsd: number;
  protocolId: string;
  protocolName: string;
  dexName: string;
  tradeSizeUsd: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  roi?: number;
}

async function testDatabaseQueries() {
  console.log('\n🧪 Testing Database Queries\n');
  
  try {
    // Test 1: Get wallet by address
    console.log('Test 1: Get wallet by address');
    const walletResult = await query<{ id: string; wallet_address: string }>(
      'SELECT id, wallet_address FROM smart_money_wallets WHERE wallet_address = $1',
      ['0x1234567890abcdef1234567890abcdef12345678']
    );
    
    if (walletResult.rows.length > 0) {
      console.log('✅ Wallet found:', walletResult.rows[0]);
    } else {
      console.log('❌ Wallet not found');
      return;
    }
    
    const walletId = walletResult.rows[0].id;
    
    // Test 2: Get trades for wallet
    console.log('\nTest 2: Get trades for wallet');
    const tradesResult = await query<any>(
      `SELECT * FROM wallet_trades 
       WHERE wallet_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 10`,
      [walletId]
    );
    
    console.log(`✅ Found ${tradesResult.rows.length} trades`);
    
    if (tradesResult.rows.length > 0) {
      // Convert to Trade objects
      const trades: Trade[] = tradesResult.rows.map((row: any) => ({
        id: row.id,
        walletId: row.wallet_id,
        txHash: row.tx_hash,
        timestamp: new Date(row.timestamp),
        tradeType: row.trade_type,
        tokenInAddress: row.token_in_address,
        tokenInSymbol: row.token_in_symbol,
        tokenInAmount: parseFloat(row.token_in_amount),
        tokenInValueUsd: parseFloat(row.token_in_value_usd),
        tokenOutAddress: row.token_out_address,
        tokenOutSymbol: row.token_out_symbol,
        tokenOutAmount: parseFloat(row.token_out_amount),
        tokenOutValueUsd: parseFloat(row.token_out_value_usd),
        protocolId: row.protocol_id,
        protocolName: row.protocol_name,
        dexName: row.dex_name,
        tradeSizeUsd: parseFloat(row.trade_size_usd),
        realizedPnl: row.realized_pnl ? parseFloat(row.realized_pnl) : undefined,
        unrealizedPnl: row.unrealized_pnl ? parseFloat(row.unrealized_pnl) : undefined,
        roi: row.roi ? parseFloat(row.roi) : undefined,
      }));
      
      // Test 3: Pattern Recognition
      console.log('\nTest 3: Pattern Recognition');
      const recognizer = TradePatternRecognizer.getInstance();
      
      const accumulation = recognizer.detectAccumulation(trades);
      if (accumulation) {
        console.log('✅ Accumulation pattern detected:');
        console.log(`   - Confidence: ${accumulation.confidence}`);
        console.log(`   - Trades: ${accumulation.trades.length}`);
        console.log(`   - Duration: ${accumulation.durationHours.toFixed(2)} hours`);
        console.log(`   - Total Volume: $${accumulation.totalVolume.toFixed(2)}`);
      } else {
        console.log('ℹ️  No accumulation pattern detected');
      }
      
      // Test 4: Behavioral Analysis
      console.log('\nTest 4: Behavioral Analysis');
      const analyzer = BehavioralAnalyzer.getInstance();
      
      const profile = analyzer.analyzeBehavior(trades);
      console.log('✅ Behavioral profile:');
      console.log(`   - Trading Style: ${profile.tradingStyle}`);
      console.log(`   - Risk Profile: ${profile.riskProfile}`);
      console.log(`   - Preferred Tokens: ${profile.preferredTokens.slice(0, 3).map(t => t.symbol).join(', ')}`);
      console.log(`   - Preferred Protocols: ${profile.preferredProtocols.slice(0, 3).map(p => p.name).join(', ')}`);
      
      // Test 5: Get patterns from database
      console.log('\nTest 5: Get patterns from database');
      const patternsResult = await query<any>(
        `SELECT * FROM trade_patterns 
         WHERE wallet_id = $1 
         ORDER BY confidence DESC 
         LIMIT 5`,
        [walletId]
      );
      
      console.log(`✅ Found ${patternsResult.rows.length} patterns in database`);
      if (patternsResult.rows.length > 0) {
        patternsResult.rows.forEach((pattern: any, index: number) => {
          console.log(`   ${index + 1}. ${pattern.pattern_type} (confidence: ${pattern.confidence})`);
        });
      }
    }
    
    console.log('\n✅ All database tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testDatabaseQueries()
  .then(() => {
    console.log('✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

