-- Row Level Security (RLS) Policies for DeFiLlama
-- Implements defense-in-depth security with user-based and protocol-based access control

-- Enable RLS on all tables
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE tvl_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROTOCOLS TABLE POLICIES
-- ============================================================================

-- Public read access for protocols
CREATE POLICY "protocols_public_read" ON protocols
    FOR SELECT
    USING (true);

-- Only admins can insert protocols
CREATE POLICY "protocols_admin_insert" ON protocols
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Only admins can update protocols
CREATE POLICY "protocols_admin_update" ON protocols
    FOR UPDATE
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Only admins can delete protocols
CREATE POLICY "protocols_admin_delete" ON protocols
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- TVL_DATA TABLE POLICIES
-- ============================================================================

-- Public read access for TVL data
CREATE POLICY "tvl_data_public_read" ON tvl_data
    FOR SELECT
    USING (true);

-- Service accounts can insert TVL data
CREATE POLICY "tvl_data_service_insert" ON tvl_data
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- Service accounts can update TVL data
CREATE POLICY "tvl_data_service_update" ON tvl_data
    FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- Only admins can delete TVL data
CREATE POLICY "tvl_data_admin_delete" ON tvl_data
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- PRICE_DATA TABLE POLICIES
-- ============================================================================

-- Public read access for price data
CREATE POLICY "price_data_public_read" ON price_data
    FOR SELECT
    USING (true);

-- Service accounts can insert price data
CREATE POLICY "price_data_service_insert" ON price_data
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- Service accounts can update price data
CREATE POLICY "price_data_service_update" ON price_data
    FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- Only admins can delete price data
CREATE POLICY "price_data_admin_delete" ON price_data
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- ALERT_RULES TABLE POLICIES
-- ============================================================================

-- Users can read their own alert rules
CREATE POLICY "alert_rules_user_read" ON alert_rules
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can insert their own alert rules
CREATE POLICY "alert_rules_user_insert" ON alert_rules
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Users can update their own alert rules
CREATE POLICY "alert_rules_user_update" ON alert_rules
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can delete their own alert rules
CREATE POLICY "alert_rules_user_delete" ON alert_rules
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- ALERT_HISTORY TABLE POLICIES
-- ============================================================================

-- Users can read their own alert history
CREATE POLICY "alert_history_user_read" ON alert_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM alert_rules
            WHERE alert_rules.id = alert_history.rule_id
            AND alert_rules.user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Service accounts can insert alert history
CREATE POLICY "alert_history_service_insert" ON alert_history
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- Only admins can delete alert history
CREATE POLICY "alert_history_admin_delete" ON alert_history
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Users can read their own subscriptions
CREATE POLICY "user_subscriptions_user_read" ON user_subscriptions
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can insert their own subscriptions
CREATE POLICY "user_subscriptions_user_insert" ON user_subscriptions
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Users can update their own subscriptions
CREATE POLICY "user_subscriptions_user_update" ON user_subscriptions
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can delete their own subscriptions
CREATE POLICY "user_subscriptions_user_delete" ON user_subscriptions
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- NOTIFICATION_CHANNELS TABLE POLICIES
-- ============================================================================

-- Users can read their own notification channels
CREATE POLICY "notification_channels_user_read" ON notification_channels
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can insert their own notification channels
CREATE POLICY "notification_channels_user_insert" ON notification_channels
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Users can update their own notification channels
CREATE POLICY "notification_channels_user_update" ON notification_channels
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can delete their own notification channels
CREATE POLICY "notification_channels_user_delete" ON notification_channels
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- NOTIFICATION_HISTORY TABLE POLICIES
-- ============================================================================

-- Users can read their own notification history
CREATE POLICY "notification_history_user_read" ON notification_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM notification_channels
            WHERE notification_channels.id = notification_history.channel_id
            AND notification_channels.user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Service accounts can insert notification history
CREATE POLICY "notification_history_service_insert" ON notification_history
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- Only admins can delete notification history
CREATE POLICY "notification_history_admin_delete" ON notification_history
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- QUERY_CACHE TABLE POLICIES
-- ============================================================================

-- Public read access for query cache
CREATE POLICY "query_cache_public_read" ON query_cache
    FOR SELECT
    USING (true);

-- Service accounts can insert/update query cache
CREATE POLICY "query_cache_service_write" ON query_cache
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- ============================================================================
-- API_KEYS TABLE POLICIES
-- ============================================================================

-- Users can read their own API keys
CREATE POLICY "api_keys_user_read" ON api_keys
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can insert their own API keys
CREATE POLICY "api_keys_user_insert" ON api_keys
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Users can update their own API keys
CREATE POLICY "api_keys_user_update" ON api_keys
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can delete their own API keys
CREATE POLICY "api_keys_user_delete" ON api_keys
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================================================

-- Only admins can read audit logs
CREATE POLICY "audit_logs_admin_read" ON audit_logs
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Service accounts can insert audit logs
CREATE POLICY "audit_logs_service_insert" ON audit_logs
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('service', 'admin')
    );

-- No one can update or delete audit logs (immutable)
-- (No policies needed - RLS will deny by default)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is service account
CREATE OR REPLACE FUNCTION is_service()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' IN ('service', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_service() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_user_id() TO authenticated, service_role;

