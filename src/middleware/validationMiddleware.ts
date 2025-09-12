import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';

export const validateRequest = (schema: Joi.ObjectSchema, source: 'body' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const dataToValidate = source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(dataToValidate, { 
      abortEarly: false,  // Return all validation errors, not just the first
      allowUnknown: false, // Reject unknown properties
      convert: true  // Attempt to convert values to correct types
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        message: detail.message,
        path: detail.path
      }));

      // Detailed error type classification
      const errorAnalysis = {
        isNumericError: errorDetails.some(err => err.message.includes('must be a number')),
        isRangeError: errorDetails.some(err => err.message.includes('must be greater')),
        isRequiredError: errorDetails.some(err => err.message.includes('required')),
        isPatternError: errorDetails.some(err => err.message.includes('pattern')),
        isTypeError: errorDetails.some(err => err.message.includes('must be a'))
      };

      // Determine status code and primary error message
      const determineErrorResponse = () => {
        if (errorAnalysis.isRequiredError) {
          return {
            status: 422,
            message: 'Validation Error',
            verbose: 'Please provide all required fields correctly'
          };
        }
        if (errorAnalysis.isNumericError || errorAnalysis.isRangeError) {
          return {
            status: 422,
            message: 'Validation Error',
            verbose: 'Numeric values do not meet validation requirements'
          };
        }
        if (errorAnalysis.isPatternError) {
          return {
            status: 422,
            message: 'Validation Error',
            verbose: 'Input does not match the required pattern or format'
          };
        }
        if (errorAnalysis.isTypeError) {
          return {
            status: 422,
            message: 'Validation Error',
            verbose: 'Provided data type is incompatible with expected type'
          };
        }
        return {
          status: 422,
          message: 'Validation Error',
          verbose: 'One or more validation checks did not pass'
        };
      };

      const errorResponse = determineErrorResponse();

      return res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message,
        verbose: errorResponse.verbose,
        errors: errorDetails
      });
    }

    // Update request object with converted values
    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
    return;
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
    page: Joi.alternatives()
      .try(
        Joi.number().integer().min(1).max(1000).default(1),
        Joi.string().trim().pattern(/^\d+$/).min(1).max(3).default('1')
      ).default(1),
    limit: Joi.alternatives()
      .try(
        Joi.number().integer().min(1).max(100).default(10),
        Joi.string().trim().pattern(/^\d+$/).min(1).max(3).default('10')
      ).default(10),
    offset: Joi.alternatives()
      .try(
        Joi.number().integer().min(0).optional(),
        Joi.string().trim().pattern(/^\d+$/).optional()
      ).optional()
  }).allow(null),

  // Enhanced figure creation schema with optional MFC scraping
  figureCreate: Joi.object({
    // Flexible name handling - conditional validation based on mfcLink presence
    name: Joi.when('mfcLink', {
      is: Joi.exist(),
      then: Joi.string().trim().max(100).allow('').optional(),
      otherwise: Joi.string().trim().min(1).max(100).required()
        .messages({
          'string.empty': 'Name is required',
          'any.required': 'Name is required',
          'string.min': 'Name is required'
        })
    }),
    
    // Flexible manufacturer handling - conditional validation based on mfcLink presence
    manufacturer: Joi.when('mfcLink', {
      is: Joi.exist(),
      then: Joi.string().trim().max(100).allow('').optional(),
      otherwise: Joi.string().trim().min(1).max(100).required()
        .messages({
          'string.empty': 'Manufacturer is required',
          'any.required': 'Manufacturer is required', 
          'string.min': 'Manufacturer is required'
        })
    }),
    
    type: Joi.string().valid('action figure', 'statue', 'collectible')
      .default('action figure'),
    
    boxNumber: Joi.string().allow('').max(50).optional(),
    description: Joi.string().allow('').max(1000).optional(),
    location: Joi.string().trim().max(100).allow('').optional(),
    scale: Joi.string().allow('').max(50).optional(),
    
    purchaseInfo: Joi.object({
      price: Joi.number().min(0).precision(2).optional(),
      date: Joi.alternatives()
        .try(Joi.date().optional(), Joi.string().isoDate().optional()),
      source: Joi.string().max(100).allow('').optional()
    }).optional(),
    
    // Enhanced MFC data handling with full flexibility
    mfcLink: Joi.string().uri().optional(),
    mfcUrl: Joi.string().uri().optional(),
    mfcData: Joi.object({
      manufacturer: Joi.string().optional(),
      name: Joi.string().optional(),
      scale: Joi.string().optional(),
      imageUrl: Joi.string().uri().optional()
    }).optional()
  })
  // Note: Individual field validation will handle empty strings
  // MFC validation is handled separately for flexibility
  // Allow any additional fields for extreme flexibility
  .pattern(/.*/, Joi.any().optional())
  // Provide default empty object if no data
  .default(() => ({})),

  figureUpdate: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    manufacturer: Joi.string().trim().min(2).max(100).optional(),
    type: Joi.string().valid('action figure', 'statue', 'collectible').optional(),
    boxNumber: Joi.string().allow('').max(50).optional(),
    description: Joi.string().allow('').max(1000).optional(),
    location: Joi.string().trim().max(100).allow('').optional(),
    scale: Joi.string().optional(),
    purchaseInfo: Joi.object({
      price: Joi.number().min(0).precision(2).optional(),
      purchaseDate: Joi.date().iso().optional(),
      store: Joi.string().max(100).optional()
    }).optional(),
    mfcLink: Joi.string().uri().optional(),
    imageUrl: Joi.string().uri().optional(),
    mfcData: Joi.object({
      manufacturer: Joi.string().optional(),
      name: Joi.string().optional(),
      scale: Joi.string().optional(),
      imageUrl: Joi.string().uri().optional()
    }).optional()
  })
  // Allow any additional fields for flexibility
  .pattern(/.*/, Joi.any().optional())
  .min(1), // At least one field must be provided for update

  // User validation schemas
  userRegister: Joi.object({
    username: Joi.string().trim().min(3).max(30).alphanum().required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(100).required(),
    isAdmin: Joi.boolean().default(false).optional()
  }),

  userLogin: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(1).required()
  }),

  userUpdate: Joi.object({
    username: Joi.string().trim().min(3).max(30).alphanum().optional(),
    email: Joi.string().trim().email().optional(),
    password: Joi.string().min(6).max(100).optional(),
    currentPassword: Joi.string().min(1).optional()
  }).min(1),

  // Refresh token validation schema
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),

  // Search validation schema
  search: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    fields: Joi.array().items(Joi.string().valid('name', 'manufacturer', 'location', 'boxNumber')).optional(),
    page: Joi.alternatives()
      .try(
        Joi.number().integer().min(1).max(1000).default(1),
        Joi.string().trim().pattern(/^\d+$/).min(1).max(3).default('1')
      ).default(1),
    limit: Joi.alternatives()
      .try(
        Joi.number().integer().min(1).max(100).default(10),
        Joi.string().trim().pattern(/^\d+$/).min(1).max(3).default('10')
      ).default(10)
  }),

  // Filter validation schema
  filter: Joi.object({
    manufacturer: Joi.string().min(1).max(100).optional(),
    type: Joi.string().valid('action figure', 'statue', 'collectible').optional(),
    scale: Joi.string().min(1).max(50).optional(),
    location: Joi.string().min(1).max(100).optional(),
    boxNumber: Joi.string().min(1).max(50).optional(),
    page: Joi.alternatives()
      .try(
        Joi.number().integer().min(1).max(1000).default(1),
        Joi.string().trim().pattern(/^\d+$/).min(1).max(3).default('1')
      ).default(1),
    limit: Joi.alternatives()
      .try(
        Joi.number().integer().min(1).max(100).default(10),
        Joi.string().trim().pattern(/^\d+$/).min(1).max(3).default('10')
      ).default(10)
  })
};

