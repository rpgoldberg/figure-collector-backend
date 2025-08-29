import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import User from '../../src/models/User';
import { generateTestToken } from '../setup';
import mongoose from 'mongoose';

const app = createTestApp();

describe('User Routes Integration', () => {
  describe('POST /users/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          _id: expect.any(String),
          username: 'testuser',
          email: 'test@example.com',
          isAdmin: false,
          token: expect.any(String)
        })
      });

      // Verify user was created in database
      const createdUser = await User.findById(response.body.data._id);
      expect(createdUser).toBeTruthy();
      expect(createdUser?.username).toBe('testuser');
      expect(createdUser?.email).toBe('test@example.com');
      expect(createdUser?.password).not.toBe('password123'); // Should be hashed
    });

    it('should return error for missing required fields', async () => {
      const incompleteData = {
        username: 'testuser'
        // Missing email and password
      };

      const response = await request(app)
        .post('/users/register')
        .send(incompleteData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation Error');
    });

    it('should return error for duplicate username', async () => {
      const userData1 = {
        username: 'duplicateuser',
        email: 'first@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'duplicateuser', // Same username
        email: 'second@example.com',
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/users/register')
        .send(userData1)
        .expect(201);

      // Try to create second user with same username
      const response = await request(app)
        .post('/users/register')
        .send(userData2)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'User already exists'
      });
    });

    it('should return error for duplicate email', async () => {
      const userData1 = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'user2',
        email: 'duplicate@example.com', // Same email
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/users/register')
        .send(userData1)
        .expect(201);

      // Try to create second user with same email
      const response = await request(app)
        .post('/users/register')
        .send(userData2)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'User already exists'
      });
    });

    it('should handle invalid email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users/register')
        .send(userData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation Error');
    });
  });

  describe('POST /users/login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create test user
      testUser = new User({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123'
      });
      await testUser.save();
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          _id: testUser._id.toString(),
          username: 'loginuser',
          email: 'login@example.com',
          isAdmin: false,
          token: expect.any(String)
        })
      });
    });

    it('should return error for incorrect email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email or password'
      });
    });

    it('should return error for incorrect password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email or password'
      });
    });

    it('should return error for missing credentials', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation Error');
    });

    it('should login admin user successfully', async () => {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'adminpassword',
        isAdmin: true
      });
      await adminUser.save();

      const loginData = {
        email: 'admin@example.com',
        password: 'adminpassword'
      };

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.data.isAdmin).toBe(true);
    });
  });

  describe('GET /users/profile', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      testUser = new User({
        username: 'profileuser',
        email: 'profile@example.com',
        password: 'password123'
      });
      await testUser.save();
      authToken = generateTestToken(testUser._id.toString());
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          _id: testUser._id.toString(),
          username: 'profileuser',
          email: 'profile@example.com',
          isAdmin: false
        })
      });

      // Should not include password
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/users/profile')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Not authorized, no token'
      });
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Not authorized, token failed'
      });
    });

    it('should return 404 if user no longer exists', async () => {
      // Delete the user
      await User.findByIdAndDelete(testUser._id);

      const response = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('PUT /users/profile', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      testUser = new User({
        username: 'updateuser',
        email: 'update@example.com',
        password: 'password123'
      });
      await testUser.save();
      authToken = generateTestToken(testUser._id.toString());
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          _id: testUser._id.toString(),
          username: 'updateduser',
          email: 'updated@example.com',
          isAdmin: false
        })
      });

      // Verify changes in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.username).toBe('updateduser');
      expect(updatedUser?.email).toBe('updated@example.com');
    });

    it('should update password successfully', async () => {
      const updateData = {
        password: 'newpassword123'
      };

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id);
      const isNewPasswordValid = await updatedUser?.comparePassword('newpassword123');
      const isOldPasswordInvalid = await updatedUser?.comparePassword('password123');
      
      expect(isNewPasswordValid).toBe(true);
      expect(isOldPasswordInvalid).toBe(false);
    });

    it('should update only provided fields', async () => {
      const originalUsername = testUser.username;
      const updateData = {
        email: 'newemail@example.com'
        // Only updating email
      };

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.username).toBe(originalUsername);
      expect(response.body.data.email).toBe('newemail@example.com');
    });

    it('should return 401 without token', async () => {
      const updateData = {
        username: 'newusername'
      };

      const response = await request(app)
        .put('/users/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Not authorized, no token'
      });
    });

    it('should return 404 if user no longer exists', async () => {
      // Delete the user
      await User.findByIdAndDelete(testUser._id);

      const updateData = {
        username: 'newusername'
      };

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full registration and login flow', async () => {
      // Register user
      const registerData = {
        username: 'flowuser',
        email: 'flow@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/users/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const userId = registerResponse.body.data._id;
      const registerToken = registerResponse.body.data.token;

      // Login with the same credentials
      const loginData = {
        email: 'flow@example.com',
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data._id).toBe(userId);
      const loginToken = loginResponse.body.data.token;

      // Use login token to access profile
      const profileResponse = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileResponse.body.data._id).toBe(userId);
      expect(profileResponse.body.data.username).toBe('flowuser');

      // Update profile
      const updateResponse = await request(app)
        .put('/users/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({ username: 'updatedflowuser' })
        .expect(200);

      expect(updateResponse.body.data.username).toBe('updatedflowuser');
    });
  });
});