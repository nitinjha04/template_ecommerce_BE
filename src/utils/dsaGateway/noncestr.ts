import crypto from 'crypto';

export const randomNonceStr = (bytes = 6): string => crypto.randomBytes(bytes).toString('hex');

