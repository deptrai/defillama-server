-- Migration 043: Create MEV Detector Metrics Tables
-- Purpose: Track detector accuracy, performance, and validation
-- Story: 4.1.1 - MEV Opportunity Detection (Accuracy Optimization)

-- ============================================================================
-- Detector Metrics Table
-- Tracks daily metrics for each detector type
-- ============================================================================

CREATE TABLE IF NOT EXISTS mev_detector_metrics (
  id SERIAL PRIMARY KEY,
  detector_type VARCHAR(50) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  
  -- Detection counts
  total_detections INTEGER DEFAULT 0,
  true_positives INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,
  
  -- Accuracy metrics
  precision DECIMAL(5,2), -- TP / (TP + FP)
  recall DECIMAL(5,2),    -- TP / (TP + FN)
  f1_score DECIMAL(5,2),  -- 2 * (precision * recall) / (precision + recall)
  accuracy DECIMAL(5,2),  -- (TP + TN) / (TP + TN + FP + FN)
  
  -- Confidence metrics
  avg_confidence DECIMAL(5,2),
  min_confidence DECIMAL(5,2),
  max_confidence DECIMAL(5,2),
  
  -- Profit metrics
  total_profit_usd DECIMAL(15,2),
  avg_profit_usd DECIMAL(15,2),
  min_profit_usd DECIMAL(15,2),
  max_profit_usd DECIMAL(15,2),
  
  -- Performance metrics
  avg_detection_time_ms INTEGER,
  total_detection_time_ms BIGINT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(detector_type, chain_id, date)
);

CREATE INDEX idx_detector_metrics_type_date ON mev_detector_metrics(detector_type, date);
CREATE INDEX idx_detector_metrics_chain_date ON mev_detector_metrics(chain_id, date);

-- ============================================================================
-- Detection Validation Table
-- Tracks validation of individual detections
-- ============================================================================

