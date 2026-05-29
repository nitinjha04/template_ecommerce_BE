import crypto from 'crypto';
import { normalizePemFromEnv, wrapPkcs8PrivateKeyBase64ToPem } from './pem';

export const signDsaBase64 = (data: string, privateKeyPem: string): string => {
  const raw = normalizePemFromEnv(privateKeyPem);
  const pem = raw.includes('BEGIN') ? raw : wrapPkcs8PrivateKeyBase64ToPem(raw);
  const keyObj = crypto.createPrivateKey({ key: pem, format: 'pem' });
  const signer = crypto.createSign('SHA1');
  signer.update(data);
  signer.end();
  return signer.sign(keyObj, 'base64');
};

