import { Request, Response } from 'express';
import { registerUser, loginUser, getUserProfile, updateUserProfile } from '../../src/controllers/userController';
import User from '../../src/models/User';
import jwt from 'jsonwebtoken';

// Mock User model
jest.mock('../../src/models/User');
const MockedUser = jest.mocked(User);

// Mock JWT
jest.mock('jsonwebtoken');
const mockedJwt = jest.mocked(jwt);

describe('UserController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<any>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    beforeEach(() => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('should register a new user successfully', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        save: jest.fn()
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(null);
      MockedUser.create = jest.fn().mockResolvedValue(mockUser);
      mockedJwt.sign = jest.fn().mockReturnValue('fake-token');

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'test@example.com' }, { username: 'testuser' }]
      });
      expect(MockedUser.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          _id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          isAdmin: false,
          token: 'fake-token'
        }
      });
    });

    it('should return error if user already exists by email', async () => {
      const existingUser = {
        _id: 'existing123',
        username: 'existinguser',
        email: 'test@example.com'
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(existingUser);

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User already exists'
      });
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should return error if user already exists by username', async () => {
      const existingUser = {
        _id: 'existing123',
        username: 'testuser',
        email: 'different@example.com'
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(existingUser);

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User already exists'
      });
    });

    it('should handle server errors', async () => {
      MockedUser.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Database error'
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest.body = {
        username: 'testuser'
        // Missing email and password
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(null);
      MockedUser.create = jest.fn().mockRejectedValue(new Error('Validation failed'));

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Validation failed'
      });
    });
  });

  describe('loginUser', () => {
    beforeEach(() => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('should login user successfully', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(mockUser);
      mockedJwt.sign = jest.fn().mockReturnValue('fake-token');

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(MockedUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          _id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          isAdmin: false,
          token: 'fake-token'
        }
      });
    });

    it('should return error for non-existent user', async () => {
      MockedUser.findOne = jest.fn().mockResolvedValue(null);

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password'
      });
    });

    it('should return error for incorrect password', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(mockUser);

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password'
      });
    });

    it('should handle server errors', async () => {
      MockedUser.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Database error'
      });
    });
  });

  describe('getUserProfile', () => {
    beforeEach(() => {
      mockRequest.user = { id: 'user123' };
    });

    it('should get user profile successfully', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false
      };

      const mockFindById = {
        select: jest.fn().mockResolvedValue(mockUser)
      };

      MockedUser.findById = jest.fn().mockReturnValue(mockFindById);

      await getUserProfile(mockRequest as Request, mockResponse as Response);

      expect(MockedUser.findById).toHaveBeenCalledWith('user123');
      expect(mockFindById.select).toHaveBeenCalledWith('-password');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should return error if user not found', async () => {
      const mockFindById = {
        select: jest.fn().mockResolvedValue(null)
      };

      MockedUser.findById = jest.fn().mockReturnValue(mockFindById);

      await getUserProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should handle server errors', async () => {
      const mockFindById = {
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      MockedUser.findById = jest.fn().mockReturnValue(mockFindById);

      await getUserProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Database error'
      });
    });
  });

  describe('updateUserProfile', () => {
    beforeEach(() => {
      mockRequest.user = { id: 'user123' };
      mockRequest.body = {
        username: 'updateduser',
        email: 'updated@example.com',
        password: 'newpassword'
      };
    });

    it('should update user profile successfully', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        save: jest.fn().mockResolvedValue({
          _id: 'user123',
          username: 'updateduser',
          email: 'updated@example.com',
          isAdmin: false
        })
      };

      MockedUser.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(mockRequest as Request, mockResponse as Response);

      expect(mockUser.username).toBe('updateduser');
      expect(mockUser.email).toBe('updated@example.com');
      expect(mockUser.password).toBe('newpassword');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          _id: 'user123',
          username: 'updateduser',
          email: 'updated@example.com',
          isAdmin: false
        }
      });
    });

    it('should update only provided fields', async () => {
      mockRequest.body = {
        username: 'updateduser'
        // Only username provided
      };

      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'oldpassword',
        isAdmin: false,
        save: jest.fn().mockResolvedValue({
          _id: 'user123',
          username: 'updateduser',
          email: 'test@example.com',
          isAdmin: false
        })
      };

      MockedUser.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(mockRequest as Request, mockResponse as Response);

      expect(mockUser.username).toBe('updateduser');
      expect(mockUser.email).toBe('test@example.com'); // Unchanged
      expect(mockUser.password).toBe('oldpassword'); // Unchanged
    });

    it('should return error if user not found', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue(null);

      await updateUserProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should handle server errors', async () => {
      MockedUser.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      await updateUserProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Database error'
      });
    });

    it('should handle save errors', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
        save: jest.fn().mockRejectedValue(new Error('Save failed'))
      };

      MockedUser.findById = jest.fn().mockResolvedValue(mockUser);

      await updateUserProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
        error: 'Save failed'
      });
    });
  });

  describe('Token Generation', () => {
    it('should generate JWT token with correct payload', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false
      };

      MockedUser.findOne = jest.fn().mockResolvedValue({
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(true)
      });
      mockedJwt.sign = jest.fn().mockReturnValue('fake-token');

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { id: 'user123' },
        'test-secret',
        { expiresIn: '60m' }
      );
    });
  });
});