CREATE TABLE IF NOT EXISTS mev_detection_validations (
  id SERIAL PRIMARY KEY,
  opportunity_id VARCHAR(100) NOT NULL REFERENCES mev_opportunities(opportunity_id),
  detector_type VARCHAR(50) NOT NULL,
  
  -- Validation status
  validation_status VARCHAR(20) NOT NULL, -- 'pending', 'validated', 'rejected'
  is_true_positive BOOLEAN,
  validation_method VARCHAR(50), -- 'manual', 'automatic', 'on_chain'
  
  -- Actual vs predicted
  predicted_profit_usd DECIMAL(15,2),
  actual_profit_usd DECIMAL(15,2),
  profit_accuracy_percentage DECIMAL(5,2),
  
  predicted_confidence DECIMAL(5,2),
  actual_confidence DECIMAL(5,2),
  
  -- Validation details
  validation_notes TEXT,
  validated_by VARCHAR(100),
  validated_at TIMESTAMP,
  
  -- On-chain verification
  on_chain_verified BOOLEAN DEFAULT FALSE,
  on_chain_tx_hash VARCHAR(100),
  on_chain_block_number BIGINT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_detection_validations_opportunity ON mev_detection_validations(opportunity_id);
CREATE INDEX idx_detection_validations_detector ON mev_detection_validations(detector_type);
CREATE INDEX idx_detection_validations_status ON mev_detection_validations(validation_status);

-- ============================================================================
-- Detector Configuration History
-- Tracks changes to detector configurations over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS mev_detector_config_history (
  id SERIAL PRIMARY KEY,
  detector_type VARCHAR(50) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Configuration parameters
  min_profit_usd DECIMAL(15,2),
  min_confidence_score DECIMAL(5,2),
  gas_price_premium_threshold DECIMAL(5,2),
  max_timeframe_seconds INTEGER,
  
  -- Additional config (JSON)
  config_json JSONB,
  
  -- Change tracking
  changed_by VARCHAR(100),
  change_reason TEXT,
  
  -- Timestamps
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_detector_config_history_type ON mev_detector_config_history(detector_type);
CREATE INDEX idx_detector_config_history_effective ON mev_detector_config_history(effective_from, effective_to);

-- ============================================================================
-- Confidence Factor Breakdown
-- Stores detailed confidence factor scores for analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS mev_confidence_factors (
  id SERIAL PRIMARY KEY,
  opportunity_id VARCHAR(100) NOT NULL REFERENCES mev_opportunities(opportunity_id),
  
  -- Overall confidence
  overall_confidence DECIMAL(5,2) NOT NULL,
  confidence_level VARCHAR(20), -- 'very_low', 'low', 'medium', 'high', 'very_high'
  
  -- Individual factor scores
  gas_price_score DECIMAL(5,2),
  timing_score DECIMAL(5,2),
  volume_score DECIMAL(5,2),
  liquidity_score DECIMAL(5,2),
  historical_score DECIMAL(5,2),
  
  -- Factor weights used
  gas_price_weight DECIMAL(3,2),
  timing_weight DECIMAL(3,2),
  volume_weight DECIMAL(3,2),
  liquidity_weight DECIMAL(3,2),
  historical_weight DECIMAL(3,2),
  
  -- Factors breakdown (JSON)
  factors_breakdown JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_confidence_factors_opportunity ON mev_confidence_factors(opportunity_id);
CREATE INDEX idx_confidence_factors_level ON mev_confidence_factors(confidence_level);

-- ============================================================================
-- Profit Tier Statistics
-- Tracks performance by profit tier
-- ============================================================================

CREATE TABLE IF NOT EXISTS mev_profit_tier_stats (
  id SERIAL PRIMARY KEY,
  detector_type VARCHAR(50) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  profit_tier VARCHAR(20) NOT NULL, -- 'micro', 'small', 'medium', 'large', 'whale'
  date DATE NOT NULL,
  
  -- Counts
  total_opportunities INTEGER DEFAULT 0,
  successful_opportunities INTEGER DEFAULT 0,
  
  -- Metrics
  avg_confidence DECIMAL(5,2),
  avg_profit_usd DECIMAL(15,2),
  total_profit_usd DECIMAL(15,2),
  success_rate DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(detector_type, chain_id, profit_tier, date)
);

CREATE INDEX idx_profit_tier_stats_type_tier ON mev_profit_tier_stats(detector_type, profit_tier);
CREATE INDEX idx_profit_tier_stats_date ON mev_profit_tier_stats(date);

-- ============================================================================
-- Network Congestion Metrics
-- Tracks detector performance under different network conditions
-- ============================================================================

CREATE TABLE IF NOT EXISTS mev_network_congestion_metrics (
  id SERIAL PRIMARY KEY,
  chain_id VARCHAR(50) NOT NULL,
  congestion_level VARCHAR(20) NOT NULL, -- 'low', 'normal', 'high', 'extreme'
  date DATE NOT NULL,
  hour INTEGER NOT NULL, -- 0-23
  
  -- Network metrics
  avg_gas_price_gwei DECIMAL(10,2),
  median_gas_price_gwei DECIMAL(10,2),
  max_gas_price_gwei DECIMAL(10,2),
  
  -- Detection metrics
  total_detections INTEGER DEFAULT 0,
  avg_confidence DECIMAL(5,2),
  avg_profit_usd DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(chain_id, congestion_level, date, hour)
);

CREATE INDEX idx_congestion_metrics_chain_date ON mev_network_congestion_metrics(chain_id, date);
CREATE INDEX idx_congestion_metrics_level ON mev_network_congestion_metrics(congestion_level);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE mev_detector_metrics IS 'Daily accuracy metrics for each MEV detector type';
COMMENT ON TABLE mev_detection_validations IS 'Validation records for individual MEV detections';
COMMENT ON TABLE mev_detector_config_history IS 'Historical record of detector configuration changes';
COMMENT ON TABLE mev_confidence_factors IS 'Detailed confidence factor breakdown for each detection';
COMMENT ON TABLE mev_profit_tier_stats IS 'Performance statistics by profit tier';
COMMENT ON TABLE mev_network_congestion_metrics IS 'Detector performance under different network conditions';