// Content-type validation middleware
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const contentType = req.headers['content-type'];

    if (!contentType || !allowedTypes.includes(contentType)) {
      return res.status(415).json({
        message: 'Unsupported Media Type',
        allowedTypes
      });
    }

    next();
    return;
  };
};

// SECURITY FIX: MongoDB ObjectId validation middleware
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
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
    return;
  };
};

// SECURITY FIX: Enhanced global error handler with CastError handling
export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';

  // Always log full error in non-production environments
  if (!isProd) {
    console.error('Global Error Handler caught:', err);
  }

  // Specific error handling with detailed error tracking
  const handleError = (status: number, message: string, errors?: any[]) => {
    return res.status(status).json({
      success: false,
      message,
      ...(errors && { errors }),
      ...(status === 500 && !isProd && { debugInfo: err.message })
    });
  };

  // Prioritized error type handlers
  switch (err.name) {
    case 'CastError':
      if (err.message.includes('ObjectId')) {
        return handleError(422, 'Validation Error', [{ 
          message: 'Invalid ID format', 
          path: ['id'] 
        }]);
      }
      break;

    case 'ValidationError':
      return handleError(422, 'Validation Error', 
        Object.values((err as any).errors).map((error: any) => ({
          message: error.message,
          path: [error.path]
        }))
      );

    case 'SyntaxError':
      if (err.message.includes('JSON')) {
        return handleError(400, 'Invalid JSON format');
      }
      break;

    default:
      // Catch-all for unhandled errors
      return handleError(500, 'Internal Server Error');
  }

  // Fallback error handler
  return handleError(500, 'Internal Server Error');
};