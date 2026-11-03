"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapSpkiPublicKeyBase64ToPem = exports.wrapPkcs8PrivateKeyBase64ToPem = exports.normalizePemFromEnv = void 0;
const stripWrappingQuotes = (value) => {
    const v = value.trim();
    if ((v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
    }
    return v;
};
/**
 * Env PEMs are often stored with literal `\n`. This normalizes into real newlines
 * without logging or exposing key material.
 */
const normalizePemFromEnv = (value) => stripWrappingQuotes(value).replace(/\\n/g, '\n').trim();
exports.normalizePemFromEnv = normalizePemFromEnv;
const chunk64 = (s) => s
    .replace(/\s+/g, '')
    .match(/.{1,64}/g)
    ?.join('\n') ?? s;
/**
 * PHP integration stores keys as "PKCS#8 base64 body only".
 * This wraps it into a PEM string compatible with OpenSSL/Node.
 */
const wrapPkcs8PrivateKeyBase64ToPem = (base64Body) => `-----BEGIN PRIVATE KEY-----\n${chunk64(stripWrappingQuotes(base64Body))}\n-----END PRIVATE KEY-----\n`;
exports.wrapPkcs8PrivateKeyBase64ToPem = wrapPkcs8PrivateKeyBase64ToPem;
const wrapSpkiPublicKeyBase64ToPem = (base64Body) => `-----BEGIN PUBLIC KEY-----\n${chunk64(stripWrappingQuotes(base64Body))}\n-----END PUBLIC KEY-----\n`;
exports.wrapSpkiPublicKeyBase64ToPem = wrapSpkiPublicKeyBase64ToPem;
