const http = require('http');
const url = require('url');

// Simple mock data
const mockChains = [
  { name: 'Ethereum', chainId: 1, tvl: 50000000000 },
  { name: 'BSC', chainId: 56, tvl: 8000000000 },
  { name: 'Polygon', chainId: 137, tvl: 2000000000 },
  { name: 'Arbitrum', chainId: 42161, tvl: 3000000000 },
  { name: 'Optimism', chainId: 10, tvl: 1500000000 }
];

const mockPrices = {
  'ethereum': { price: 2500, change24h: 2.5 },
  'bitcoin': { price: 45000, change24h: 1.2 },
  'binancecoin': { price: 300, change24h: -0.8 }
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`${new Date().toISOString()} - ${req.method} ${path}`);
  
  try {
    if (path === '/chains') {
      res.writeHead(200);
      res.end(JSON.stringify(mockChains));
    } else if (path === '/prices') {
      res.writeHead(200);
      res.end(JSON.stringify(mockPrices));
    } else if (path.startsWith('/prices/current/')) {
      const coins = path.split('/')[3];
      const coinList = coins.split(',');
      const result = {};
      coinList.forEach(coin => {
        if (mockPrices[coin]) {
          result[coin] = mockPrices[coin];
        }
      });
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } else if (path === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        services: {
          'simple-server': 'running',
          'ui-tool': 'running'
        }
      }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found', path: path }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`🚀 Simple DeFiLlama Mock Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /chains - List of blockchain chains`);
  console.log(`   GET /prices - Current token prices`);
  console.log(`   GET /prices/current/{coins} - Specific coin prices`);
  console.log(`   GET /health - Server health check`);
  console.log(`\n✅ Ready to serve requests!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
