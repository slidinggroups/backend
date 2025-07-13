// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    success: false,
    statusCode: 500,
    message: 'Internal Server Error'
  };

  // Supabase specific errors
  if (err.code) {
    switch (err.code) {
      case 'PGRST116':
        error.statusCode = 404;
        error.message = 'Resource not found';
        break;
      case 'PGRST301':
        error.statusCode = 400;
        error.message = 'Invalid request parameters';
        break;
      default:
        error.message = err.message || 'Database error';
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.statusCode = 400;
    error.message = err.message;
  }

  // Custom application errors
  if (err.statusCode) {
    error.statusCode = err.statusCode;
    error.message = err.message;
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
