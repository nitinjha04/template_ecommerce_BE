"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDsaBase64 = void 0;
const crypto_1 = __importDefault(require("crypto"));
const pem_1 = require("./pem");
const verifyDsaBase64 = (data, signatureBase64, publicKeyPem) => {
    const raw = (0, pem_1.normalizePemFromEnv)(publicKeyPem);
    const pem = raw.includes('BEGIN') ? raw : (0, pem_1.wrapSpkiPublicKeyBase64ToPem)(raw);
    const keyObj = crypto_1.default.createPublicKey({ key: pem, format: 'pem' });
    const verifier = crypto_1.default.createVerify('SHA1');
    verifier.update(data);
    verifier.end();
    return verifier.verify(keyObj, signatureBase64, 'base64');
};
exports.verifyDsaBase64 = verifyDsaBase64;
