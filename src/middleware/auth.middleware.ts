import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { verifyToken } from '../utils/jwt';
import { AuthRequest, UserRole } from '../types';

const getBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
};

const toAuthError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;

  if (err instanceof jwt.TokenExpiredError) {
    return new ApiError(401, 'Session expired. Please sign in again.');
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return new ApiError(401, 'Invalid or expired token. Please sign in again.');
  }

  return new ApiError(401, 'Authentication required');
};

/** Requires `Authorization: Bearer <token>` on protected routes. */
export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      throw new ApiError(401, 'Authentication required. Send Bearer token in Authorization header.');
    }

    req.user = verifyToken(token);
    next();
  } catch (err) {
    next(toAuthError(err));
  }
};

export const authorize =
  (...roles: UserRole[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        throw new ApiError(403, 'You do not have permission to perform this action');
      }

      next();
    } catch (err) {
      next(err instanceof ApiError ? err : new ApiError(403, 'Forbidden'));
    }
  };
