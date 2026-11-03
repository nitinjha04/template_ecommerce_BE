import { NextFunction, Request, Response } from 'express';
import { ValidationChain } from 'express-validator';
export declare const validate: (chains: ValidationChain[]) => (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=validate.middleware.d.ts.map