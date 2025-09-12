describe('JWT Configuration Validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    // Clear module cache to re-run validation
    jest.resetModules();
  });

  describe('Production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => {
        require('../../../src/controllers/authController');
      }).toThrow('FATAL: JWT_SECRET environment variable is required for authentication');
    });

    it('should throw error when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short';
      process.env.JWT_REFRESH_SECRET = 'valid-secret-that-is-at-least-32-characters-long';

      expect(() => {
        require('../../../src/controllers/authController');
      }).toThrow('FATAL: JWT_SECRET must be at least 32 characters in production');
    });

    it('should throw error when JWT_SECRET is "secret"', () => {
      process.env.JWT_SECRET = 'secret';
      process.env.JWT_REFRESH_SECRET = 'valid-secret-that-is-at-least-32-characters-long';

      expect(() => {
        require('../../../src/controllers/authController');
      }).toThrow('FATAL: JWT_SECRET must be at least 32 characters in production');
    });

    it('should throw error when JWT_REFRESH_SECRET is missing', () => {
      process.env.JWT_SECRET = 'valid-secret-that-is-at-least-32-characters-long';
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => {
        require('../../../src/controllers/authController');
      }).toThrow('FATAL: JWT_REFRESH_SECRET environment variable is required for authentication');
    });

    it('should throw error when JWT_REFRESH_SECRET is too short', () => {
      process.env.JWT_SECRET = 'valid-secret-that-is-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'short';

      expect(() => {
        require('../../../src/controllers/authController');
      }).toThrow('FATAL: JWT_REFRESH_SECRET must be at least 32 characters in production');
    });

    it('should not throw error with valid secrets', () => {
      process.env.JWT_SECRET = 'valid-secret-that-is-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'another-valid-secret-that-is-at-least-32-chars';

      expect(() => {
        require('../../../src/controllers/authController');
      }).not.toThrow();
    });
  });

  describe('Test environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should allow test secrets in test environment', () => {
      process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';

      expect(() => {
        require('../../../src/controllers/authController');
      }).not.toThrow();
    });

    it('should not validate secrets in test environment', () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      // Validation is skipped in test environment for flexibility
      expect(() => {
        require('../../../src/controllers/authController');
      }).not.toThrow();
    });
  });

  describe('Development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should allow shorter secrets in development', () => {
      process.env.JWT_SECRET = 'dev-secret';
      process.env.JWT_REFRESH_SECRET = 'dev-refresh';

      expect(() => {
        require('../../../src/controllers/authController');
      }).not.toThrow();
    });
  });
});