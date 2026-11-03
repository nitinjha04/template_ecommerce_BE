import { NextFunction, Request, Response } from 'express';
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const asyncHandler: (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=asyncHandler.d.ts.map