import rateLimit from 'express-rate-limit';

// Rate limiting configuration
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000, // 15 minutes default
    max: max || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
};

// General API rate limit
export const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes
  'Too many API requests from this IP, please try again later.'
);

// Stricter rate limit for admin operations
export const adminLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests per 15 minutes
  'Too many admin requests from this IP, please try again later.'
);
