"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentMethodsSnapshot = exports.resolveStoreDomainFromRequest = void 0;
const env_1 = require("../config/env");
const store_context_1 = require("../context/store.context");
const storeDomain_1 = require("../utils/storeDomain");
const resolveStoreDomainFromRequest = (req) => {
    const fromContext = (0, store_context_1.getStoreContext)()?.storeDomain;
    if (fromContext)
        return fromContext;
    return (0, storeDomain_1.extractDomainFromRequest)({
        headerDomain: typeof req.headers['x-store-domain'] === 'string'
            ? req.headers['x-store-domain']
            : undefined,
        origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
        referer: typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
        host: typeof req.headers.host === 'string' ? req.headers.host : undefined,
    });
};
exports.resolveStoreDomainFromRequest = resolveStoreDomainFromRequest;
const getPaymentMethodsSnapshot = (storeDomain) => {
    const rzpCreds = (0, env_1.resolveRazorpayCredentials)(storeDomain);
    const cfCreds = (0, env_1.resolveCashfreeCredentials)(storeDomain);
    const payuCreds = (0, env_1.resolvePayuCredentials)(storeDomain);
    const razorpay = Boolean(rzpCreds) || (0, env_1.isRazorpayConfigured)();
    const cashfree = Boolean(cfCreds) || (0, env_1.isCashfreeConfigured)();
    const payu = Boolean(payuCreds) || (0, env_1.isPayuConfigured)();
    const dsa = (0, env_1.isDsaGatewayConfigured)();
    const keyId = rzpCreds?.keyId ?? ((0, env_1.isRazorpayConfigured)() ? env_1.env.razorpay.keyId : undefined);
    const appId = cfCreds?.appId ?? ((0, env_1.isCashfreeConfigured)() ? env_1.env.cashfree.appId : undefined);
    const payuKey = payuCreds?.key ?? ((0, env_1.isPayuConfigured)() ? env_1.env.payu.key : undefined);
    const dsaGatewayId = (0, env_1.getDsaGatewayIdForDomain)(storeDomain);
    const dsaLabel = (0, env_1.getDsaGatewayLabelForDomain)(storeDomain);
    return {
        razorpay,
        ...(razorpay && keyId ? { keyId, keyIdPrefix: `${keyId.slice(0, 6)}…` } : {}),
        cashfree,
        ...(cashfree && appId ? { appId, appIdPrefix: `${appId.slice(0, 6)}…` } : {}),
        ...(cashfree ? { cashfreeEnv: cfCreds?.env ?? env_1.env.cashfree.env } : {}),
        payu,
        ...(payu && payuKey
            ? { payuKey, payuKeyPrefix: `${payuKey.slice(0, 6)}…` }
            : {}),
        ...(payu ? { payuEnv: payuCreds?.env ?? env_1.env.payu.env } : {}),
        dsa,
        dsaLabel,
        ...(dsaGatewayId ? { dsaGatewayId } : {}),
        ...(storeDomain ? { storeDomain } : {}),
    };
};
exports.getPaymentMethodsSnapshot = getPaymentMethodsSnapshot;
