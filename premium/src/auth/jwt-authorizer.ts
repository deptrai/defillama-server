/**
 * JWT Authorizer for Premium API
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * Purpose: Validate JWT tokens and authorize requests to premium endpoints
 * Pattern: AWS Lambda Authorizer (Request-based)
 */

import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

// ============================================================================
// Types
// ============================================================================

interface JWTPayload {
  user_id: string;
  email?: string;
  tier?: string;
  exp: number;
  iat: number;
}

// ============================================================================
// JWT Verification (Simplified - Replace with actual JWT library)
// ============================================================================

/**
 * Verify JWT token
 * TODO: Replace with actual JWT verification using jsonwebtoken library
 * This is a placeholder implementation
 */
function verifyToken(token: string): JWTPayload | null {
  try {
    // In production, use:
    // import jwt from 'jsonwebtoken';
    // const secret = process.env.JWT_SECRET || '';
    // const decoded = jwt.verify(token, secret) as JWTPayload;
    // return decoded;
    
    // For now, decode without verification (DEVELOPMENT ONLY)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    
    return payload as JWTPayload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// ============================================================================
// Policy Generation
// ============================================================================

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: context || {},
  };
}

// ============================================================================
// Lambda Handler
// ============================================================================

/**
 * JWT Authorizer Lambda Handler
 * 
 * @param event - API Gateway Request Authorizer Event
 * @returns IAM Policy allowing or denying access
 */
export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract token from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader) {
      console.error('No Authorization header found');
      throw new Error('Unauthorized');
    }
    
    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.error('Invalid Authorization header format');
      throw new Error('Unauthorized');
    }
    
    const token = parts[1];
    
    // Verify token
    const payload = verifyToken(token);
    
    if (!payload) {
      console.error('Invalid or expired token');
      throw new Error('Unauthorized');
    }
    
    // Check if user has premium access
    // TODO: Add premium tier validation
    // if (payload.tier !== 'premium' && payload.tier !== 'pro') {
    //   console.error('User does not have premium access');
    //   throw new Error('Forbidden');
    // }
    
    // Generate Allow policy
    const policy = generatePolicy(
      payload.user_id,
      'Allow',
      event.methodArn,
      {
        user_id: payload.user_id,
        email: payload.email || '',
        tier: payload.tier || 'free',
      }
    );
    
    console.log('Authorization successful for user:', payload.user_id);
    return policy;
  } catch (error) {
    console.error('Authorization error:', error);
    
    // Generate Deny policy
    // Note: In production, you might want to return a more specific error
    throw new Error('Unauthorized');
  }
};

// ============================================================================
// Export for testing
// ============================================================================

export { verifyToken, generatePolicy };

