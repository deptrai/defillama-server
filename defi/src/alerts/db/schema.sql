-- Alert System Database Schema
-- Version: 1.0
-- Date: 2025-10-14
-- Author: Augment Agent (Claude Sonnet 4)

-- ============================================================================
-- Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- User Devices Table (for push notifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token VARCHAR(512) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name VARCHAR(255),
  app_version VARCHAR(50),
  os_version VARCHAR(50),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_token ON user_devices(device_token);

-- ============================================================================
-- Alert Rules Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  alert_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  webhook_url VARCHAR(512),
  enabled BOOLEAN DEFAULT true,
  throttle_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_alert_type ON alert_rules(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_conditions ON alert_rules USING GIN (conditions);

-- ============================================================================
-- Alert History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  triggered_value NUMERIC,
  threshold_value NUMERIC,
  message TEXT,
  delivery_status JSONB DEFAULT '{}',
  error_details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id ON alert_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at DESC);

-- ============================================================================
-- Notification Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_history_id UUID NOT NULL REFERENCES alert_history(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(512) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_alert_history_id ON notification_logs(alert_history_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert test user
INSERT INTO users (id, email) VALUES
  ('test-user-123', 'test@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert test device
INSERT INTO user_devices (user_id, device_token, platform, device_name) VALUES
  ('test-user-123', 'test-device-token-123', 'ios', 'Test iPhone')
ON CONFLICT (id) DO NOTHING;

-- Insert test alert rule
INSERT INTO alert_rules (user_id, name, description, alert_type, conditions, channels, webhook_url) VALUES
  ('test-user-123', 'ETH Price Alert', 'Alert when ETH price exceeds $2000', 'price_change', 
   '{"metric": "price", "operator": "gt", "threshold": 2000}'::jsonb,
   ARRAY['email', 'webhook', 'push'],
   'https://example.com/webhook')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Cleanup (for testing)
-- ============================================================================

-- Function to cleanup test data
CREATE OR REPLACE FUNCTION cleanup_test_data(p_user_id VARCHAR(255))
RETURNS VOID AS $$
BEGIN
  DELETE FROM notification_logs WHERE alert_history_id IN (
    SELECT id FROM alert_history WHERE user_id = p_user_id
  );
  DELETE FROM alert_history WHERE user_id = p_user_id;
  DELETE FROM alert_rules WHERE user_id = p_user_id;
  DELETE FROM user_devices WHERE user_id = p_user_id;
  DELETE FROM users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views (for reporting)
-- ============================================================================

-- View for alert statistics
CREATE OR REPLACE VIEW alert_statistics AS
SELECT
  u.id AS user_id,
  u.email,
  COUNT(DISTINCT ar.id) AS total_rules,
  COUNT(DISTINCT CASE WHEN ar.enabled THEN ar.id END) AS active_rules,
  COUNT(DISTINCT ah.id) AS total_alerts,
  COUNT(DISTINCT CASE WHEN ah.triggered_at > NOW() - INTERVAL '24 hours' THEN ah.id END) AS alerts_24h,
  COUNT(DISTINCT nl.id) AS total_notifications,
  COUNT(DISTINCT CASE WHEN nl.status = 'delivered' THEN nl.id END) AS delivered_notifications
FROM users u
LEFT JOIN alert_rules ar ON u.id = ar.user_id
LEFT JOIN alert_history ah ON u.id = ah.user_id
LEFT JOIN notification_logs nl ON ah.id = nl.alert_history_id
GROUP BY u.id, u.email;

-- ============================================================================
-- Permissions (for production)
-- ============================================================================

-- Grant permissions to application user (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

