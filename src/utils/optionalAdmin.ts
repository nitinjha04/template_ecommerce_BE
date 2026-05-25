import { Request } from 'express';
import { verifyToken } from './jwt';

/** True when request has a valid admin Bearer token. */
export const isAdminRequest = (req: Request): boolean => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return false;
    const user = verifyToken(header.split(' ')[1]);
    return user.role === 'admin';
  } catch {
    return false;
  }
};

/**
 * Unpublished products are only returned when the client explicitly requests
 * includeUnpublished=true AND sends a valid admin token (admin panel only).
 */
export const shouldIncludeUnpublished = (req: Request): boolean =>
  req.query.includeUnpublished === 'true' && isAdminRequest(req);
