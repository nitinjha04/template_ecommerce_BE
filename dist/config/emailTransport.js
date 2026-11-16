"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEmailStartup = exports.getEmailTransport = exports.isRenderHost = void 0;
const env_1 = require("./env");
const isRenderHost = () => process.env.RENDER === 'true';
exports.isRenderHost = isRenderHost;
/**
 * Transactional email is sent via Brevo/Sendinblue HTTPS API.
 */
const getEmailTransport = () => {
    const prefer = process.env.EMAIL_TRANSPORT?.trim().toLowerCase();
    if (prefer === 'brevo' && (0, env_1.isBrevoConfigured)())
        return 'brevo';
    if ((0, env_1.isBrevoConfigured)())
        return 'brevo';
    return 'none';
};
exports.getEmailTransport = getEmailTransport;
const logEmailStartup = () => {
    const transport = (0, exports.getEmailTransport)();
    console.log(`[email] Startup: transport=${transport}, enabled=${env_1.env.emailEnabled}`);
};
exports.logEmailStartup = logEmailStartup;
