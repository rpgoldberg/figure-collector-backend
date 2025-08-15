import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,  // Return all validation errors, not just the first
      allowUnknown: false // Reject unknown properties
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        message: detail.message,
        path: detail.path
      }));

      return res.status(422).json({
        message: 'Validation Error',
        errors: errorDetails
      });
    }

    next();
  };
};

// Validation schemas
export const schemas = {
  figure: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    manufacturer: Joi.string().trim().min(2).max(100).required(),
    type: Joi.string().valid('action figure', 'statue', 'collectible').default('action figure'),
    boxNumber: Joi.string().allow('').max(50).optional(),
    description: Joi.string().allow('').max(1000).optional(),
    location: Joi.string().trim().max(100).allow('').optional(),
    scale: Joi.string().optional(), // Added to handle test data
    purchaseInfo: Joi.object({
      price: Joi.number().min(0).precision(2).optional(),
      date: Joi.date().optional(),
      source: Joi.string().max(100).allow('').optional()
    }).optional()
  }),

  user: Joi.object({
    email: Joi.string().email({ 
      minDomainSegments: 2, 
      tlds: { allow: ['com', 'net', 'org', 'edu', 'io'] } 
    }).required(),
    password: Joi.string()
      .min(8)
      .max(72)  // bcrypt max length
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])?(?=.*\\d)?(?=.*[@$!%*?&])?[A-Za-z\\d@$!%*?&]{8,}$'))
      .message('Password should ideally include lowercase, uppercase, number, and special character'),
    username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/).required()
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

// Content-type validation middleware
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'];

    if (!contentType || !allowedTypes.includes(contentType)) {
      return res.status(415).json({
        message: 'Unsupported Media Type',
        allowedTypes
      });
    }

    next();
  };
};

// SECURITY FIX: MongoDB ObjectId validation middleware
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error',
        errors: [{ message: `${paramName} parameter is required`, path: [paramName] }]
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error', 
        errors: [{ message: `Invalid ${paramName} format`, path: [paramName] }]
      });
    }

    next();
  };
};

// SECURITY FIX: Enhanced global error handler with CastError handling
export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  // Handle Mongoose CastError (invalid ObjectId) as validation error, not server error
  if (err.name === 'CastError' && err.message.includes('ObjectId')) {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: [{ message: 'Invalid ID format', path: ['id'] }]
    });
  }

  // Handle Mongoose ValidationError  
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values((err as any).errors).map((error: any) => ({
        message: error.message,
        path: [error.path]
      }))
    });
  }

  // Handle JSON parsing errors
  if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
};