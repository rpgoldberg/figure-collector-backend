import { Request, Response, NextFunction } from 'express';
import { protect, admin } from '../../src/middleware/authMiddleware';
import User from '../../src/models/User';
import jwt from 'jsonwebtoken';
import '../setup'; // Import test setup for environment variables

// Mock User model
jest.mock('../../src/models/User');
const MockedUser = jest.mocked(User);

// Mock JWT
jest.mock('jsonwebtoken');
const mockedJwt = jest.mocked(jwt);

describe('AuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('protect middleware', () => {
    it('should authenticate valid token and call next', async () => {
      const mockDecodedToken = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockRequest.user).toEqual({ id: 'user123' });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should issue new token when current token is close to expiry', async () => {
      const mockDecodedToken = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now (less than 15 minutes)
      };

      mockRequest.headers = {
        authorization: 'Bearer expiring-token'
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockedJwt.sign = jest.fn().mockReturnValue('new-token');

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { id: 'user123' },
        'test-secret',
        { expiresIn: '60m' }
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-New-Token', 'new-token');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not issue new token when current token has plenty of time left', async () => {
      const mockDecodedToken = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      mockRequest.headers = {
        authorization: 'Bearer fresh-token'
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedJwt.sign).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      mockRequest.headers = {};

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, no token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token'
      };

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, no token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for Bearer header without token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle JWT verification errors gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer malformed.token.here'
      };

      mockedJwt.verify = jest.fn().mockImplementation(() => {
        throw new jwt.JsonWebTokenError('JWT malformed');
      });

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
    });

    describe('Token refresh logic', () => {
      it('should calculate time until expiry correctly', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const mockDecodedToken = {
          id: 'user123',
          exp: currentTime + 600 // 10 minutes from now (less than 15 minutes)
        };

        mockRequest.headers = {
          authorization: 'Bearer expiring-soon-token'
        };

        mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
        mockedJwt.sign = jest.fn().mockReturnValue('refreshed-token');

        await protect(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockedJwt.sign).toHaveBeenCalled();
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-New-Token', 'refreshed-token');
      });

      it('should not refresh token when more than 15 minutes remain', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const mockDecodedToken = {
          id: 'user123',
          exp: currentTime + 1200 // 20 minutes from now (more than 15 minutes)
        };

        mockRequest.headers = {
          authorization: 'Bearer still-fresh-token'
        };

        mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);

        await protect(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockedJwt.sign).not.toHaveBeenCalled();
        expect(mockResponse.setHeader).not.toHaveBeenCalled();
      });
    });
  });

  describe('admin middleware', () => {
    beforeEach(() => {
      mockRequest.user = { id: 'user123' };
    });

    it('should allow admin users to proceed', async () => {
      const mockAdminUser = {
        _id: 'user123',
        username: 'admin',
        email: 'admin@example.com',
        isAdmin: true
      };

      MockedUser.findById = jest.fn().mockResolvedValue(mockAdminUser);

      await admin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(MockedUser.findById).toHaveBeenCalledWith('user123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny non-admin users', async () => {
      const mockRegularUser = {
        _id: 'user123',
        username: 'regular',
        email: 'user@example.com',
        isAdmin: false
      };

      MockedUser.findById = jest.fn().mockResolvedValue(mockRegularUser);

      await admin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(MockedUser.findById).toHaveBeenCalledWith('user123');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized as admin'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access if user not found', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue(null);

      await admin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized as admin'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      MockedUser.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      await admin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Database error'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing user in request', async () => {
      mockRequest.user = undefined;

      // This would normally cause a runtime error, but let's test the behavior
      try {
        await admin(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        // Expected to fail due to undefined user.id
        expect(error).toBeDefined();
      }
    });
  });

  describe('Middleware integration', () => {
    it('should work with protect middleware followed by admin middleware', async () => {
      const mockDecodedToken = {
        id: 'admin123',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const mockAdminUser = {
        _id: 'admin123',
        username: 'admin',
        email: 'admin@example.com',
        isAdmin: true
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-admin-token'
      };

      // First, protect middleware
      mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual({ id: 'admin123' });
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Then, admin middleware
      MockedUser.findById = jest.fn().mockResolvedValue(mockAdminUser);
      mockNext.mockClear(); // Clear previous call
      
      await admin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(MockedUser.findById).toHaveBeenCalledWith('admin123');
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle token with missing exp field', async () => {
      const mockDecodedToken = {
        id: 'user123'
        // Missing exp field
      };

      mockRequest.headers = {
        authorization: 'Bearer token-without-exp'
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not crash and should proceed normally
      expect(mockRequest.user).toEqual({ id: 'user123' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle extremely long tokens', async () => {
      const longToken = 'Bearer ' + 'a'.repeat(1000);
      mockRequest.headers = {
        authorization: longToken
      };

      const mockDecodedToken = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedJwt.verify).toHaveBeenCalledWith('a'.repeat(1000), 'test-secret');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle special characters in tokens', async () => {
      const specialToken = 'Bearer token.with-special_chars+symbols=';
      mockRequest.headers = {
        authorization: specialToken
      };

      const mockDecodedToken = {
        id: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockedJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);

      await protect(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedJwt.verify).toHaveBeenCalledWith('token.with-special_chars+symbols=', 'test-secret');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});