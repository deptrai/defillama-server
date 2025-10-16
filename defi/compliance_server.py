#!/usr/bin/env python3
"""
Simple Compliance API Server (Python Flask)
Fallback server for testing when Node.js has issues
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'defillama',
    'password': 'defillama123',
    'database': 'defillama'
}

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(**DB_CONFIG)

def mock_screen_wallet(wallet_address):
    """Mock screening function"""
    address_lower = wallet_address.lower()
    
    screening_result = 'clear'
    risk_level = 'low'
    risk_score = 10.0
    sanctions = {'match': False, 'list': None, 'confidence': 0}
    aml = {
        'riskScore': 10,
        'structuringDetected': False,
        'layeringDetected': False,
        'highRiskJurisdiction': False
    }
    kyc = {'status': 'verified', 'verificationLevel': 'basic'}
    pep = {'match': False, 'category': None, 'relationship': None, 'confidence': 0}
    adverse_media = {'match': False, 'mentionType': None, 'severity': None, 'confidence': 0}
    
    # Flagged (Sanctions)
    if '1234567890' in address_lower:
        screening_result = 'flagged'
        risk_level = 'critical'
        risk_score = 40.0
        sanctions = {'match': True, 'list': 'OFAC SDN', 'confidence': 95}
        aml['riskScore'] = 30
    # Review (PEP)
    elif '5678901234' in address_lower:
        screening_result = 'review_required'
        risk_level = 'medium'
        risk_score = 30.0
        pep = {'match': True, 'category': 'government', 'relationship': 'direct', 'confidence': 85}
        aml['riskScore'] = 20
    # Review (Adverse Media)
    elif '7890123456' in address_lower:
        screening_result = 'review_required'
        risk_level = 'medium'
        risk_score = 25.0
        adverse_media = {'match': True, 'mentionType': 'fraud', 'severity': 'medium', 'confidence': 75}
        aml['riskScore'] = 15
    
    return {
        'screeningResult': screening_result,
        'riskLevel': risk_level,
        'riskScore': risk_score,
        'sanctions': sanctions,
        'aml': aml,
        'kyc': kyc,
        'pep': pep,
        'adverseMedia': adverse_media
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected'
    })

@app.route('/v1/risk/compliance/screen', methods=['POST'])
def screen_wallet():
    """Screen single wallet"""
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address')
        chain_id = data.get('chain_id', 'ethereum')
        
        if not wallet_address:
            return jsonify({
                'success': False,
                'error': 'wallet_address is required'
            }), 400
        
        print(f'📝 Screening wallet: {wallet_address} on chain: {chain_id}')
        
        # Perform screening
        screening_result = mock_screen_wallet(wallet_address)
        
        # Save to database
        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            INSERT INTO compliance_screenings (
                screening_type, wallet_address, chain_id, screening_result,
                risk_level, risk_score, sanctions_match, sanctions_list,
                sanctions_confidence, aml_risk_score, aml_structuring_detected,
                aml_layering_detected, aml_high_risk_jurisdiction, kyc_status,
                kyc_verification_level, pep_match, pep_category, pep_relationship,
                pep_confidence, adverse_media_match, adverse_media_mention_type,
                adverse_media_severity, adverse_media_confidence, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            ) RETURNING id
        """
        
        values = (
            'comprehensive',
            wallet_address,
            chain_id,
            screening_result['screeningResult'],
            screening_result['riskLevel'],
            screening_result['riskScore'],
            screening_result['sanctions']['match'],
            screening_result['sanctions']['list'],
            screening_result['sanctions']['confidence'],
            screening_result['aml']['riskScore'],
            screening_result['aml']['structuringDetected'],
            screening_result['aml']['layeringDetected'],
            screening_result['aml']['highRiskJurisdiction'],
            screening_result['kyc']['status'],
            screening_result['kyc']['verificationLevel'],
            screening_result['pep']['match'],
            screening_result['pep']['category'],
            screening_result['pep']['relationship'],
            screening_result['pep']['confidence'],
            screening_result['adverseMedia']['match'],
            screening_result['adverseMedia']['mentionType'],
            screening_result['adverseMedia']['severity'],
            screening_result['adverseMedia']['confidence']
        )
        
        cur.execute(query, values)
        screening_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        print(f'✅ Screening saved with ID: {screening_id}')
        
        return jsonify({
            'success': True,
            'data': {
                'id': screening_id,
                'walletAddress': wallet_address,
                'chainId': chain_id,
                **screening_result
            }
        })
    
    except Exception as e:
        print(f'❌ Error screening wallet: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/v1/risk/compliance/screen/batch', methods=['POST'])
