-- Seed Data: Holder Distribution Snapshots
-- Story: 2.2.2 - Holder Distribution Analysis
-- Description: Historical snapshots for USDC token (30 days of daily snapshots)

-- USDC (Ethereum) - 30 days of snapshots
-- Showing gradual increase in holders and slight concentration decrease

INSERT INTO holder_distribution_snapshots (
  token_address, chain_id, timestamp,
  total_holders, gini_coefficient, concentration_score,
  top10_percentage, top50_percentage, top100_percentage,
  whale_count, whale_percentage,
  large_holder_count, large_holder_percentage,
  medium_holder_count, medium_holder_percentage,
  small_holder_count, small_holder_percentage,
  dust_holder_count, dust_holder_percentage,
  avg_holding_period_days, holder_churn_rate,
  new_holders_24h, new_holders_7d, new_holders_30d
) VALUES
-- Day 30 (oldest)
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '30 days',
 45, 0.7200, 72.00,
 11.50, 13.20, 13.80,
 3, 9.50,
 4, 1.80,
 8, 0.25,
 12, 0.025,
 18, 0.0012,
 120.50, 5.20,
 2, 12, 45),

-- Day 29
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '29 days',
 46, 0.7180, 71.80,
 11.45, 13.18, 13.78,
 3, 9.50,
 4, 1.82,
 8, 0.26,
 12, 0.026,
 19, 0.0013,
 121.20, 5.15,
 1, 11, 44),

-- Day 28
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '28 days',
 47, 0.7160, 71.60,
 11.40, 13.15, 13.75,
 3, 9.50,
 4, 1.85,
 9, 0.27,
 12, 0.027,
 19, 0.0013,
 122.00, 5.10,
 1, 10, 43),

-- Day 27
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '27 days',
 48, 0.7140, 71.40,
 11.35, 13.12, 13.72,
 3, 9.50,
 5, 1.88,
 9, 0.28,
 12, 0.028,
 19, 0.0013,
 123.00, 5.05,
 1, 9, 42),

-- Day 26
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '26 days',
 48, 0.7120, 71.20,
 11.30, 13.10, 13.70,
 3, 9.50,
 5, 1.90,
 9, 0.28,
 12, 0.028,
 19, 0.0013,
 124.00, 5.00,
 0, 8, 41),

-- Day 25
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '25 days',
 49, 0.7100, 71.00,
 11.25, 13.08, 13.68,
 3, 9.50,
 5, 1.92,
 9, 0.29,
 13, 0.029,
 19, 0.0013,
 125.00, 4.95,
 1, 7, 40),

-- Day 24
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '24 days',
 49, 0.7080, 70.80,
 11.20, 13.05, 13.65,
 3, 9.50,
 5, 1.93,
 9, 0.29,
 13, 0.029,
 19, 0.0013,
 126.00, 4.90,
 0, 6, 39),

-- Day 23
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '23 days',
 50, 0.7060, 70.60,
 11.15, 13.02, 13.62,
 3, 9.50,
 5, 1.94,
 10, 0.30,
 13, 0.030,
 19, 0.0013,
 127.00, 4.85,
 1, 5, 38),

-- Day 22
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '22 days',
 50, 0.7040, 70.40,
 11.10, 13.00, 13.60,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 13, 0.030,
 19, 0.0013,
 128.00, 4.80,
 0, 4, 37),

-- Day 21
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '21 days',
 51, 0.7020, 70.20,
 11.05, 12.98, 13.58,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 14, 0.031,
 19, 0.0013,
 129.00, 4.75,
 1, 3, 36),

-- Day 20
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '20 days',
 51, 0.7000, 70.00,
 11.00, 12.95, 13.55,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 14, 0.031,
 19, 0.0013,
 130.00, 4.70,
 0, 2, 35),

-- Day 19
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '19 days',
 52, 0.6980, 69.80,
 10.95, 12.92, 13.52,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 19, 0.0013,
 131.00, 4.65,
 1, 1, 34),

-- Day 18
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '18 days',
 52, 0.6960, 69.60,
 10.90, 12.90, 13.50,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 19, 0.0013,
 132.00, 4.60,
 0, 0, 33),

-- Day 17
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '17 days',
 53, 0.6940, 69.40,
 10.85, 12.88, 13.48,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 133.00, 4.55,
 1, 1, 32),

-- Day 16
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '16 days',
 53, 0.6920, 69.20,
 10.80, 12.85, 13.45,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 134.00, 4.50,
 0, 2, 31),

-- Day 15
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '15 days',
 53, 0.6900, 69.00,
 10.75, 12.82, 13.42,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 135.00, 4.45,
 0, 3, 30),

-- Day 14
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '14 days',
 53, 0.6880, 68.80,
 10.70, 12.80, 13.40,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 136.00, 4.40,
 0, 4, 29),

-- Day 13
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '13 days',
 53, 0.6860, 68.60,
 10.65, 12.78, 13.38,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 137.00, 4.35,
 0, 5, 28),

-- Day 12
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '12 days',
 53, 0.6840, 68.40,
 10.60, 12.75, 13.35,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 138.00, 4.30,
 0, 6, 27),

-- Day 11
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '11 days',
 53, 0.6820, 68.20,
 10.55, 12.72, 13.32,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 139.00, 4.25,
 0, 7, 26),

-- Day 10
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '10 days',
 53, 0.6800, 68.00,
 10.50, 12.70, 13.30,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 140.00, 4.20,
 0, 8, 25),

-- Day 9
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '9 days',
 53, 0.6780, 67.80,
 10.45, 12.68, 13.28,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 141.00, 4.15,
 0, 9, 24),

-- Day 8
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '8 days',
 53, 0.6760, 67.60,
 10.40, 12.65, 13.25,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 142.00, 4.10,
 0, 10, 23),

-- Day 7
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '7 days',
 53, 0.6740, 67.40,
 10.35, 12.62, 13.22,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 143.00, 4.05,
 0, 11, 22),

-- Day 6
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '6 days',
 53, 0.6720, 67.20,
 10.30, 12.60, 13.20,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 144.00, 4.00,
 0, 12, 21),

-- Day 5
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '5 days',
 53, 0.6700, 67.00,
 10.25, 12.58, 13.18,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 145.00, 3.95,
 0, 13, 20),

-- Day 4
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '4 days',
 53, 0.6680, 66.80,
 10.20, 12.55, 13.15,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 146.00, 3.90,
 0, 14, 19),

-- Day 3
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '3 days',
 53, 0.6660, 66.60,
 10.15, 12.52, 13.12,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 147.00, 3.85,
 0, 15, 18),

-- Day 2
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '2 days',
 53, 0.6640, 66.40,
 10.10, 12.50, 13.10,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 148.00, 3.80,
 0, 16, 17),

-- Day 1 (most recent)
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', NOW() - INTERVAL '1 day',
 53, 0.6620, 66.20,
 10.05, 12.48, 13.08,
 3, 9.50,
 5, 1.95,
 10, 0.30,
 15, 0.032,
 20, 0.0014,
 149.00, 3.75,
 0, 17, 16);

-- Total: 30 snapshots showing:
-- - Gradual holder growth (45 → 53)
-- - Decreasing concentration (Gini: 0.72 → 0.662)
-- - Stable whale count (3)
-- - Increasing average holding period (120.5 → 149 days)
-- - Decreasing churn rate (5.2% → 3.75%)

