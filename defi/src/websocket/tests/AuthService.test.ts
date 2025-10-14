import { AuthService } from '../services/AuthService';

// Mock the checkApiKey function
jest.mock('../../api-keys/checkApiKey', () => ({
  checkApiKey: jest.fn()
}));

import { checkApiKey } from '../../api-keys/checkApiKey';
const mockCheckApiKey = checkApiKey as jest.MockedFunction<typeof checkApiKey>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    authService.clearCache();
    jest.clearAllMocks();
  });

  describe('validateApiKey', () => {
    it('should validate a valid API key', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      const result = await authService.validateApiKey('valid-api-key-123');

      expect(result.isValid).toBe(true);
      expect(result.keyData).toBeDefined();
      expect(result.keyData?.keyId).toBe('valid-ap...');
      expect(result.keyData?.permissions).toContain('websocket:connect');
      expect(result.error).toBeUndefined();
    });

    it('should reject an invalid API key', async () => {
      mockCheckApiKey.mockResolvedValue(false);

      const result = await authService.validateApiKey('invalid-key');

      expect(result.isValid).toBe(false);
      expect(result.keyData).toBeUndefined();
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject empty API key', async () => {
      const result = await authService.validateApiKey('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key is required and must be a string');
      expect(mockCheckApiKey).not.toHaveBeenCalled();
    });

    it('should reject null API key', async () => {
      const result = await authService.validateApiKey(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key is required and must be a string');
      expect(mockCheckApiKey).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockCheckApiKey.mockRejectedValue(new Error('Database error'));

      const result = await authService.validateApiKey('test-key');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key validation failed');
    });

    it('should cache validation results', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      // First call
      const result1 = await authService.validateApiKey('cached-key');
      expect(result1.isValid).toBe(true);
      expect(mockCheckApiKey).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await authService.validateApiKey('cached-key');
      expect(result2.isValid).toBe(true);
      expect(mockCheckApiKey).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('extractApiKey', () => {
    it('should extract API key from query parameters', () => {
      const event = {
        queryStringParameters: { apiKey: 'query-key-123' }
      };

      const result = authService.extractApiKey(event);
      expect(result).toBe('query-key-123');
    });

    it('should extract API key from headers', () => {
      const event = {
        headers: { 'x-api-key': 'header-key-123' }
      };

      const result = authService.extractApiKey(event);
      expect(result).toBe('header-key-123');
    });

    it('should extract API key from Authorization header', () => {
      const event = {
        headers: { 'Authorization': 'Bearer auth-key-123' }
      };

      const result = authService.extractApiKey(event);
      expect(result).toBe('auth-key-123');
    });

    it('should prioritize query parameters over headers', () => {
      const event = {
        queryStringParameters: { apiKey: 'query-key' },
        headers: { 'x-api-key': 'header-key' }
      };

      const result = authService.extractApiKey(event);
      expect(result).toBe('query-key');
    });

    it('should return null if no API key found', () => {
      const event = {};

      const result = authService.extractApiKey(event);
      expect(result).toBeNull();
    });

    it('should handle case-insensitive headers', () => {
      const event = {
        headers: { 'X-API-Key': 'case-insensitive-key' }
      };

      const result = authService.extractApiKey(event);
      expect(result).toBe('case-insensitive-key');
    });
  });

  describe('hasPermission', () => {
    it('should return true for valid permission', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      const result = await authService.hasPermission('valid-key', 'websocket:connect');
      expect(result).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      mockCheckApiKey.mockResolvedValue(false);

      const result = await authService.hasPermission('invalid-key', 'websocket:connect');
      expect(result).toBe(false);
    });

    it('should return false for missing permission', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      const result = await authService.hasPermission('valid-key', 'admin:delete');
      expect(result).toBe(false);
    });
  });

  describe('getRateLimit', () => {
    it('should return rate limit for valid API key', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      const result = await authService.getRateLimit('valid-key');
      expect(result).toBe(1000);
    });

    it('should return default rate limit for invalid API key', async () => {
      mockCheckApiKey.mockResolvedValue(false);

      const result = await authService.getRateLimit('invalid-key');
      expect(result).toBe(100);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      // Cache a key
      await authService.validateApiKey('test-key');
      expect(authService.getCacheStats().size).toBe(1);

      // Clear cache
      authService.clearCache();
      expect(authService.getCacheStats().size).toBe(0);
    });

    it('should return cache stats', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      await authService.validateApiKey('key1');
      await authService.validateApiKey('key2');

      const stats = authService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1...');
      expect(stats.keys).toContain('key2...');
    });
  });
});
