"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePemFromEnv = void 0;
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
