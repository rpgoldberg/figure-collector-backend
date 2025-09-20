import { sanitizeErrorMessage } from '../../src/utils/errorUtils';

describe('Error Utils', () => {
  describe('sanitizeErrorMessage', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalConsoleError = console.error;

    beforeEach(() => {
      console.error = jest.fn();
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });

    describe('Production environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should return generic message for ValidationError', () => {
        const error = new Error('Detailed validation error');
        error.name = 'ValidationError';
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Validation failed');
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      });

      it('should return generic message for MongoError', () => {
        const error = new Error('MongoDB connection failed');
        error.name = 'MongoError';
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Database operation failed');
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      });

      it('should return generic message for MongoServerError', () => {
        const error = new Error('MongoDB server error');
        error.name = 'MongoServerError';
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Database operation failed');
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      });

      it('should return generic message for JsonWebTokenError', () => {
        const error = new Error('Invalid token signature');
        error.name = 'JsonWebTokenError';
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Authentication failed');
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      });

      it('should return generic message for TokenExpiredError', () => {
        const error = new Error('Token has expired');
        error.name = 'TokenExpiredError';
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Token expired');
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      });

      it('should return generic message for unknown errors', () => {
        const error = new Error('Some unexpected error');
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('An error occurred');
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      });

      it('should handle errors without message property', () => {
        const error = { code: 'UNKNOWN' };
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('An error occurred');
        expect(console.error).toHaveBeenCalledWith('Server error:', error);
      });
    });

    describe('Development environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should return actual error message', () => {
        const error = new Error('Detailed error message');
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Detailed error message');
        expect(console.error).not.toHaveBeenCalled();
      });

      it('should handle errors without message property', () => {
        const error = { code: 'UNKNOWN' };
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('An error occurred');
        expect(console.error).not.toHaveBeenCalled();
      });
    });

    describe('Test environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should return actual error message', () => {
        const error = new Error('Test error message');
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Test error message');
        expect(console.error).not.toHaveBeenCalled();
      });
    });
  });
});