def batch_screen():
    """Batch screen wallets"""
    try:
        data = request.get_json()
        wallet_addresses = data.get('wallet_addresses', [])
        chain_id = data.get('chain_id', 'ethereum')
        
        if not isinstance(wallet_addresses, list):
            return jsonify({
                'success': False,
                'error': 'wallet_addresses must be an array'
            }), 400
        
        if len(wallet_addresses) > 100:
            return jsonify({
                'success': False,
                'error': 'Maximum 100 addresses per batch'
            }), 400
        
        print(f'📝 Batch screening {len(wallet_addresses)} wallets on chain: {chain_id}')
        
        results = []
        for address in wallet_addresses:
            try:
                screening_result = mock_screen_wallet(address)
                results.append({
                    'walletAddress': address,
                    'chainId': chain_id,
                    **screening_result
                })
            except Exception as e:
                results.append({
                    'walletAddress': address,
                    'chainId': chain_id,
                    'error': str(e)
                })
        
        print(f'✅ Batch screening complete: {len(results)} results')
        
        return jsonify({
            'success': True,
            'data': results
        })
    
    except Exception as e:
        print(f'❌ Error batch screening: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/v1/risk/compliance/screenings/<int:screening_id>', methods=['GET'])
def get_screening(screening_id):
    """Get screening by ID"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = 'SELECT * FROM compliance_screenings WHERE id = %s'
        cur.execute(query, (screening_id,))
        result = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not result:
            return jsonify({
                'success': False,
                'error': 'Screening not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': dict(result)
        })
    
    except Exception as e:
        print(f'❌ Error getting screening: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/v1/risk/compliance/screenings', methods=['GET'])
def list_screenings():
    """List screenings"""
    try:
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        wallet_address = request.args.get('wallet_address')
        chain_id = request.args.get('chain_id')
        screening_result = request.args.get('screening_result')
        risk_level = request.args.get('risk_level')
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query
        query = 'SELECT * FROM compliance_screenings WHERE 1=1'
        params = []
        
        if wallet_address:
            query += ' AND wallet_address = %s'
            params.append(wallet_address)
        
        if chain_id:
            query += ' AND chain_id = %s'
            params.append(chain_id)
        
        if screening_result:
            query += ' AND screening_result = %s'
            params.append(screening_result)
        
        if risk_level:
            query += ' AND risk_level = %s'
            params.append(risk_level)
        
        query += ' ORDER BY created_at DESC LIMIT %s OFFSET %s'
        params.extend([limit, offset])
        
        cur.execute(query, params)
        results = cur.fetchall()
        
        # Get total count
        count_query = 'SELECT COUNT(*) FROM compliance_screenings WHERE 1=1'
        count_params = []
        
        if wallet_address:
            count_query += ' AND wallet_address = %s'
            count_params.append(wallet_address)
        
        if chain_id:
            count_query += ' AND chain_id = %s'
            count_params.append(chain_id)
        
        if screening_result:
            count_query += ' AND screening_result = %s'
            count_params.append(screening_result)
        
        if risk_level:
            count_query += ' AND risk_level = %s'
            count_params.append(risk_level)
        
        cur.execute(count_query, count_params)
        total = cur.fetchone()['count']
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': [dict(row) for row in results],
            'pagination': {
                'total': total,
                'limit': limit,
                'offset': offset
            }
        })
    
    except Exception as e:
        print(f'❌ Error listing screenings: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print('')
    print('🚀 ========================================')
    print('✅ Compliance API Server Running (Python)')
    print('🚀 ========================================')
    print('')
    print('📍 Server: http://localhost:3000')
    print('📍 Health: http://localhost:3000/health')
    print('')
    print('📋 Endpoints:')
    print('  POST   /v1/risk/compliance/screen')
    print('  POST   /v1/risk/compliance/screen/batch')
    print('  GET    /v1/risk/compliance/screenings/<id>')
    print('  GET    /v1/risk/compliance/screenings')
    print('')
    print('Press Ctrl+C to stop')
    print('')
    
    app.run(host='0.0.0.0', port=3000, debug=True)

