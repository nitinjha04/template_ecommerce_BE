const stripWrappingQuotes = (value: string): string => {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
};

/**
 * Env PEMs are often stored with literal `\n`. This normalizes into real newlines
 * without logging or exposing key material.
 */
export const normalizePemFromEnv = (value: string): string =>
  stripWrappingQuotes(value).replace(/\\n/g, '\n').trim();

const chunk64 = (s: string): string =>
  s
    .replace(/\s+/g, '')
    .match(/.{1,64}/g)
    ?.join('\n') ?? s;

/**
 * PHP integration stores keys as "PKCS#8 base64 body only".
 * This wraps it into a PEM string compatible with OpenSSL/Node.
 */
export const wrapPkcs8PrivateKeyBase64ToPem = (base64Body: string): string =>
  `-----BEGIN PRIVATE KEY-----\n${chunk64(stripWrappingQuotes(base64Body))}\n-----END PRIVATE KEY-----\n`;

export const wrapSpkiPublicKeyBase64ToPem = (base64Body: string): string =>
  `-----BEGIN PUBLIC KEY-----\n${chunk64(stripWrappingQuotes(base64Body))}\n-----END PUBLIC KEY-----\n`;

