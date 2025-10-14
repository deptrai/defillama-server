/**
 * Authentication Middleware
 * JWT authentication for query API
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';

export interface AuthResult {
  userId: string;
  tier: 'free' | 'pro' | 'enterprise';
}

/**
 * Authenticate request using JWT token
 */
export async function authenticateRequest(event: APIGatewayProxyEvent): Promise<AuthResult> {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw new Error('Invalid Authorization header format');
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    return {
      userId: decoded.userId || decoded.sub,
      tier: decoded.tier || 'free',
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

