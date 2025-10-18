/**
 * Artillery processor for price alerts load testing
 * Provides custom functions for generating test data
 */

const tokens = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI'];
const alertTypes = ['above', 'below', 'percentage_change'];

/**
 * Pick a random token
 */
function pickToken(context, events, done) {
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  context.vars.token = token;
  return done();
}

/**
 * Pick a random alert type
 */
function pickAlertType(context, events, done) {
  const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
  context.vars.alert_type = alertType;
  return done();
}

/**
 * Generate random price threshold
 */
function generateThreshold(context, events, done) {
  const threshold = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;
  context.vars.threshold = threshold;
  return done();
}

/**
 * Generate random percentage
 */
function generatePercentage(context, events, done) {
  const percentage = Math.floor(Math.random() * (50 - 5 + 1)) + 5;
  context.vars.percentage = percentage;
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
  pickToken,
  pickAlertType,
  generateThreshold,
  generatePercentage,
  logRequest,
  logResponse,
  trackMetrics,
};

