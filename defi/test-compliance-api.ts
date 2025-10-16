/**
 * Simple test server for Compliance Monitoring API
 * This bypasses the full API2 server and directly tests the compliance endpoints
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'defillama',
  password: 'defillama123',
  database: 'defillama',
});

// Mock screening function (simplified for testing)
async function mockScreenWallet(walletAddress: string) {
  // Determine screening result based on address
  const addressLower = walletAddress.toLowerCase();

  let screeningResult = 'clear';
  let riskLevel = 'low';
  let riskScore = 10.0;
  let sanctions = { match: false, list: null, confidence: 0 };
  let aml = { riskScore: 10, structuringDetected: false, layeringDetected: false, highRiskJurisdiction: false };
  let kyc = { status: 'verified', verificationLevel: 'basic' };
  let pep = { match: false, category: null, relationship: null, confidence: 0 };
  let adverseMedia = { match: false, mentionType: null, severity: null, confidence: 0 };

  // Flagged (Sanctions)
  if (addressLower.includes('1234567890')) {
    screeningResult = 'flagged';
    riskLevel = 'critical';
    riskScore = 40.0;
    sanctions = { match: true, list: 'OFAC SDN', confidence: 95 };
    aml.riskScore = 30;
  }
  // Review (PEP)
  else if (addressLower.includes('5678901234')) {
    screeningResult = 'review_required';
    riskLevel = 'medium';
    riskScore = 30.0;
    pep = { match: true, category: 'government', relationship: 'direct', confidence: 85 };
    aml.riskScore = 20;
  }
  // Review (Adverse Media)
  else if (addressLower.includes('7890123456')) {
    screeningResult = 'review_required';
    riskLevel = 'medium';
    riskScore = 25.0;
    adverseMedia = { match: true, mentionType: 'fraud', severity: 'medium', confidence: 75 };
    aml.riskScore = 15;
  }

  return {
    screeningResult,
    riskLevel,
    riskScore,
    sanctions,
    aml,
    kyc,
    pep,
    adverseMedia,
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Screen single wallet
app.post('/v1/risk/compliance/screen', async (req, res) => {
  try {
    const { wallet_address, chain_id = 'ethereum' } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'wallet_address is required',
      });
    }

    console.log(`Screening wallet: ${wallet_address} on chain: ${chain_id}`);

    // Perform screening
    const screeningResult = await mockScreenWallet(wallet_address);

    // Save to database
    const query = `
      INSERT INTO compliance_screenings (
        screening_type, wallet_address, chain_id, screening_result,
        risk_level, risk_score, sanctions_match, sanctions_list,
        sanctions_confidence, aml_risk_score, aml_structuring_detected,
        aml_layering_detected, aml_high_risk_jurisdiction, kyc_status,
        kyc_verification_level, pep_match, pep_category, pep_relationship,
        pep_confidence, adverse_media_match, adverse_media_mention_type,
        adverse_media_severity, adverse_media_confidence, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, NOW()
      ) RETURNING id
    `;

    const values = [
      'comprehensive',
      wallet_address,
      chain_id,
      screeningResult.screeningResult,
      screeningResult.riskLevel,
      screeningResult.riskScore,
      screeningResult.sanctions.match,
      screeningResult.sanctions.list,
      screeningResult.sanctions.confidence,
      screeningResult.aml.riskScore,
      screeningResult.aml.structuringDetected,
      screeningResult.aml.layeringDetected,
      screeningResult.aml.highRiskJurisdiction,
      screeningResult.kyc.status,
      screeningResult.kyc.verificationLevel,
      screeningResult.pep.match,
      screeningResult.pep.category,
      screeningResult.pep.relationship,
      screeningResult.pep.confidence,
      screeningResult.adverseMedia.match,
      screeningResult.adverseMedia.mentionType,
      screeningResult.adverseMedia.severity,
      screeningResult.adverseMedia.confidence,
    ];

    const result = await pool.query(query, values);
    const screeningId = result.rows[0].id;

    res.json({
      success: true,
      data: {
        id: screeningId,
        walletAddress: wallet_address,
        chainId: chain_id,
        ...screeningResult,
      },
    });
  } catch (error: any) {
    console.error('Error screening wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Batch screen wallets
app.post('/v1/risk/compliance/screen/batch', async (req, res) => {
  try {
    const { wallet_addresses, chain_id = 'ethereum' } = req.body;

    if (!wallet_addresses || !Array.isArray(wallet_addresses)) {
      return res.status(400).json({
        success: false,
        error: 'wallet_addresses must be an array',
      });
    }

    if (wallet_addresses.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 addresses per batch',
      });
    }

    console.log(`Batch screening ${wallet_addresses.length} wallets on chain: ${chain_id}`);

    const results = await Promise.all(
      wallet_addresses.map(async (address) => {
        try {
          const screeningResult = await mockScreenWallet(address);
          return {
            walletAddress: address,
            chainId: chain_id,
            ...screeningResult,
          };
        } catch (error) {
          return {
            walletAddress: address,
            chainId: chain_id,
            error: error.message,
          };
        }
      })
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error batch screening:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Get screening by ID
app.get('/v1/risk/compliance/screenings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM compliance_screenings WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Screening not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error getting screening:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// List screenings
app.get('/v1/risk/compliance/screenings', async (req, res) => {
  try {
    const {
      limit = '10',
      offset = '0',
      wallet_address,
      chain_id,
      screening_result,
      risk_level,
    } = req.query;

    let query = 'SELECT * FROM compliance_screenings WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (wallet_address) {
      query += ` AND wallet_address = $${paramIndex}`;
      values.push(wallet_address);
      paramIndex++;
    }

    if (chain_id) {
      query += ` AND chain_id = $${paramIndex}`;
      values.push(chain_id);
      paramIndex++;
    }

    if (screening_result) {
      query += ` AND screening_result = $${paramIndex}`;
      values.push(screening_result);
      paramIndex++;
    }

    if (risk_level) {
      query += ` AND risk_level = $${paramIndex}`;
      values.push(risk_level);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM compliance_screenings WHERE 1=1';
    const countValues: any[] = [];
    let countParamIndex = 1;

    if (wallet_address) {
      countQuery += ` AND wallet_address = $${countParamIndex}`;
      countValues.push(wallet_address);
      countParamIndex++;
    }

    if (chain_id) {
      countQuery += ` AND chain_id = $${countParamIndex}`;
      countValues.push(chain_id);
      countParamIndex++;
    }

    if (screening_result) {
      countQuery += ` AND screening_result = $${countParamIndex}`;
      countValues.push(screening_result);
      countParamIndex++;
    }

    if (risk_level) {
      countQuery += ` AND risk_level = $${countParamIndex}`;
      countValues.push(risk_level);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error('Error listing screenings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Compliance API test server running on http://localhost:${port}`);
  console.log(`✅ Health check: http://localhost:${port}/health`);
  console.log(`✅ Screen wallet: POST http://localhost:${port}/v1/risk/compliance/screen`);
  console.log(`✅ Batch screen: POST http://localhost:${port}/v1/risk/compliance/screen/batch`);
  console.log(`✅ Get screening: GET http://localhost:${port}/v1/risk/compliance/screenings/:id`);
  console.log(`✅ List screenings: GET http://localhost:${port}/v1/risk/compliance/screenings`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

