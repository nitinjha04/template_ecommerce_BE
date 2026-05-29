"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signDsaBase64 = void 0;
const crypto_1 = __importDefault(require("crypto"));
const pem_1 = require("./pem");
const signDsaBase64 = (data, privateKeyPem) => {
    const raw = (0, pem_1.normalizePemFromEnv)(privateKeyPem);
    const keyObj = raw.includes('BEGIN')
        ? crypto_1.default.createPrivateKey({ key: raw, format: 'pem' })
        : crypto_1.default.createPrivateKey({
            key: Buffer.from(raw, 'base64'),
            format: 'der',
            type: 'pkcs8',
        });
    const signer = crypto_1.default.createSign('SHA1');
    signer.update(data);
    signer.end();
    return signer.sign(keyObj, 'base64');
};
exports.signDsaBase64 = signDsaBase64;
