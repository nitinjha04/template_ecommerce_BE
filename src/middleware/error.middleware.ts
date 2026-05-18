import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../views/ApiResponse';
import { env } from '../config/env';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    ApiResponse.error(res, err.message, err.statusCode, err.errors);
    return;
  }

  if (err.name === 'ValidationError') {
    ApiResponse.error(res, err.message, 400);
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    ApiResponse.error(res, 'Duplicate field value entered', 409);
    return;
  }

  if (err.name === 'CastError') {
    ApiResponse.error(res, 'Invalid resource identifier', 400);
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    ApiResponse.error(res, 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    ApiResponse.error(res, 'Token expired', 401);
    return;
  }

  console.error(err);
  const message =
    env.nodeEnv === 'production' ? 'Internal server error' : err.message;
  ApiResponse.error(res, message, 500);
};
