"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendViaBrevo = void 0;
const env_1 = require("./env");
const parseEmailFrom_1 = require("../utils/parseEmailFrom");
const SibApiV3Sdk = __importStar(require("@sendinblue/client"));
/**
 * Brevo/Sendinblue transactional API over HTTPS.
 * Ensure the sender address (EMAIL_FROM) is verified in Brevo → Senders.
 */
const sendViaBrevo = async ({ to, subject, html, from: fromRaw, }) => {
    const from = (0, parseEmailFrom_1.parseEmailFrom)(fromRaw);
    const senderEmail = from.email;
    if (!senderEmail) {
        throw new Error('EMAIL_FROM must include an email address');
    }
    const senderName = from.name || 'Casaq';
    const client = new SibApiV3Sdk.TransactionalEmailsApi();
    client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, env_1.env.brevo.apiKey);
    const payload = new SibApiV3Sdk.SendSmtpEmail();
    payload.sender = { name: senderName, email: senderEmail };
    payload.to = [{ email: to }];
    payload.subject = subject;
    payload.htmlContent = html;
    try {
        // SDK response shape varies by version; keep it defensive.
        const result = (await client.sendTransacEmail(payload));
        const messageId = result?.messageId ??
            result?.body?.messageId ??
            'ok';
        return { messageId };
    }
    catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`Brevo API error: ${detail}`);
    }
};
exports.sendViaBrevo = sendViaBrevo;
