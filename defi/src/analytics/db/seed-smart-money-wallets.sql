-- Seed Data: Smart Money Wallets
-- Story: 3.1.1 - Smart Money Identification
-- Description: Mock data for 25 smart money wallets across different profiles
-- Created: 2025-10-15

-- Clear existing data
TRUNCATE TABLE smart_money_wallets CASCADE;

-- Whales (5 wallets) - High score 85-95, large trades, high ROI
INSERT INTO smart_money_wallets (
  wallet_address, chain_id, wallet_name, wallet_type, discovery_method, verified,
  smart_money_score, confidence_level,
  total_pnl, roi_all_time, win_rate, sharpe_ratio, max_drawdown,
  total_trades, avg_trade_size, avg_holding_period_days, last_trade_timestamp,
  trading_style, risk_profile, preferred_tokens, preferred_protocols,
  first_seen
) VALUES
('0x1234567890abcdef1234567890abcdef12345678', 'ethereum', 'Ethereum Whale #1', 'whale', 'algorithm', true,
 92.50, 'high',
 15000000.00, 2.5000, 78.50, 2.8500, -0.1200,
 450, 850000.00, 45.50, NOW() - INTERVAL '2 days',
 'swing_trading', 'high', ARRAY['ETH', 'WBTC', 'USDC']::TEXT[], ARRAY['uniswap', 'aave', 'compound']::TEXT[],
 NOW() - INTERVAL '2 years'),

('0x2345678901bcdef2345678901bcdef234567890', 'ethereum', 'DeFi Whale Master', 'whale', 'algorithm', true,
 89.75, 'high',
 12500000.00, 2.2000, 75.00, 2.6000, -0.1500,
 380, 920000.00, 52.00, NOW() - INTERVAL '1 day',
 'position_trading', 'high', ARRAY['ETH', 'LINK', 'UNI']::TEXT[], ARRAY['uniswap', 'curve', 'balancer']::TEXT[],
 NOW() - INTERVAL '18 months'),

('0x3456789012cdef3456789012cdef345678901234', 'polygon', 'Polygon Whale', 'whale', 'manual', true,
 87.25, 'high',
 8500000.00, 1.9500, 72.50, 2.4500, -0.1800,
 320, 780000.00, 38.00, NOW() - INTERVAL '3 days',
 'swing_trading', 'medium', ARRAY['MATIC', 'USDC', 'WETH']::TEXT[], ARRAY['quickswap', 'aave']::TEXT[],
 NOW() - INTERVAL '15 months'),

('0x4567890123def4567890123def456789012345', 'arbitrum', 'Arbitrum Whale', 'whale', 'algorithm', false,
 85.50, 'high',
 6800000.00, 1.8000, 70.00, 2.3000, -0.2000,
 290, 690000.00, 42.00, NOW() - INTERVAL '5 days',
 'momentum_trading', 'high', ARRAY['ARB', 'ETH', 'USDC']::TEXT[], ARRAY['gmx', 'camelot']::TEXT[],
 NOW() - INTERVAL '12 months'),

('0x5678901234ef5678901234ef567890123456', 'optimism', 'Optimism Whale', 'whale', 'algorithm', true,
 86.00, 'high',
 7200000.00, 1.8500, 71.00, 2.3500, -0.1700,
 310, 720000.00, 40.00, NOW() - INTERVAL '4 days',
 'swing_trading', 'medium', ARRAY['OP', 'ETH', 'USDC']::TEXT[], ARRAY['velodrome', 'aave']::TEXT[],
 NOW() - INTERVAL '14 months'),

-- Funds (5 wallets) - High score 80-90, consistent wins, medium risk
('0x6789012345f6789012345f678901234567', 'ethereum', 'Alpha Fund DAO', 'fund', 'manual', true,
 88.50, 'high',
 9500000.00, 2.1000, 76.00, 2.7000, -0.1300,
 520, 650000.00, 65.00, NOW() - INTERVAL '1 day',
 'diversified', 'medium', ARRAY['ETH', 'WBTC', 'USDC', 'DAI']::TEXT[], ARRAY['uniswap', 'aave', 'compound', 'curve']::TEXT[],
 NOW() - INTERVAL '3 years'),

('0x789012345f6789012345f6789012345678', 'ethereum', 'DeFi Ventures', 'fund', 'manual', true,
 85.75, 'high',
 7800000.00, 1.9000, 73.50, 2.5500, -0.1600,
 480, 580000.00, 70.00, NOW() - INTERVAL '2 days',
 'diversified', 'medium', ARRAY['ETH', 'UNI', 'AAVE', 'COMP']::TEXT[], ARRAY['uniswap', 'aave', 'compound']::TEXT[],
 NOW() - INTERVAL '2.5 years'),

