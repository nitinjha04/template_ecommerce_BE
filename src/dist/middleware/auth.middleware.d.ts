import { NextFunction, Response } from 'express';
import { AuthRequest, UserRole } from '../types';
export declare const authenticate: (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const authorize: (...roles: UserRole[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map