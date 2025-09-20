import { Response } from 'express';
import { sanitizeErrorMessage } from './errorUtils';

/**
 * Handle error responses consistently across controllers
 * Handles validation errors, duplicate key errors, and general server errors
 */
export const handleErrorResponse = (res: Response, error: any): Response => {
  // Handle null or undefined errors
  if (!error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: sanitizeErrorMessage(error)
    });
  }
  
  // Handle mongoose validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors || {}).map((err: any) => err.message);
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }
  
  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return res.status(409).json({
      success: false,
      message: `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Field'} already exists`
    });
  }
  
  // Default server error
  return res.status(500).json({
    success: false,
    message: 'Server Error',
    error: sanitizeErrorMessage(error)
  });
};