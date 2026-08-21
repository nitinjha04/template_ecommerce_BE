import { NextFunction, Request, Response } from 'express';
import {
  ValidationChain,
  ValidationError,
  validationResult,
} from 'express-validator';
import { ApiError } from '../utils/ApiError';

export const formatValidatorErrors = (items: ValidationError[]) =>
  items.map((err) => ({
    field: 'path' in err ? String(err.path) : undefined,
    message: err.msg,
  }));

export const validate =
  (chains: ValidationChain[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.all(chains.map((chain) => chain.run(req)));

      const result = validationResult(req);
      if (!result.isEmpty()) {
        const formatted = formatValidatorErrors(result.array());
        const summary =
          formatted.map((e) => e.message).join('. ') || 'Validation failed';
        next(new ApiError(400, summary, formatted));
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
