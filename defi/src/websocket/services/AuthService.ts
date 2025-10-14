import { checkApiKey } from '../../api-keys/checkApiKey';

export interface ApiKeyValidationResult {
  isValid: boolean;
  keyData?: {
    keyId: string;
    userId?: string;
    permissions?: string[];
    rateLimit?: number;
  };
  error?: string;
}

/**
 * AuthService handles API key authentication for WebSocket connections
 * Integrates with existing DeFiLlama API key system
 */
export class AuthService {
  private readonly CACHE_TTL = 300; // 5 minutes cache
  private keyCache = new Map<string, { result: ApiKeyValidationResult; expiry: number }>();

  /**
   * Validate API key for WebSocket connection
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        isValid: false,
        error: 'API key is required and must be a string'
      };
    }

    // Check cache first
    const cached = this.keyCache.get(apiKey);
    if (cached && cached.expiry > Date.now()) {
      console.log(`API key validation cache hit for key: ${apiKey.substring(0, 8)}...`);
      return cached.result;
    }

    try {
      // Use existing API key validation system
      const isValidKey = await checkApiKey(apiKey);
      
      const result: ApiKeyValidationResult = {
        isValid: isValidKey,
        keyData: isValidKey ? {
          keyId: apiKey.substring(0, 8) + '...',
          userId: 'websocket-user', // Could be enhanced to get actual user ID
          permissions: ['websocket:connect', 'websocket:subscribe'],
          rateLimit: 1000 // messages per minute
        } : undefined,
        error: isValidKey ? undefined : 'Invalid API key'
      };

      // Cache the result
      this.keyCache.set(apiKey, {
        result,
        expiry: Date.now() + (this.CACHE_TTL * 1000)
      });

      console.log(`API key validation result for ${apiKey.substring(0, 8)}...: ${isValidKey}`);
      return result;

    } catch (error) {
      console.error('Error validating API key:', error);
      return {
        isValid: false,
        error: 'API key validation failed'
      };
    }
  }

  /**
   * Extract API key from WebSocket connection event
   */
  extractApiKey(event: any): string | null {
    // Try multiple sources for API key
    const sources = [
      event.queryStringParameters?.apiKey,
      event.queryStringParameters?.api_key,
      event.headers?.['x-api-key'],
      event.headers?.['X-API-Key'],
      event.headers?.['Authorization']?.replace(/^Bearer\s+/i, ''),
      event.headers?.['authorization']?.replace(/^Bearer\s+/i, '')
    ];

    for (const source of sources) {
      if (source && typeof source === 'string' && source.trim()) {
        return source.trim();
      }
    }

    return null;
  }

  /**
   * Check if API key has specific permission
   */
  async hasPermission(apiKey: string, permission: string): Promise<boolean> {
    const validation = await this.validateApiKey(apiKey);
    
    if (!validation.isValid || !validation.keyData?.permissions) {
      return false;
    }

    return validation.keyData.permissions.includes(permission) || 
           validation.keyData.permissions.includes('*');
  }

  /**
   * Get rate limit for API key
   */
  async getRateLimit(apiKey: string): Promise<number> {
    const validation = await this.validateApiKey(apiKey);
    
    if (!validation.isValid || !validation.keyData?.rateLimit) {
      return 100; // Default rate limit
    }

    return validation.keyData.rateLimit;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.keyCache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    const keys = Array.from(this.keyCache.keys()).map(key => 
      key.substring(0, 8) + '...'
    );
    
    return {
      size: this.keyCache.size,
      keys
    };
  }
}
