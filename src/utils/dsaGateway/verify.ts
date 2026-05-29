import crypto from 'crypto';
import { normalizePemFromEnv, wrapSpkiPublicKeyBase64ToPem } from './pem';

export const verifyDsaBase64 = (
  data: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean => {
  const raw = normalizePemFromEnv(publicKeyPem);
  const pem = raw.includes('BEGIN') ? raw : wrapSpkiPublicKeyBase64ToPem(raw);
  const keyObj = crypto.createPublicKey({ key: pem, format: 'pem' });
  const verifier = crypto.createVerify('SHA1');
  verifier.update(data);
  verifier.end();
  return verifier.verify(keyObj, signatureBase64, 'base64');
};

