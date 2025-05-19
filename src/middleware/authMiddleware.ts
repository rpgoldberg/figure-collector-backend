import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
      };
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;
  
  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
      
      // Add user ID to request
      req.user = {
        id: decoded.id
      };
      
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }
  
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Admin middleware
export const admin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user && user.isAdmin) {
      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Not authorized as admin'
      });
    }
  } catch (error: Error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