('0x89012345f689012345f6789012345678901', 'polygon', 'Polygon Growth Fund', 'fund', 'algorithm', true,
 82.50, 'high',
 5200000.00, 1.7000, 71.00, 2.4000, -0.1900,
 420, 480000.00, 55.00, NOW() - INTERVAL '3 days',
 'growth', 'medium', ARRAY['MATIC', 'WETH', 'USDC']::TEXT[], ARRAY['quickswap', 'aave', 'balancer']::TEXT[],
 NOW() - INTERVAL '20 months'),

('0x9012345f69012345f6789012345678901234', 'arbitrum', 'Arbitrum Capital', 'fund', 'manual', false,
 80.25, 'high',
 4500000.00, 1.6000, 69.50, 2.2500, -0.2100,
 390, 420000.00, 60.00, NOW() - INTERVAL '4 days',
 'balanced', 'low', ARRAY['ARB', 'ETH', 'USDC', 'GMX']::TEXT[], ARRAY['gmx', 'camelot', 'aave']::TEXT[],
 NOW() - INTERVAL '16 months'),

('0x012345f6012345f6789012345678901234567', 'optimism', 'Optimism Yield Fund', 'fund', 'algorithm', true,
 81.00, 'high',
 4800000.00, 1.6500, 70.00, 2.3000, -0.2000,
 400, 450000.00, 58.00, NOW() - INTERVAL '5 days',
 'yield_farming', 'medium', ARRAY['OP', 'ETH', 'USDC']::TEXT[], ARRAY['velodrome', 'aave', 'beefy']::TEXT[],
 NOW() - INTERVAL '18 months'),

-- Traders (10 wallets) - Medium score 60-80, varied strategies
('0x12345f612345f6789012345678901234567890', 'ethereum', 'Day Trader Pro', 'trader', 'algorithm', false,
 75.50, 'medium',
 2800000.00, 1.4000, 68.00, 2.1000, -0.2500,
 850, 180000.00, 12.00, NOW() - INTERVAL '1 day',
 'day_trading', 'high', ARRAY['ETH', 'USDC']::TEXT[], ARRAY['uniswap', 'sushiswap']::TEXT[],
 NOW() - INTERVAL '10 months'),

('0x2345f62345f6789012345678901234567890ab', 'ethereum', 'Swing Master', 'trader', 'algorithm', false,
 72.25, 'medium',
 2200000.00, 1.3000, 66.00, 2.0000, -0.2800,
 620, 220000.00, 25.00, NOW() - INTERVAL '2 days',
 'swing_trading', 'medium', ARRAY['ETH', 'LINK', 'UNI']::TEXT[], ARRAY['uniswap', 'curve']::TEXT[],
 NOW() - INTERVAL '12 months'),

('0x345f6345f6789012345678901234567890abcd', 'polygon', 'Polygon Trader', 'trader', 'algorithm', false,
 68.75, 'medium',
 1500000.00, 1.2000, 64.00, 1.9000, -0.3000,
 520, 180000.00, 18.00, NOW() - INTERVAL '3 days',
 'momentum_trading', 'high', ARRAY['MATIC', 'WETH']::TEXT[], ARRAY['quickswap']::TEXT[],
 NOW() - INTERVAL '8 months'),

('0x45f645f6789012345678901234567890abcdef', 'arbitrum', 'Arb Scalper', 'trader', 'algorithm', false,
 65.50, 'medium',
 1200000.00, 1.1000, 62.00, 1.8000, -0.3200,
 980, 95000.00, 8.00, NOW() - INTERVAL '1 day',
 'scalping', 'high', ARRAY['ARB', 'ETH']::TEXT[], ARRAY['gmx', 'camelot']::TEXT[],
 NOW() - INTERVAL '6 months'),

('0x5f65f6789012345678901234567890abcdef12', 'optimism', 'OP Momentum', 'trader', 'algorithm', false,
 70.00, 'medium',
 1800000.00, 1.2500, 65.00, 1.9500, -0.2900,
 680, 160000.00, 20.00, NOW() - INTERVAL '2 days',
 'momentum_trading', 'medium', ARRAY['OP', 'ETH']::TEXT[], ARRAY['velodrome']::TEXT[],
 NOW() - INTERVAL '9 months'),

('0xf65f6789012345678901234567890abcdef123', 'ethereum', 'ETH Specialist', 'trader', 'manual', true,
 77.50, 'medium',
 3200000.00, 1.5000, 69.50, 2.2000, -0.2400,
 420, 380000.00, 35.00, NOW() - INTERVAL '3 days',
 'position_trading', 'medium', ARRAY['ETH', 'WBTC']::TEXT[], ARRAY['uniswap', 'aave']::TEXT[],
 NOW() - INTERVAL '15 months'),

