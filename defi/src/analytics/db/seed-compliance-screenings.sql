-- Seed data for compliance_screenings table
-- Story: 3.2.3 - Compliance Monitoring
-- Phase 1: Database Setup

-- Clear existing data
TRUNCATE TABLE compliance_screenings CASCADE;

-- Insert test data for sanctions screening
INSERT INTO compliance_screenings (
  screening_type,
  wallet_address,
  chain_id,
  screening_result,
  risk_level,
  risk_score,
  sanctions_match,
  sanctions_list,
  pep_match,
  adverse_media,
  match_details,
  screening_provider,
  screening_timestamp,
  screening_version,
  alert_generated,
  manual_review_required,
  review_status
) VALUES
-- Clear wallets
('comprehensive', '0x1234567890123456789012345678901234567890', 'ethereum', 'clear', 'low', 5.00, FALSE, NULL, FALSE, FALSE, 
 '{"sanctions": {"match": false}, "pep": {"match": false}, "adverse_media": {"match": false}}'::jsonb,
 'internal', NOW() - INTERVAL '1 hour', '1.0', FALSE, FALSE, NULL),

('comprehensive', '0x2345678901234567890123456789012345678901', 'polygon', 'clear', 'low', 3.50, FALSE, NULL, FALSE, FALSE,
 '{"sanctions": {"match": false}, "pep": {"match": false}, "adverse_media": {"match": false}}'::jsonb,
 'internal', NOW() - INTERVAL '2 hours', '1.0', FALSE, FALSE, NULL),

-- Flagged for sanctions
('sanctions', '0x3456789012345678901234567890123456789012', 'ethereum', 'flagged', 'critical', 95.00, TRUE, 'OFAC SDN', FALSE, FALSE,
 '{"sanctions": {"match": true, "list": "OFAC SDN", "confidence": 100, "entity": "Sanctioned Entity A", "program": "CYBER2"}}'::jsonb,
 'internal', NOW() - INTERVAL '3 hours', '1.0', TRUE, TRUE, 'pending'),

('sanctions', '0x4567890123456789012345678901234567890123', 'bsc', 'flagged', 'critical', 98.00, TRUE, 'UN Sanctions', FALSE, FALSE,
 '{"sanctions": {"match": true, "list": "UN Sanctions", "confidence": 100, "entity": "Sanctioned Entity B", "program": "DPRK"}}'::jsonb,
 'internal', NOW() - INTERVAL '4 hours', '1.0', TRUE, TRUE, 'pending'),

-- Flagged for PEP
('pep', '0x5678901234567890123456789012345678901234', 'ethereum', 'flagged', 'high', 75.00, FALSE, NULL, TRUE, FALSE,
 '{"pep": {"match": true, "category": "government", "position": "Minister of Finance", "country": "Country A", "confidence": 85}}'::jsonb,
 'internal', NOW() - INTERVAL '5 hours', '1.0', TRUE, TRUE, 'under_review'),

('pep', '0x6789012345678901234567890123456789012345', 'polygon', 'flagged', 'high', 70.00, FALSE, NULL, TRUE, FALSE,
 '{"pep": {"match": true, "category": "military", "position": "General", "country": "Country B", "confidence": 80}}'::jsonb,
 'internal', NOW() - INTERVAL '6 hours', '1.0', TRUE, TRUE, 'approved'),

-- Flagged for adverse media
('adverse_media', '0x7890123456789012345678901234567890123456', 'ethereum', 'flagged', 'medium', 55.00, FALSE, NULL, FALSE, TRUE,
 '{"adverse_media": {"match": true, "count": 3, "high_severity": 1, "categories": ["fraud", "scam"], "sources": ["News A", "News B"]}}'::jsonb,
 'internal', NOW() - INTERVAL '7 hours', '1.0', TRUE, FALSE, NULL),

('adverse_media', '0x8901234567890123456789012345678901234567', 'bsc', 'flagged', 'medium', 60.00, FALSE, NULL, FALSE, TRUE,
 '{"adverse_media": {"match": true, "count": 5, "high_severity": 2, "categories": ["money_laundering", "sanctions"], "sources": ["News C", "News D", "News E"]}}'::jsonb,
 'internal', NOW() - INTERVAL '8 hours', '1.0', TRUE, TRUE, 'pending'),

-- AML monitoring results
('aml', '0x9012345678901234567890123456789012345678', 'ethereum', 'flagged', 'high', 80.00, FALSE, NULL, FALSE, FALSE,
 '{"aml": {"structuring": true, "layering": false, "high_risk_jurisdiction": true, "details": {"structuring_score": 85, "layering_score": 20, "jurisdiction_score": 90}}}'::jsonb,
 'internal', NOW() - INTERVAL '9 hours', '1.0', TRUE, TRUE, 'under_review'),

('aml', '0x0123456789012345678901234567890123456789', 'polygon', 'flagged', 'medium', 65.00, FALSE, NULL, FALSE, FALSE,
 '{"aml": {"structuring": false, "layering": true, "high_risk_jurisdiction": false, "details": {"structuring_score": 30, "layering_score": 75, "jurisdiction_score": 40}}}'::jsonb,
 'internal', NOW() - INTERVAL '10 hours', '1.0', TRUE, FALSE, NULL),

