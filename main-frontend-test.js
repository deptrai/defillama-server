#!/usr/bin/env node

/**
 * 🎯 Main DeFiLlama Frontend Integration Test
 * Tests the main Next.js frontend with all backend services
 */

const http = require('http');
const https = require('https');

// Test configuration
const TESTS = {
  'Main Frontend (Next.js)': 'http://localhost:3000',
  'Coins Service': 'http://localhost:3005/prices/current/coingecko:bitcoin',
  'DeFi Service': 'http://localhost:3006/dev/emissions',
  'Local Price Service': 'http://localhost:3008/health',
  'WebSocket Server': 'http://localhost:8080' // HTTP fallback test
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          data: data,
          responseTime: responseTime,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testService(name, url) {
  try {
    log(`Testing ${name}...`, 'blue');
    const response = await makeRequest(url);
    
    if (response.statusCode === 200) {
      log(`✅ ${name}: OK (${response.responseTime}ms)`, 'green');
      
      // Special checks for different services
      if (name.includes('Frontend')) {
        const hasHTML = response.data.includes('<!DOCTYPE html>');
        const hasNextJS = response.data.includes('next');
        log(`   📄 HTML Document: ${hasHTML ? '✅' : '❌'}`, hasHTML ? 'green' : 'red');
        log(`   ⚛️  Next.js App: ${hasNextJS ? '✅' : '❌'}`, hasNextJS ? 'green' : 'red');
      }
      
      if (name.includes('Coins')) {
        try {
          const jsonData = JSON.parse(response.data);
          const hasCoins = jsonData.coins && Object.keys(jsonData.coins).length > 0;
          log(`   💰 Price Data: ${hasCoins ? '✅' : '❌'}`, hasCoins ? 'green' : 'red');
          if (hasCoins) {
            const btcPrice = jsonData.coins['coingecko:bitcoin']?.price;
            if (btcPrice) {
              log(`   ₿  BTC Price: $${btcPrice.toLocaleString()}`, 'yellow');
            }
          }
        } catch (e) {
          log(`   ⚠️  JSON Parse Error: ${e.message}`, 'red');
        }
      }
      
      if (name.includes('Price Service')) {
        const isHealthy = response.data.includes('healthy') || response.data.includes('OK');
        log(`   🏥 Health Status: ${isHealthy ? '✅' : '❌'}`, isHealthy ? 'green' : 'red');
      }
      
      return true;
    } else {
      log(`❌ ${name}: HTTP ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ ${name}: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendFeatures() {
  log('\n🔍 Testing Frontend Features...', 'bold');
  
  try {
    const response = await makeRequest('http://localhost:3000');
    const html = response.data;
    
    // Check for key DeFiLlama elements
    const checks = [
      { name: 'DeFiLlama Branding', test: html.includes('DeFiLlama') || html.includes('defillama') },
      { name: 'Meta Tags', test: html.includes('<meta') },
      { name: 'Favicon', test: html.includes('favicon') },
      { name: 'Font Loading', test: html.includes('fonts/') },
      { name: 'Theme System', test: html.includes('theme') },
      { name: 'JavaScript Bundle', test: html.includes('<script') },
      { name: 'CSS Styles', test: html.includes('<style') || html.includes('.css') },
      { name: 'Responsive Design', test: html.includes('viewport') }
    ];
    
    checks.forEach(check => {
      log(`   ${check.name}: ${check.test ? '✅' : '❌'}`, check.test ? 'green' : 'red');
    });
    
    return checks.every(check => check.test);
  } catch (error) {
    log(`❌ Frontend Feature Test Failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting DeFiLlama Main Frontend Integration Test\n', 'bold');
  
  const results = [];
  
  // Test all services
  for (const [name, url] of Object.entries(TESTS)) {
    const result = await testService(name, url);
    results.push({ name, success: result });
    log(''); // Empty line for readability
  }
  
  // Test frontend features
  const frontendFeaturesOK = await testFrontendFeatures();
  results.push({ name: 'Frontend Features', success: frontendFeaturesOK });
  
  // Summary
  log('\n📊 TEST SUMMARY', 'bold');
  log('='.repeat(50), 'blue');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
  });
  
  log('='.repeat(50), 'blue');
  log(`Total: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 ALL TESTS PASSED! DeFiLlama is ready to use!', 'green');
    log('🌐 Visit: http://localhost:3000', 'blue');
  } else {
    log(`\n⚠️  ${total - passed} tests failed. Check the logs above.`, 'yellow');
  }
  
  return passed === total;
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`💥 Test runner crashed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { runAllTests, testService, testFrontendFeatures };
