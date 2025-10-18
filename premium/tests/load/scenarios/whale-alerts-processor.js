/**
 * Artillery processor for whale alerts load testing
 * Provides custom functions for generating test data
 */

const chains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'];
const tokens = ['USDT', 'USDC', 'DAI', 'WETH', 'WBTC', 'LINK', 'UNI', 'AAVE'];

/**
 * Pick a random blockchain chain
 */
function pickChain(context, events, done) {
  const chain = chains[Math.floor(Math.random() * chains.length)];
  context.vars.chain = chain;
  return done();
}

/**
 * Pick a random token
 */
function pickToken(context, events, done) {
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  context.vars.token = token;
  return done();
}

/**
 * Generate random threshold in USD
 */
function generateThreshold(context, events, done) {
  const threshold = Math.floor(Math.random() * (10000000 - 100000 + 1)) + 100000;
  context.vars.threshold_usd = threshold;
  return done();
}

/**
 * Log request details for debugging
 */
function logRequest(requestParams, context, ee, next) {
  console.log(`[${new Date().toISOString()}] ${requestParams.method} ${requestParams.url}`);
  return next();
}

/**
 * Log response details for debugging
 */
function logResponse(requestParams, response, context, ee, next) {
  console.log(`[${new Date().toISOString()}] Response: ${response.statusCode}`);
  return next();
}

/**
 * Custom metrics tracking
 */
function trackMetrics(context, events, done) {
  // Track custom metrics here if needed
  return done();
}

module.exports = {
  pickChain,
  pickToken,
  generateThreshold,
  logRequest,
  logResponse,
  trackMetrics,
};