-- Comprehensive screening with multiple flags
('comprehensive', '0xabcdef0123456789abcdef0123456789abcdef01', 'ethereum', 'flagged', 'critical', 92.00, TRUE, 'EU Sanctions', TRUE, TRUE,
 '{"sanctions": {"match": true, "list": "EU Sanctions", "confidence": 95}, "pep": {"match": true, "category": "judicial", "confidence": 80}, "adverse_media": {"match": true, "count": 8, "high_severity": 4}}'::jsonb,
 'internal', NOW() - INTERVAL '11 hours', '1.0', TRUE, TRUE, 'rejected'),

('comprehensive', '0xfedcba9876543210fedcba9876543210fedcba98', 'bsc', 'flagged', 'high', 78.00, FALSE, NULL, TRUE, TRUE,
 '{"sanctions": {"match": false}, "pep": {"match": true, "category": "government", "confidence": 75}, "adverse_media": {"match": true, "count": 4, "high_severity": 2}}'::jsonb,
 'internal', NOW() - INTERVAL '12 hours', '1.0', TRUE, TRUE, 'under_review'),

-- KYC verification results
('kyc', '0x1111111111111111111111111111111111111111', 'ethereum', 'clear', 'low', 10.00, FALSE, NULL, FALSE, FALSE,
 '{"kyc": {"status": "verified", "level": "enhanced", "document_verified": true, "pep_check": false, "adverse_media_check": false}}'::jsonb,
 'internal', NOW() - INTERVAL '13 hours', '1.0', FALSE, FALSE, NULL),

('kyc', '0x2222222222222222222222222222222222222222', 'polygon', 'review_required', 'medium', 45.00, FALSE, NULL, FALSE, FALSE,
 '{"kyc": {"status": "pending", "level": "basic", "document_verified": false, "pep_check": false, "adverse_media_check": false}}'::jsonb,
 'internal', NOW() - INTERVAL '14 hours', '1.0', FALSE, TRUE, 'pending'),

-- Recent screenings (last 24 hours)
('comprehensive', '0x3333333333333333333333333333333333333333', 'ethereum', 'clear', 'low', 8.00, FALSE, NULL, FALSE, FALSE,
 '{"sanctions": {"match": false}, "pep": {"match": false}, "adverse_media": {"match": false}}'::jsonb,
 'internal', NOW() - INTERVAL '30 minutes', '1.0', FALSE, FALSE, NULL),

('comprehensive', '0x4444444444444444444444444444444444444444', 'polygon', 'clear', 'low', 6.50, FALSE, NULL, FALSE, FALSE,
 '{"sanctions": {"match": false}, "pep": {"match": false}, "adverse_media": {"match": false}}'::jsonb,
 'internal', NOW() - INTERVAL '15 minutes', '1.0', FALSE, FALSE, NULL),

('sanctions', '0x5555555555555555555555555555555555555555', 'bsc', 'flagged', 'critical', 100.00, TRUE, 'OFAC SDN', FALSE, FALSE,
 '{"sanctions": {"match": true, "list": "OFAC SDN", "confidence": 100, "entity": "Sanctioned Entity C", "program": "IRAN"}}'::jsonb,
 'internal', NOW() - INTERVAL '5 minutes', '1.0', TRUE, TRUE, 'pending'),

-- Transaction-based screenings (using wallet_address field for sender)
('comprehensive', '0x1234567890123456789012345678901234567890', 'ethereum', 'clear', 'low', 12.00, FALSE, NULL, FALSE, FALSE,
 '{"sanctions": {"match": false}, "pep": {"match": false}, "adverse_media": {"match": false}, "transaction": {"hash": "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc12345", "from": "0x1234567890123456789012345678901234567890", "to": "0x2345678901234567890123456789012345678901", "value": "1000000000000000000"}}'::jsonb,
 'internal', NOW() - INTERVAL '20 minutes', '1.0', FALSE, FALSE, NULL),

('comprehensive', '0x3456789012345678901234567890123456789012', 'polygon', 'flagged', 'high', 85.00, TRUE, 'OFAC SDN', FALSE, FALSE,
 '{"sanctions": {"match": true, "list": "OFAC SDN", "confidence": 95}, "pep": {"match": false}, "adverse_media": {"match": false}, "transaction": {"hash": "0xdef456abc123def456abc123def456abc123def456abc123def456abc123def45678", "from": "0x3456789012345678901234567890123456789012", "to": "0x4567890123456789012345678901234567890123", "value": "5000000000000000000"}}'::jsonb,
 'internal', NOW() - INTERVAL '10 minutes', '1.0', TRUE, TRUE, 'pending');

-- Verify data
SELECT 
  screening_type,
  COUNT(*) as count,
  COUNT(CASE WHEN screening_result = 'flagged' THEN 1 END) as flagged_count,
  COUNT(CASE WHEN screening_result = 'clear' THEN 1 END) as clear_count,
  COUNT(CASE WHEN manual_review_required = TRUE THEN 1 END) as review_required_count
FROM compliance_screenings
GROUP BY screening_type
ORDER BY screening_type;

SELECT 'Compliance screenings seed data inserted successfully' as status;

