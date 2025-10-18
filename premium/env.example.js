// Premium Features Environment Variables
// Copy this file to env.js and fill in your values
// Based on: defi/env.js (existing DeFi service)

module.exports = {
  // ============================================================================
  // PREMIUM DATABASE (NEW - Separate RDS instance)
  // ============================================================================
  PREMIUM_DB: process.env.PREMIUM_DB || 'postgresql://defillama:YOUR_PASSWORD@premium-db.rds.amazonaws.com:5432/defillama_premium',
  PREMIUM_DB_PASSWORD: process.env.PREMIUM_DB_PASSWORD || 'YOUR_SECURE_PASSWORD',
  
  // Fallback to existing database (dev/test)
  ALERTS_DB: process.env.ALERTS_DB || 'postgresql://defillama:defillama123@localhost:5432/defillama',
  ACCOUNTS_DB: process.env.ACCOUNTS_DB || 'postgresql://defillama:defillama123@localhost:5432/defillama',
  
  // ============================================================================
  // REDIS (Shared cluster, separate DB number)
  // ============================================================================
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: process.env.REDIS_DB || '1', // DB 1 for premium alerts (DB 0 for free platform)
  
  // ============================================================================
  // BLOCKCHAIN RPCs (Reuse existing from DeFi service)
  // ============================================================================
  ETHEREUM_RPC: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
  BSC_RPC: process.env.BSC_RPC || 'https://bsc-dataseed.binance.org',
  POLYGON_RPC: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
  ARBITRUM_RPC: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
  OPTIMISM_RPC: process.env.OPTIMISM_RPC || 'https://mainnet.optimism.io',
  SOLANA_RPC: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  FANTOM_RPC: process.env.FANTOM_RPC || 'https://rpc.ftm.tools',
  AVALANCHE_RPC: process.env.AVALANCHE_RPC || 'https://api.avax.network/ext/bc/C/rpc',
  
  // ============================================================================
  // WEBHOOKS (Reuse existing)
  // ============================================================================
  TEAM_WEBHOOK: process.env.TEAM_WEBHOOK || 'https://discord.com/api/webhooks/YOUR_WEBHOOK',
  
  // ============================================================================
  // PREMIUM-SPECIFIC INTEGRATIONS
  // ============================================================================
  // Stripe (Subscriptions & Billing)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_STRIPE_KEY',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET',
  
  // SendGrid (Email Notifications)
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || 'SG.YOUR_SENDGRID_KEY',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@defillama.com',
  
  // Telegram (Notifications)
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
  
  // Discord (Notifications)
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/YOUR_WEBHOOK',
  
  // Security APIs
  GOPLUS_API_KEY: process.env.GOPLUS_API_KEY || 'YOUR_GOPLUS_KEY',
  FORTA_API_KEY: process.env.FORTA_API_KEY || 'YOUR_FORTA_KEY',
  
  // ============================================================================
  // AWS RESOURCES (Reuse existing)
  // ============================================================================
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || 'YOUR_R2_ACCESS_KEY',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || 'YOUR_R2_SECRET_KEY',
  R2_ENDPOINT: process.env.R2_ENDPOINT || 'https://YOUR_ACCOUNT.r2.cloudflarestorage.com',
};

