/**
 * Seed Script for Protocol Data
 * Generates sample data for testing Advanced Query Processor
 */

import { v4 as uuidv4 } from 'uuid';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

// Use postgres user (same as migration)
// Use Unix socket connection (trust auth) instead of TCP (scram-sha-256)
// Docker container exposes Unix socket at /var/run/postgresql
const sql = postgres({
  host: '/var/run/postgresql',  // Unix socket path
  database: 'defillama',
  username: 'postgres',
});

// Sample data constants
const CATEGORIES = ['DEX', 'Lending', 'Yield', 'Bridge', 'Derivatives', 'Insurance', 'Staking', 'NFT'];
const CHAINS = ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'fantom', 'solana'];
const TOKENS = [
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' },
  { id: 'dai', symbol: 'DAI', name: 'Dai' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  { id: 'aave', symbol: 'AAVE', name: 'Aave' },
  { id: 'curve-dao-token', symbol: 'CRV', name: 'Curve DAO Token' },
  { id: 'maker', symbol: 'MKR', name: 'Maker' },
];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Generate protocols
async function seedProtocols(count: number = 100) {
  console.log(`Seeding ${count} protocols...`);
  
  const protocols = [];
  for (let i = 0; i < count; i++) {
    const category = randomElement(CATEGORIES);
    const chains = randomElements(CHAINS, randomInt(1, 4));
    
    protocols.push({
      id: `protocol-${i + 1}`,
      name: `${category} Protocol ${i + 1}`,
      category,
      chains,
      description: `A ${category.toLowerCase()} protocol on ${chains.join(', ')}`,
      website: `https://protocol${i + 1}.com`,
      logo_url: `https://protocol${i + 1}.com/logo.png`,
      twitter: `@protocol${i + 1}`,
      audit_links: [`https://audit.com/protocol${i + 1}`],
      created_at: new Date(Date.now() - randomInt(0, 365) * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    });
  }
  
  await sql`
    INSERT INTO protocols ${sql(protocols)}
    ON CONFLICT (id) DO NOTHING
  `;
  
  console.log(`✅ Seeded ${count} protocols`);
  return protocols;
}

// Generate protocol TVL data
async function seedProtocolTVL(protocols: any[], recordsPerProtocol: number = 10) {
  console.log(`Seeding TVL data for ${protocols.length} protocols (${recordsPerProtocol} records each)...`);
  
  const tvlRecords = [];
  const now = Date.now();
  
  for (const protocol of protocols) {
    for (const chain of protocol.chains) {
      for (let i = 0; i < recordsPerProtocol; i++) {
        const timestamp = new Date(now - i * 24 * 60 * 60 * 1000); // Daily records
        const baseTVL = randomFloat(1000000, 1000000000, 2);
        const tvl = baseTVL * (1 + randomFloat(-0.1, 0.1, 4));
        const tvlPrevDay = baseTVL * (1 + randomFloat(-0.05, 0.05, 4));
        const tvlPrevWeek = baseTVL * (1 + randomFloat(-0.15, 0.15, 4));
        const tvlPrevMonth = baseTVL * (1 + randomFloat(-0.3, 0.3, 4));
        
        tvlRecords.push({
          id: uuidv4(),
          protocol_id: protocol.id,
          chain,
          tvl,
          tvl_prev_day: tvlPrevDay,
          tvl_prev_week: tvlPrevWeek,
          tvl_prev_month: tvlPrevMonth,
          change_1d: ((tvl - tvlPrevDay) / tvlPrevDay * 100).toFixed(2),
          change_7d: ((tvl - tvlPrevWeek) / tvlPrevWeek * 100).toFixed(2),
          change_30d: ((tvl - tvlPrevMonth) / tvlPrevMonth * 100).toFixed(2),
          timestamp,
          created_at: new Date(),
        });
      }
    }
  }
  
  // Insert in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < tvlRecords.length; i += batchSize) {
    const batch = tvlRecords.slice(i, i + batchSize);
    await sql`
      INSERT INTO protocol_tvl ${sql(batch)}
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tvlRecords.length / batchSize)}`);
  }
  
  console.log(`✅ Seeded ${tvlRecords.length} TVL records`);
}

