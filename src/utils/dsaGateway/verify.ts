import crypto from 'crypto';
import { normalizePemFromEnv } from './pem';

export const verifyDsaBase64 = (
  data: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean => {
  const raw = normalizePemFromEnv(publicKeyPem);
  const keyObj = raw.includes('BEGIN')
    ? crypto.createPublicKey({ key: raw, format: 'pem' })
    : crypto.createPublicKey({
        key: Buffer.from(raw, 'base64'),
        format: 'der',
        type: 'spki',
      });
  const verifier = crypto.createVerify('SHA1');
  verifier.update(data);
  verifier.end();
  return verifier.verify(keyObj, signatureBase64, 'base64');
};

