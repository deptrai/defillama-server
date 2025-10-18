-- Migration: Create subscriptions table
-- Story: 1.1.2 - Configure Price Alert Thresholds
-- Purpose: Store user subscription tiers for alert limit enforcement
-- Date: 2025-10-18

-- ============================================================================
-- Table: subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id VARCHAR(255) NOT NULL,
  
  -- Subscription details
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'premium', 'enterprise')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  
  -- Billing
  billing_cycle VARCHAR(50) CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  amount_usd DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for user lookup (most common query)
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Index for active subscriptions lookup
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status) WHERE status = 'active';

-- Index for tier-based queries
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);

-- Index for billing date queries
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date) WHERE status = 'active';

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================================================
-- Seed Data for Testing
-- ============================================================================

-- Insert test subscriptions for E2E tests
INSERT INTO subscriptions (user_id, tier, status, billing_cycle, amount_usd, start_date)
VALUES
  -- Pro tier user (200 alert limit)
  ('test-user-123', 'pro', 'active', 'monthly', 25.00, NOW()),
  
  -- Premium tier user (unlimited alerts)
  ('test-user-premium', 'premium', 'active', 'monthly', 75.00, NOW()),
  
  -- Enterprise tier user (unlimited alerts)
  ('test-user-enterprise', 'enterprise', 'active', 'yearly', 5000.00, NOW()),
  
  -- Free tier user (no alerts)
  ('test-user-free', 'free', 'active', NULL, 0.00, NOW()),
  
  -- Inactive subscription
  ('test-user-inactive', 'pro', 'inactive', 'monthly', 25.00, NOW() - INTERVAL '1 month')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'User subscription tiers and billing information';
COMMENT ON COLUMN subscriptions.id IS 'Unique subscription ID';
COMMENT ON COLUMN subscriptions.user_id IS 'User ID from authentication system';
COMMENT ON COLUMN subscriptions.tier IS 'Subscription tier: free, basic, pro, premium, enterprise';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, inactive, cancelled, expired';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Billing frequency: monthly, yearly, lifetime';
COMMENT ON COLUMN subscriptions.amount_usd IS 'Subscription amount in USD';
COMMENT ON COLUMN subscriptions.start_date IS 'Subscription start date';
COMMENT ON COLUMN subscriptions.end_date IS 'Subscription end date (NULL for active)';
COMMENT ON COLUMN subscriptions.next_billing_date IS 'Next billing date';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'Cancellation timestamp';

