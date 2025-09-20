import crypto from 'crypto';

describe('Refresh Token Hashing', () => {
  const hashRefreshToken = (token: string): string => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }
    return crypto
      .createHmac('sha256', secret)
      .update(token)
      .digest('hex');
  };

  beforeAll(() => {
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
  });

  describe('hashRefreshToken', () => {
    it('should generate consistent hash for same token', () => {
      const token = 'test-refresh-token';
      
      const hash1 = hashRefreshToken(token);
      const hash2 = hashRefreshToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'test-refresh-token-1';
      const token2 = 'test-refresh-token-2';
      
      const hash1 = hashRefreshToken(token1);
      const hash2 = hashRefreshToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash', () => {
      const token = 'test-refresh-token';
      
      const hash = hashRefreshToken(token);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should throw error when JWT_REFRESH_SECRET is not configured', () => {
      const originalSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      
      expect(() => hashRefreshToken('token')).toThrow('JWT_REFRESH_SECRET not configured');
      
      process.env.JWT_REFRESH_SECRET = originalSecret;
    });

    it('should handle empty token string', () => {
      const token = '';
      
      const hash = hashRefreshToken(token);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle very long tokens', () => {
      const token = 'a'.repeat(1000);
      
      const hash = hashRefreshToken(token);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should handle special characters in tokens', () => {
      const token = 'token-with-special-chars!@#$%^&*()_+{}[]|:;<>?,./';
      
      const hash = hashRefreshToken(token);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic with same secret', () => {
      const token = 'test-token';
      const secret = 'specific-secret-for-testing-that-is-32-chars-long';
      
      process.env.JWT_REFRESH_SECRET = secret;
      const hash1 = hashRefreshToken(token);
      
      // Simulate app restart with same secret
      process.env.JWT_REFRESH_SECRET = secret;
      const hash2 = hashRefreshToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes with different secrets', () => {
      const token = 'test-token';
      
      process.env.JWT_REFRESH_SECRET = 'first-secret-that-is-at-least-32-characters-long';
      const hash1 = hashRefreshToken(token);
      
      process.env.JWT_REFRESH_SECRET = 'second-secret-that-is-at-least-32-characters-long';
      const hash2 = hashRefreshToken(token);
      
      expect(hash1).not.toBe(hash2);
      
      // Restore original secret
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
    });
  });
});