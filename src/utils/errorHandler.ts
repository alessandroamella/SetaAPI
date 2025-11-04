import type { ErrorRequestHandler } from 'express';
import { logger } from './logger';

// Middleware to log errors
export const logError: ErrorRequestHandler = (err, _req, _res, next) => {
  logger.error(err.stack);
  next(err);
};

// Middleware to send a formatted error response to the client
export const returnError: ErrorRequestHandler = (err, _req, res, _next) => {
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Something went wrong!',
    },
  });
};
