import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import { handleErrorResponse } from '../utils/responseUtils';


// Get user profile
export const getUserProfile = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error: any) {
    return handleErrorResponse(res, error);
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    const { username, email, password } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update fields if provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = password;
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error: any) {
    return handleErrorResponse(res, error);
  }
};
