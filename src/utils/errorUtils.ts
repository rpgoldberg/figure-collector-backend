/**
 * Sanitize error messages for production environment
 * Returns generic messages in production to prevent information disclosure
 * Returns actual error messages in development/test environments
 */
export const sanitizeErrorMessage = (error: any): string => {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    // Log full error details server-side
    console.error('Server error:', error);
    
    // Return generic messages in production
    if (error.name === 'ValidationError') {
      return 'Validation failed';
    }
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return 'Database operation failed';
    }
    if (error.name === 'JsonWebTokenError') {
      return 'Authentication failed';
    }
    if (error.name === 'TokenExpiredError') {
      return 'Token expired';
    }
    return 'An error occurred';
  }
  
  // In development/test, return actual error message
  return error.message || 'An error occurred';
};