/**
 * JWT Service for WebSocket Authentication
 * Handles JWT token generation, validation, and refresh
 */

import * as jwt from 'jsonwebtoken';
import { getRedisClient } from '../utils/redis';
import { Redis } from 'ioredis';

export interface JWTPayload {
  sub: string;           // User ID
  email: string;
  role: 'user' | 'admin' | 'service';
  permissions: string[];
  iat: number;           // Issued at
  exp: number;           // Expiration
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

export class JWTService {
  private redis: Redis;
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRY: string;
  private readonly REFRESH_TOKEN_EXPIRY: string;
  private readonly BLACKLIST_PREFIX = 'jwt:blacklist:';
  private readonly REFRESH_TOKEN_PREFIX = 'jwt:refresh:';

  constructor() {
    this.redis = getRedisClient();
    this.JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
    this.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  /**
   * Generate JWT access token
   */
  generateToken(
    userId: string,
    email: string,
    role: 'user' | 'admin' | 'service' = 'user',
    permissions: string[] = []
  ): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      role,
      permissions,
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRY,
    });

    console.log(`Generated JWT for user ${userId}`);
    return token;
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    // Store refresh token in Redis
    const key = `${this.REFRESH_TOKEN_PREFIX}${userId}`;
    const expirySeconds = this.parseExpiryToSeconds(this.REFRESH_TOKEN_EXPIRY);
    await this.redis.set(key, refreshToken, 'EX', expirySeconds);

    console.log(`Generated refresh token for user ${userId}`);
    return refreshToken;
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return {
          valid: false,
          error: 'Token has been revoked',
        };
      }

      // Verify token
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;

      // Validate payload structure
      if (!decoded.sub || !decoded.email || !decoded.role) {
        return {
          valid: false,
          error: 'Invalid token payload',
        };
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token has expired',
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token',
        };
      } else {
        console.error('Error validating token:', error);
        return {
          valid: false,
          error: 'Token validation failed',
        };
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        console.error('Invalid refresh token type');
        return null;
      }

      const userId = decoded.sub;

      // Check if refresh token exists in Redis
      const key = `${this.REFRESH_TOKEN_PREFIX}${userId}`;
      const storedToken = await this.redis.get(key);

      if (storedToken !== refreshToken) {
        console.error('Refresh token not found or mismatch');
        return null;
      }

      // Get user info (in production, fetch from database)
      // For now, we'll use placeholder values
      const email = `user-${userId}@example.com`;
      const role = 'user' as const;
      const permissions: string[] = [];

      // Generate new access token
      const newAccessToken = this.generateToken(userId, email, role, permissions);

      console.log(`Refreshed access token for user ${userId}`);
      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Revoke token (add to blacklist)
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        console.error('Invalid token for revocation');
        return;
      }

      // Calculate remaining TTL
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        const key = `${this.BLACKLIST_PREFIX}${token}`;
        await this.redis.set(key, '1', 'EX', ttl);
        console.log(`Token revoked for user ${decoded.sub}`);
      }
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeUserTokens(userId: string): Promise<void> {
    try {
      // Remove refresh token
      const key = `${this.REFRESH_TOKEN_PREFIX}${userId}`;
      await this.redis.del(key);

      console.log(`Revoked all tokens for user ${userId}`);
    } catch (error) {
      console.error('Error revoking user tokens:', error);
    }
  }

  /**
   * Check if token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `${this.BLACKLIST_PREFIX}${token}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600; // Default 1 hour
    }
  }

  /**
   * Decode token without validation (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded?.exp || null;
    } catch (error) {
      console.error('Error getting token expiration:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const exp = this.getTokenExpiration(token);
      if (!exp) return true;

      const now = Math.floor(Date.now() / 1000);
      return exp < now;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}

