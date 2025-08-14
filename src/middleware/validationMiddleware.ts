import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

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

// Global error handler
export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
};