import { Response } from 'express';
import { handleErrorResponse } from '../../src/utils/responseUtils';

describe('Response Utils', () => {
  describe('handleErrorResponse', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      (error as any).errors = {
        email: { message: 'Invalid email format' },
        password: { message: 'Password too weak' }
      };

      handleErrorResponse(mockResponse as Response, error);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: ['Invalid email format', 'Password too weak']
      });
    });

    it('should handle ValidationError with no errors object', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      handleErrorResponse(mockResponse as Response, error);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: []
      });
    });

    it('should handle duplicate key error (11000)', () => {
      const error: any = new Error('Duplicate key');
      error.code = 11000;
      error.keyPattern = { email: 1 };

      handleErrorResponse(mockResponse as Response, error);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists'
      });
    });

    it('should handle duplicate key error with missing keyPattern', () => {
      const error: any = new Error('Duplicate key');
      error.code = 11000;

      handleErrorResponse(mockResponse as Response, error);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Field already exists'
      });
    });

    it('should handle general server error in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Database connection failed');

      handleErrorResponse(mockResponse as Response, error);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'An error occurred'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle general server error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Database connection failed');

      handleErrorResponse(mockResponse as Response, error);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Database connection failed'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle error without message', () => {
      const error = { code: 'UNKNOWN' };

      handleErrorResponse(mockResponse as Response, error);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: expect.any(String)
      });
    });
  });
});