// Generate token price data
async function seedTokenPrices(recordsPerToken: number = 100) {
  console.log(`Seeding price data for ${TOKENS.length} tokens (${recordsPerToken} records each)...`);
  
  const priceRecords = [];
  const now = Date.now();
  
  for (const token of TOKENS) {
    const basePrice = token.symbol === 'BTC' ? 40000 : 
                      token.symbol === 'ETH' ? 2000 :
                      token.symbol === 'BNB' ? 300 :
                      token.symbol.includes('USD') ? 1 :
                      randomFloat(1, 100, 2);
    
    for (let i = 0; i < recordsPerToken; i++) {
      const timestamp = new Date(now - i * 60 * 60 * 1000); // Hourly records
      const price = basePrice * (1 + randomFloat(-0.05, 0.05, 6));
      const pricePrevDay = basePrice * (1 + randomFloat(-0.03, 0.03, 6));
      const pricePrevWeek = basePrice * (1 + randomFloat(-0.1, 0.1, 6));
      const pricePrevMonth = basePrice * (1 + randomFloat(-0.2, 0.2, 6));
      
      priceRecords.push({
        id: uuidv4(),
        token_id: token.id,
        token_symbol: token.symbol,
        token_name: token.name,
        price,
        price_prev_day: pricePrevDay,
        price_prev_week: pricePrevWeek,
        price_prev_month: pricePrevMonth,
        change_1d: ((price - pricePrevDay) / pricePrevDay * 100).toFixed(2),
        change_7d: ((price - pricePrevWeek) / pricePrevWeek * 100).toFixed(2),
        change_30d: ((price - pricePrevMonth) / pricePrevMonth * 100).toFixed(2),
        volume_24h: randomFloat(1000000, 10000000000, 2),
        market_cap: price * randomFloat(1000000, 100000000000, 2),
        timestamp,
        created_at: new Date(),
      });
    }
  }
  
  // Insert in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < priceRecords.length; i += batchSize) {
    const batch = priceRecords.slice(i, i + batchSize);
    await sql`
      INSERT INTO token_prices ${sql(batch)}
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(priceRecords.length / batchSize)}`);
  }
  
  console.log(`✅ Seeded ${priceRecords.length} price records`);
}

// Generate protocol stats
async function seedProtocolStats(protocols: any[]) {
  console.log(`Seeding protocol stats for ${protocols.length} protocols...`);
  
  const stats = [];
  for (const protocol of protocols) {
    const totalTVL = randomFloat(10000000, 10000000000, 2);
    const totalChains = protocol.chains.length;
    
    stats.push({
      id: uuidv4(),
      protocol_id: protocol.id,
      total_tvl: totalTVL,
      total_chains: totalChains,
      avg_tvl_per_chain: (totalTVL / totalChains).toFixed(2),
      max_tvl: (totalTVL * randomFloat(0.4, 0.6, 2)).toFixed(2),
      min_tvl: (totalTVL * randomFloat(0.1, 0.2, 2)).toFixed(2),
      last_updated: new Date(),
      created_at: new Date(),
    });
  }
  
  await sql`
    INSERT INTO protocol_stats ${sql(stats)}
    ON CONFLICT (id) DO NOTHING
  `;
  
  console.log(`✅ Seeded ${stats.length} protocol stats`);
}

// Main seed function
async function main() {
  try {
    console.log('🌱 Starting seed process...\n');
    
    const protocols = await seedProtocols(100);
    await seedProtocolTVL(protocols, 10);
    await seedTokenPrices(100);
    await seedProtocolStats(protocols);
    
    console.log('\n✅ Seed process completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Protocols: 100`);
    console.log(`  - TVL Records: ~${100 * 10 * 2} (avg 2 chains per protocol)`);
    console.log(`  - Price Records: ${TOKENS.length * 100}`);
    console.log(`  - Protocol Stats: 100`);
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    await sql.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedProtocols, seedProtocolTVL, seedTokenPrices, seedProtocolStats };

