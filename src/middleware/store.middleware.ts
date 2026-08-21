import { NextFunction, Response } from 'express';
import { AuthRequest } from '../types';
import { runWithStoreContext } from '../context/store.context';
import { StoreService } from '../services/store.service';
import { extractDomainFromRequest } from '../utils/storeDomain';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const SKIP_PREFIXES = [
  '/health',
  '/stores',
  '/gateway-payments/webhook',
  '/payments/razorpay/webhook',
  /** Public config probe — no store domain or auth required. */
  '/payments/methods',
];

export const resolveStore = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const path = req.path;
    if (SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return next();
    }

    const adminScope = req.headers['x-admin-scope'];
    if (adminScope === 'all') {
      return next();
    }

    const domain = extractDomainFromRequest({
      headerDomain:
        typeof req.headers['x-store-domain'] === 'string'
          ? req.headers['x-store-domain']
          : undefined,
      origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
      referer:
        typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
      host: typeof req.headers.host === 'string' ? req.headers.host : undefined,
    });

    const store = await StoreService.resolveByDomain(domain);
    if (!store) {
      throw new ApiError(404, 'Store not found for this domain');
    }

    req.store = {
      id: store.id,
      slug: store.slug,
      domain: store.domain,
      name: store.name,
    };

    runWithStoreContext(
      {
        storeId: store.id,
        storeSlug: store.slug,
        storeDomain: store.domain,
        storeName: store.name,
      },
      () => next()
    );
  }
);
