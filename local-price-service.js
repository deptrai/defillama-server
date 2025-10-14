#!/usr/bin/env node

/**
 * Local Price Service - Mock replacement for AWS-dependent price data
 * Provides realistic crypto price data without external dependencies
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3008;

app.use(cors());
app.use(express.json());

// Mock price database with realistic crypto prices (as of Oct 2024)
const MOCK_PRICES = {
  // Major cryptocurrencies
  'coingecko:bitcoin': { price: 67500, symbol: 'BTC', timestamp: Date.now() },
  'coingecko:ethereum': { price: 2650, symbol: 'ETH', timestamp: Date.now() },
  'coingecko:binancecoin': { price: 590, symbol: 'BNB', timestamp: Date.now() },
  'coingecko:solana': { price: 175, symbol: 'SOL', timestamp: Date.now() },
  'coingecko:cardano': { price: 0.38, symbol: 'ADA', timestamp: Date.now() },
  'coingecko:avalanche-2': { price: 28.5, symbol: 'AVAX', timestamp: Date.now() },
  'coingecko:polygon': { price: 0.42, symbol: 'MATIC', timestamp: Date.now() },
  'coingecko:chainlink': { price: 12.8, symbol: 'LINK', timestamp: Date.now() },
  'coingecko:uniswap': { price: 8.2, symbol: 'UNI', timestamp: Date.now() },
  'coingecko:aave': { price: 145, symbol: 'AAVE', timestamp: Date.now() },
  
  // Ethereum tokens (using ethereum: prefix)
  'ethereum:0xA0b86a33E6441b8e8C7C7b0b8b8b8b8b8b8b8b8b': { price: 1.0, symbol: 'USDC', timestamp: Date.now() },
  'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7': { price: 1.0, symbol: 'USDT', timestamp: Date.now() },
  'ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F': { price: 1.0, symbol: 'DAI', timestamp: Date.now() },
  'ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': { price: 67500, symbol: 'WBTC', timestamp: Date.now() },
  'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { price: 2650, symbol: 'WETH', timestamp: Date.now() },
  
  // BSC tokens
  'bsc:0x55d398326f99059fF775485246999027B3197955': { price: 1.0, symbol: 'USDT', timestamp: Date.now() },
  'bsc:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56': { price: 1.0, symbol: 'BUSD', timestamp: Date.now() },
  'bsc:0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': { price: 1.0, symbol: 'USDC', timestamp: Date.now() },
  
  // Polygon tokens
  'polygon:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': { price: 1.0, symbol: 'USDC', timestamp: Date.now() },
  'polygon:0xc2132D05D31c914a87C6611C10748AEb04B58e8F': { price: 1.0, symbol: 'USDT', timestamp: Date.now() },
  
  // Arbitrum tokens
  'arbitrum:0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': { price: 1.0, symbol: 'USDC', timestamp: Date.now() },
  'arbitrum:0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': { price: 1.0, symbol: 'USDT', timestamp: Date.now() },
};

// Add price volatility simulation
function addVolatility(basePrice, volatilityPercent = 2) {
  const change = (Math.random() - 0.5) * 2 * (volatilityPercent / 100);
  return basePrice * (1 + change);
}

// Update prices with slight volatility every 30 seconds
setInterval(() => {
  Object.keys(MOCK_PRICES).forEach(key => {
    const token = MOCK_PRICES[key];
    if (token.symbol !== 'USDC' && token.symbol !== 'USDT' && token.symbol !== 'DAI' && token.symbol !== 'BUSD') {
      // Don't add volatility to stablecoins
      const basePrice = token.price;
      token.price = addVolatility(basePrice, 1.5);
      token.timestamp = Date.now();
    }
  });
}, 30000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Local Price Service',
    timestamp: new Date().toISOString(),
    totalTokens: Object.keys(MOCK_PRICES).length
  });
});

// Get current prices for multiple tokens
app.get('/prices/current/:tokens', (req, res) => {
  try {
    const tokens = req.params.tokens.split(',');
    const result = { coins: {} };
    
    tokens.forEach(token => {
      const cleanToken = token.trim();
      if (MOCK_PRICES[cleanToken]) {
        result.coins[cleanToken] = {
          decimals: 18,
          price: MOCK_PRICES[cleanToken].price,
          symbol: MOCK_PRICES[cleanToken].symbol,
          timestamp: MOCK_PRICES[cleanToken].timestamp,
          confidence: 0.99
        };
      } else {
        // Generate random price for unknown tokens
        result.coins[cleanToken] = {
          decimals: 18,
          price: Math.random() * 100,
          symbol: 'UNKNOWN',
          timestamp: Date.now(),
          confidence: 0.5
        };
      }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical prices (mock data)
app.get('/prices/historical/:timestamp/:tokens', (req, res) => {
  try {
    const tokens = req.params.tokens.split(',');
    const timestamp = parseInt(req.params.timestamp);
    const result = { coins: {} };
    
    tokens.forEach(token => {
      const cleanToken = token.trim();
      if (MOCK_PRICES[cleanToken]) {
        // Simulate historical price (slightly different from current)
        const currentPrice = MOCK_PRICES[cleanToken].price;
        const historicalPrice = addVolatility(currentPrice, 5);
        
        result.coins[cleanToken] = {
          decimals: 18,
          price: historicalPrice,
          symbol: MOCK_PRICES[cleanToken].symbol,
          timestamp: timestamp,
          confidence: 0.95
        };
      }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all available tokens
app.get('/tokens', (req, res) => {
  const tokens = Object.keys(MOCK_PRICES).map(key => ({
    id: key,
    symbol: MOCK_PRICES[key].symbol,
    price: MOCK_PRICES[key].price,
    lastUpdated: new Date(MOCK_PRICES[key].timestamp).toISOString()
  }));
  
  res.json({ 
    total: tokens.length,
    tokens: tokens 
  });
});

// Batch price updates (for testing)
app.post('/prices/update', (req, res) => {
  try {
    const updates = req.body;
    let updated = 0;
    
    Object.keys(updates).forEach(tokenId => {
      if (MOCK_PRICES[tokenId]) {
        MOCK_PRICES[tokenId].price = updates[tokenId];
        MOCK_PRICES[tokenId].timestamp = Date.now();
        updated++;
      }
    });
    
    res.json({ 
      message: `Updated ${updated} token prices`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local Price Service running on http://localhost:${PORT}`);
  console.log(`📊 Serving ${Object.keys(MOCK_PRICES).length} token prices`);
  console.log(`🔄 Prices update every 30 seconds with realistic volatility`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health - Service health check`);
  console.log(`   GET  /tokens - List all available tokens`);
  console.log(`   GET  /prices/current/{tokens} - Current prices`);
  console.log(`   GET  /prices/historical/{timestamp}/{tokens} - Historical prices`);
  console.log(`   POST /prices/update - Batch update prices`);
  console.log(`\n🎯 Example: http://localhost:${PORT}/prices/current/coingecko:bitcoin,coingecko:ethereum`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Local Price Service...');
  process.exit(0);
});
