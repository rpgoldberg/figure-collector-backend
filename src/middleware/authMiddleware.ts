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

    // Check if token is close to expiring (refresh if less than 15 minutes left)
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiry = (decoded as any).exp;
    const timeUntilExpiry = tokenExpiry - currentTime;

    // If less than 15 minutes (900 seconds) left, issue a new token
    if (timeUntilExpiry < 900) {
      const newToken = jwt.sign(
        { id: decoded.id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '60m' }
      );

      // Send new token in response header
      res.setHeader('X-New-Token', newToken);
    }

    next();
  } catch (error) {
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
    
    if (user && user.isAdmin) {
      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Not authorized as admin'
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