('0x65f6789012345678901234567890abcdef1234', 'ethereum', 'DeFi Yield Hunter', 'trader', 'algorithm', false,
 73.00, 'medium',
 2400000.00, 1.3500, 67.00, 2.0500, -0.2700,
 550, 240000.00, 45.00, NOW() - INTERVAL '4 days',
 'yield_farming', 'low', ARRAY['ETH', 'USDC', 'DAI']::TEXT[], ARRAY['curve', 'convex', 'yearn']::TEXT[],
 NOW() - INTERVAL '11 months'),

('0x5f6789012345678901234567890abcdef12345', 'polygon', 'Polygon Yield Pro', 'trader', 'algorithm', false,
 66.50, 'medium',
 1350000.00, 1.1500, 63.00, 1.8500, -0.3100,
 480, 170000.00, 50.00, NOW() - INTERVAL '5 days',
 'yield_farming', 'low', ARRAY['MATIC', 'USDC']::TEXT[], ARRAY['aave', 'beefy']::TEXT[],
 NOW() - INTERVAL '7 months'),

('0xf6789012345678901234567890abcdef123456', 'arbitrum', 'Arb Perp Trader', 'trader', 'algorithm', false,
 71.25, 'medium',
 1950000.00, 1.2800, 65.50, 1.9800, -0.2850,
 720, 190000.00, 15.00, NOW() - INTERVAL '2 days',
 'derivatives', 'high', ARRAY['ARB', 'ETH', 'USDC']::TEXT[], ARRAY['gmx']::TEXT[],
 NOW() - INTERVAL '10 months'),

('0x6789012345678901234567890abcdef1234567', 'optimism', 'OP Yield Farmer', 'trader', 'algorithm', false,
 67.75, 'medium',
 1450000.00, 1.1800, 63.50, 1.8800, -0.3050,
 510, 175000.00, 55.00, NOW() - INTERVAL '6 days',
 'yield_farming', 'low', ARRAY['OP', 'USDC']::TEXT[], ARRAY['velodrome', 'beefy']::TEXT[],
 NOW() - INTERVAL '8 months'),

-- Protocols (5 wallets) - Low-medium score 50-70, protocol operations
('0x789012345678901234567890abcdef12345678', 'ethereum', 'Uniswap Treasury', 'protocol', 'manual', true,
 68.00, 'medium',
 5500000.00, 1.2200, 64.50, 1.9200, -0.2950,
 180, 1200000.00, 120.00, NOW() - INTERVAL '7 days',
 'protocol_operations', 'low', ARRAY['UNI', 'ETH', 'USDC']::TEXT[], ARRAY['uniswap']::TEXT[],
 NOW() - INTERVAL '4 years'),

('0x89012345678901234567890abcdef123456789', 'ethereum', 'Aave DAO', 'protocol', 'manual', true,
 65.50, 'medium',
 4800000.00, 1.1800, 63.00, 1.8700, -0.3100,
 150, 1100000.00, 150.00, NOW() - INTERVAL '10 days',
 'protocol_operations', 'low', ARRAY['AAVE', 'ETH', 'USDC']::TEXT[], ARRAY['aave']::TEXT[],
 NOW() - INTERVAL '3.5 years'),

('0x9012345678901234567890abcdef1234567890', 'polygon', 'QuickSwap Treasury', 'protocol', 'manual', false,
 58.25, 'low',
 2200000.00, 1.0500, 60.00, 1.7000, -0.3500,
 120, 850000.00, 180.00, NOW() - INTERVAL '15 days',
 'protocol_operations', 'low', ARRAY['QUICK', 'MATIC', 'USDC']::TEXT[], ARRAY['quickswap']::TEXT[],
 NOW() - INTERVAL '2 years'),

('0x012345678901234567890abcdef12345678901', 'arbitrum', 'GMX Treasury', 'protocol', 'manual', true,
 62.00, 'medium',
 3500000.00, 1.1200, 61.50, 1.8000, -0.3300,
 140, 950000.00, 140.00, NOW() - INTERVAL '12 days',
 'protocol_operations', 'low', ARRAY['GMX', 'ARB', 'ETH']::TEXT[], ARRAY['gmx']::TEXT[],
 NOW() - INTERVAL '2.5 years'),

('0x12345678901234567890abcdef123456789012', 'optimism', 'Velodrome DAO', 'protocol', 'manual', false,
 55.75, 'low',
 1800000.00, 1.0200, 58.50, 1.6500, -0.3700,
 110, 780000.00, 200.00, NOW() - INTERVAL '20 days',
 'protocol_operations', 'low', ARRAY['VELO', 'OP', 'USDC']::TEXT[], ARRAY['velodrome']::TEXT[],
 NOW() - INTERVAL '1.5 years');

-- Verify data
SELECT 
  wallet_type,
  COUNT(*) as count,
  ROUND(AVG(smart_money_score), 2) as avg_score,
  ROUND(MIN(smart_money_score), 2) as min_score,
  ROUND(MAX(smart_money_score), 2) as max_score
FROM smart_money_wallets
GROUP BY wallet_type
ORDER BY avg_score DESC;

