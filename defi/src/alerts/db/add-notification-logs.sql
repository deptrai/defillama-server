-- Add notification_logs table
-- Version: 1.0
-- Date: 2025-10-14

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

