/**
 * Simple Compliance API Server (Pure JavaScript)
 * No TypeScript, no complex dependencies
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection (use environment variables or defaults)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'defillama',
  password: process.env.DB_PASSWORD || 'defillama123',
  database: process.env.DB_NAME || 'defillama',
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

// Mock screening function
function mockScreenWallet(walletAddress) {
  const addressLower = walletAddress.toLowerCase();
  
  let screeningResult = 'clear';
  let riskLevel = 'low';
  let riskScore = 10.0;
  let sanctions = { match: false, list: null, confidence: 0 };
  let aml = { 
    riskScore: 10, 
    structuringDetected: false, 
    layeringDetected: false, 
    highRiskJurisdiction: false 
  };
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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
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

    console.log(`📝 Screening wallet: ${wallet_address} on chain: ${chain_id}`);

    // Perform screening
    const screeningResult = mockScreenWallet(wallet_address);

    // Save to database (simplified to match actual schema)
    const matchDetails = {
      sanctions: screeningResult.sanctions,
      aml: screeningResult.aml,
      kyc: screeningResult.kyc,
      pep: screeningResult.pep,
      adverseMedia: screeningResult.adverseMedia,
    };

    const query = `
      INSERT INTO compliance_screenings (
        screening_type, wallet_address, chain_id, screening_result,
        risk_level, risk_score, sanctions_match, sanctions_list,
        pep_match, adverse_media, match_details, screening_timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
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
      screeningResult.pep.match,
      screeningResult.adverseMedia.match,
      JSON.stringify(matchDetails),
    ];

    const result = await pool.query(query, values);
    const screeningId = result.rows[0].id;

    console.log(`✅ Screening saved with ID: ${screeningId}`);

    res.json({
      success: true,
      data: {
        id: screeningId,
        walletAddress: wallet_address,
        chainId: chain_id,
        ...screeningResult,
      },
    });
  } catch (error) {
    console.error('❌ Error screening wallet:', error);
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

    console.log(`📝 Batch screening ${wallet_addresses.length} wallets on chain: ${chain_id}`);

    const results = await Promise.all(
      wallet_addresses.map(async (address) => {
        try {
          const screeningResult = mockScreenWallet(address);
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

    console.log(`✅ Batch screening complete: ${results.length} results`);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('❌ Error batch screening:', error);
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
  } catch (error) {
    console.error('❌ Error getting screening:', error);
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
    const values = [];
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
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM compliance_screenings WHERE 1=1';
    const countValues = [];
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
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('❌ Error listing screenings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(port, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log('✅ Compliance API Server Running');
  console.log('🚀 ========================================');
  console.log('');
  console.log(`📍 Server: http://localhost:${port}`);
  console.log(`📍 Health: http://localhost:${port}/health`);
  console.log('');
  console.log('📋 Endpoints:');
  console.log(`  POST   /v1/risk/compliance/screen`);
  console.log(`  POST   /v1/risk/compliance/screen/batch`);
  console.log(`  GET    /v1/risk/compliance/screenings/:id`);
  console.log(`  GET    /v1/risk/compliance/screenings`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

