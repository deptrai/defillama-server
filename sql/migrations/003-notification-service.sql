-- Migration 003: Notification Service
-- Story 1.3: Alert Engine and Notification System - Phase 6.3
-- Date: 2025-10-14

-- ============================================================================
-- 1. Update alert_rules table - Add webhook_url
-- ============================================================================

ALTER TABLE alert_rules
ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500);

COMMENT ON COLUMN alert_rules.webhook_url IS 'Webhook URL for webhook notifications';

-- ============================================================================
-- 2. Update alert_history table - Add error_details
-- ============================================================================

ALTER TABLE alert_history
ADD COLUMN IF NOT EXISTS error_details JSONB;

COMMENT ON COLUMN alert_history.error_details IS 'Error details for failed notification deliveries';

-- ============================================================================
-- 3. Create user_devices table - For push notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  device_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name VARCHAR(255),
  app_version VARCHAR(50),
  os_version VARCHAR(50),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_enabled ON user_devices(enabled);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_devices_token ON user_devices(device_token);

-- Comments
COMMENT ON TABLE user_devices IS 'User device tokens for push notifications';
COMMENT ON COLUMN user_devices.id IS 'Unique device identifier';
COMMENT ON COLUMN user_devices.user_id IS 'User identifier';
COMMENT ON COLUMN user_devices.device_token IS 'Device token for push notifications (APNS/FCM)';
COMMENT ON COLUMN user_devices.platform IS 'Device platform: ios or android';
COMMENT ON COLUMN user_devices.device_name IS 'Device name (e.g., iPhone 13 Pro)';
COMMENT ON COLUMN user_devices.app_version IS 'App version';
COMMENT ON COLUMN user_devices.os_version IS 'OS version';
COMMENT ON COLUMN user_devices.enabled IS 'Whether device is enabled for notifications';

-- ============================================================================
-- 4. Verify users table has email column
-- ============================================================================

-- Check if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
      ALTER TABLE users ADD COLUMN email VARCHAR(255);
      CREATE INDEX idx_users_email ON users(email);
      COMMENT ON COLUMN users.email IS 'User email address for notifications';
    END IF;
  ELSE
    -- Create users table if it doesn't exist
    CREATE TABLE users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255),
      username VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX idx_users_email ON users(email);
    
    COMMENT ON TABLE users IS 'User accounts';
    COMMENT ON COLUMN users.id IS 'User identifier';
    COMMENT ON COLUMN users.email IS 'User email address for notifications';
    COMMENT ON COLUMN users.username IS 'Username';
  END IF;
END $$;

-- ============================================================================
-- 5. Create notification_templates table (optional, for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  alert_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'webhook', 'push')),
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_alert_type ON notification_templates(alert_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);

-- Comments
COMMENT ON TABLE notification_templates IS 'Notification templates for different alert types and channels';
COMMENT ON COLUMN notification_templates.name IS 'Template name';
COMMENT ON COLUMN notification_templates.alert_type IS 'Alert type (price_change, tvl_change, etc.)';
COMMENT ON COLUMN notification_templates.channel IS 'Notification channel (email, webhook, push)';
COMMENT ON COLUMN notification_templates.subject_template IS 'Subject template (for email)';
COMMENT ON COLUMN notification_templates.body_template IS 'Body template with variables';
COMMENT ON COLUMN notification_templates.variables IS 'Available variables for template';

-- ============================================================================
-- 6. Insert default notification templates
-- ============================================================================

INSERT INTO notification_templates (name, alert_type, channel, subject_template, body_template, variables)
VALUES
  -- Email templates
  (
    'price_change_email',
    'price_change',
    'email',
    'Alert: {{token_symbol}} Price {{direction}}',
    '<h2>Price Alert: {{rule_name}}</h2>
<p>{{message}}</p>
<table>
  <tr><td><strong>Token:</strong></td><td>{{token_symbol}}</td></tr>
  <tr><td><strong>Current Price:</strong></td><td>${{triggered_value}}</td></tr>
  <tr><td><strong>Threshold:</strong></td><td>${{threshold_value}}</td></tr>
  <tr><td><strong>Time:</strong></td><td>{{timestamp}}</td></tr>
</table>',
    '{"token_symbol": "string", "triggered_value": "number", "threshold_value": "number", "message": "string", "timestamp": "string", "rule_name": "string", "direction": "string"}'
  ),
  (
    'tvl_change_email',
    'tvl_change',
    'email',
    'Alert: {{protocol_name}} TVL {{direction}}',
    '<h2>TVL Alert: {{rule_name}}</h2>
<p>{{message}}</p>
<table>
  <tr><td><strong>Protocol:</strong></td><td>{{protocol_name}}</td></tr>
  <tr><td><strong>Current TVL:</strong></td><td>${{triggered_value}}</td></tr>
  <tr><td><strong>Threshold:</strong></td><td>${{threshold_value}}</td></tr>
  <tr><td><strong>Time:</strong></td><td>{{timestamp}}</td></tr>
</table>',
    '{"protocol_name": "string", "triggered_value": "number", "threshold_value": "number", "message": "string", "timestamp": "string", "rule_name": "string", "direction": "string"}'
  ),
  
  -- Webhook templates
  (
    'price_change_webhook',
    'price_change',
    'webhook',
    NULL,
    '{"alert_type": "price_change", "rule_name": "{{rule_name}}", "token_symbol": "{{token_symbol}}", "current_price": {{triggered_value}}, "threshold": {{threshold_value}}, "message": "{{message}}", "timestamp": {{timestamp}}}',
    '{"token_symbol": "string", "triggered_value": "number", "threshold_value": "number", "message": "string", "timestamp": "number", "rule_name": "string"}'
  ),
  (
    'tvl_change_webhook',
    'tvl_change',
    'webhook',
    NULL,
    '{"alert_type": "tvl_change", "rule_name": "{{rule_name}}", "protocol_name": "{{protocol_name}}", "current_tvl": {{triggered_value}}, "threshold": {{threshold_value}}, "message": "{{message}}", "timestamp": {{timestamp}}}',
    '{"protocol_name": "string", "triggered_value": "number", "threshold_value": "number", "message": "string", "timestamp": "number", "rule_name": "string"}'
  ),
  
  -- Push templates
  (
    'price_change_push',
    'price_change',
    'push',
    '{{token_symbol}} Price Alert',
    '{{message}}',
    '{"token_symbol": "string", "message": "string"}'
  ),
  (
    'tvl_change_push',
    'tvl_change',
    'push',
    '{{protocol_name}} TVL Alert',
    '{{message}}',
    '{"protocol_name": "string", "message": "string"}'
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. Create notification_logs table (for debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_history_id UUID NOT NULL REFERENCES alert_history(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  recipient VARCHAR(500),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_alert_history_id ON notification_logs(alert_history_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- Comments
COMMENT ON TABLE notification_logs IS 'Detailed logs for notification deliveries';
COMMENT ON COLUMN notification_logs.alert_history_id IS 'Reference to alert_history';
COMMENT ON COLUMN notification_logs.channel IS 'Notification channel (email, webhook, push)';
COMMENT ON COLUMN notification_logs.status IS 'Delivery status';
COMMENT ON COLUMN notification_logs.recipient IS 'Recipient (email address, webhook URL, device token)';
COMMENT ON COLUMN notification_logs.error_message IS 'Error message if failed';
COMMENT ON COLUMN notification_logs.retry_count IS 'Number of retry attempts';
COMMENT ON COLUMN notification_logs.sent_at IS 'Timestamp when notification was sent';

-- ============================================================================
-- Migration Complete
-- ============================================================================

