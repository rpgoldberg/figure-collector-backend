import { Request, Response } from 'express';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

interface TokenPayload {
  id: string;
}

interface AuthRequest extends Request {
  user: {
    id: string;
  };
}

// Generate Access Token (short-lived)
const generateAccessToken = (id: string): string => {
  const payload = { id };
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRY || '15m';
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (): string => {
  // Use crypto for refresh tokens for better security
  return crypto.randomBytes(40).toString('hex');
};

// Save refresh token to database
const saveRefreshToken = async (
  userId: string, 
  token: string, 
  req: Request
): Promise<void> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
  
  // Extract device info from user agent
  const deviceInfo = req.headers['user-agent'] || 'Unknown device';
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  await RefreshToken.create({
    user: userId,
    token,
    expiresAt,
    deviceInfo,
    ipAddress
  });
};

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    // Create new user
    const user = await User.create({
      username,
      email,
      password
    });
    
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken();
    
    // Save refresh token to database
    await saveRefreshToken(user._id.toString(), refreshToken, req);
    
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors (shouldn't happen with our check, but just in case)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken();
    
    // Save refresh token to database
    await saveRefreshToken(user._id.toString(), refreshToken, req);
    
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors (shouldn't happen with our check, but just in case)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Refresh access token
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }
    
    // Find refresh token in database
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Check if token is expired
    if (storedToken.isExpired()) {
      // Remove expired token
      await RefreshToken.findByIdAndDelete(storedToken._id);
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }
    
    // Check if user still exists
    const user = await User.findById(storedToken.user);
    
    if (!user) {
      // Remove token if user doesn't exist
      await RefreshToken.findByIdAndDelete(storedToken._id);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user._id.toString());
    
    // Optional: Rotate refresh token for better security
    if (process.env.ROTATE_REFRESH_TOKENS === 'true') {
      // Delete old refresh token
      await RefreshToken.findByIdAndDelete(storedToken._id);
      
      // Generate new refresh token
      const newRefreshToken = generateRefreshToken();
      await saveRefreshToken(user._id.toString(), newRefreshToken, req);
      
      return res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors (shouldn't happen with our check, but just in case)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Logout user (invalidate refresh token)
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Remove specific refresh token
      await RefreshToken.deleteOne({ token: refreshToken });
    } else if (req.user) {
      // If no refresh token provided but user is authenticated,
      // remove all refresh tokens for this user (logout from all devices)
      await RefreshToken.deleteMany({ user: req.user.id });
    }
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors (shouldn't happen with our check, but just in case)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Logout from all devices
export const logoutAll = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Remove all refresh tokens for this user
    await RefreshToken.deleteMany({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors (shouldn't happen with our check, but just in case)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get active sessions (optional - for user dashboard)
export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const sessions = await RefreshToken.find({ 
      user: req.user.id,
      expiresAt: { $gt: new Date() }
    }).select('deviceInfo ipAddress createdAt');
    
    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors (shouldn't happen with our check, but just in case)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};