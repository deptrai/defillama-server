-- Seed Data: Holder Distribution Alerts
-- Story: 2.2.2 - Holder Distribution Analysis
-- Description: Sample alert configurations for various tokens

-- User 1: Whale accumulation alerts
INSERT INTO holder_distribution_alerts (
  user_id, token_address, chain_id,
  alert_type, threshold,
  channels, webhook_url,
  enabled, last_triggered, trigger_count
) VALUES
('user_001', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum',
 'whale_accumulation', 0.5,
 '["email", "webhook"]', 'https://api.example.com/webhooks/whale-alert',
 TRUE, NOW() - INTERVAL '5 days', 3),

('user_001', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'ethereum',
 'whale_accumulation', 1.0,
 '["email"]', NULL,
 TRUE, NULL, 0),

('user_001', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'ethereum',
 'whale_accumulation', 0.75,
 '["email", "push"]', NULL,
 TRUE, NOW() - INTERVAL '10 days', 1);

-- User 1: Whale distribution alerts
INSERT INTO holder_distribution_alerts (
  user_id, token_address, chain_id,
  alert_type, threshold,
  channels, webhook_url,
  enabled, last_triggered, trigger_count
) VALUES
('user_001', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum',
 'whale_distribution', 0.5,
 '["email", "webhook"]', 'https://api.example.com/webhooks/whale-alert',
 TRUE, NOW() - INTERVAL '3 days', 2),

('user_001', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'ethereum',
 'whale_distribution', 1.0,
 '["email"]', NULL,
 TRUE, NULL, 0);

-- User 1: Concentration increase alerts
INSERT INTO holder_distribution_alerts (
  user_id, token_address, chain_id,
  alert_type, threshold,
  channels, webhook_url,
  enabled, last_triggered, trigger_count
) VALUES
('user_001', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum',
 'concentration_increase', 5.0,
 '["email"]', NULL,
 TRUE, NULL, 0),

('user_001', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'ethereum',
 'concentration_increase', 3.0,
 '["email", "push"]', NULL,
 TRUE, NOW() - INTERVAL '15 days', 1);

-- User 1: Holder count change alerts
INSERT INTO holder_distribution_alerts (
  user_id, token_address, chain_id,
  alert_type, threshold,
  channels, webhook_url,
  enabled, last_triggered, trigger_count
) VALUES
('user_001', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum',
 'holder_count_change', 10.0,
 '["email"]', NULL,
 TRUE, NOW() - INTERVAL '7 days', 2);

-- User 2: Different alert configurations
INSERT INTO holder_distribution_alerts (
  user_id, token_address, chain_id,
  alert_type, threshold,
  channels, webhook_url,
  enabled, last_triggered, trigger_count
) VALUES
('user_002', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum',
 'whale_accumulation', 0.3,
 '["webhook"]', 'https://api.user2.com/alerts',
 TRUE, NOW() - INTERVAL '2 days', 5),

('user_002', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum',
 'concentration_increase', 2.0,
 '["webhook"]', 'https://api.user2.com/alerts',
 TRUE, NULL, 0),

('user_002', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'ethereum',
 'whale_distribution', 0.8,
 '["webhook", "push"]', 'https://api.user2.com/alerts',
 TRUE, NOW() - INTERVAL '1 day', 1);

-- User 3: Disabled alerts
INSERT INTO holder_distribution_alerts (
  user_id, token_address, chain_id,
  alert_type, threshold,
  channels, webhook_url,
  enabled, last_triggered, trigger_count
) VALUES
('user_003', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum',
 'whale_accumulation', 1.0,
 '["email"]', NULL,
 FALSE, NOW() - INTERVAL '30 days', 10),

('user_003', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'ethereum',
 'holder_count_change', 15.0,
 '["email", "push"]', NULL,
 FALSE, NOW() - INTERVAL '20 days', 5);

-- Total: 14 alerts
-- User 1: 9 alerts (all enabled)
-- User 2: 3 alerts (all enabled)
-- User 3: 2 alerts (all disabled)

