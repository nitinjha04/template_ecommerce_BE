import crypto from 'crypto';
import { normalizePemFromEnv } from './pem';

export const signDsaBase64 = (data: string, privateKeyPem: string): string => {
  const raw = normalizePemFromEnv(privateKeyPem);
  const keyObj = raw.includes('BEGIN')
    ? crypto.createPrivateKey({ key: raw, format: 'pem' })
    : crypto.createPrivateKey({
        key: Buffer.from(raw, 'base64'),
        format: 'der',
        type: 'pkcs8',
      });
  const signer = crypto.createSign('SHA1');
  signer.update(data);
  signer.end();
  return signer.sign(keyObj, 'base64');
};

