import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
}

// User type is already declared in src/types/express.d.ts

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  // Early check for Authorization header
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  try {
    // Get token from header
    const token = req.headers.authorization.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;

    // Add user ID to request
    req.user = {
      id: decoded.id
    };

    // Note: Token refresh is now handled via the /auth/refresh endpoint
    // Clients should monitor token expiry and refresh as needed

    next();
  } catch (error: any) {
    // Provide more specific error messages for better client handling
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

// Admin middleware
export const admin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }
    
    if (user.isAdmin) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
