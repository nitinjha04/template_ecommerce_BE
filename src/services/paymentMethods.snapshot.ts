import { Request } from 'express';
import {
  env,
  getDsaGatewayIdForDomain,
  getDsaGatewayLabelForDomain,
  isCashfreeConfigured,
  isDsaGatewayConfigured,
  isPayuConfigured,
  isRazorpayConfigured,
  resolveCashfreeCredentials,
  resolvePayuCredentials,
  resolveRazorpayCredentials,
} from '../config/env';
import { getStoreContext } from '../context/store.context';
import { extractDomainFromRequest } from '../utils/storeDomain';

export const resolveStoreDomainFromRequest = (
  req: Request
): string | undefined => {
  const fromContext = getStoreContext()?.storeDomain;
  if (fromContext) return fromContext;

  return extractDomainFromRequest({
    headerDomain:
      typeof req.headers['x-store-domain'] === 'string'
        ? req.headers['x-store-domain']
        : undefined,
    origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
    referer:
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
    host: typeof req.headers.host === 'string' ? req.headers.host : undefined,
  });
};

export const getPaymentMethodsSnapshot = (storeDomain?: string) => {
  const rzpCreds = resolveRazorpayCredentials(storeDomain);
  const cfCreds = resolveCashfreeCredentials(storeDomain);
  const payuCreds = resolvePayuCredentials(storeDomain);
  const razorpay = Boolean(rzpCreds) || isRazorpayConfigured();
  const cashfree = Boolean(cfCreds) || isCashfreeConfigured();
  const payu = Boolean(payuCreds) || isPayuConfigured();
  const dsa = isDsaGatewayConfigured();
  const keyId =
    rzpCreds?.keyId ?? (isRazorpayConfigured() ? env.razorpay.keyId : undefined);
  const appId =
    cfCreds?.appId ?? (isCashfreeConfigured() ? env.cashfree.appId : undefined);
  const payuKey =
    payuCreds?.key ?? (isPayuConfigured() ? env.payu.key : undefined);
  const dsaGatewayId = getDsaGatewayIdForDomain(storeDomain);
  const dsaLabel = getDsaGatewayLabelForDomain(storeDomain);

  return {
    razorpay,
    ...(razorpay && keyId ? { keyId, keyIdPrefix: `${keyId.slice(0, 6)}…` } : {}),
    cashfree,
    ...(cashfree && appId ? { appId, appIdPrefix: `${appId.slice(0, 6)}…` } : {}),
    ...(cashfree ? { cashfreeEnv: cfCreds?.env ?? env.cashfree.env } : {}),
    payu,
    ...(payu && payuKey
      ? { payuKey, payuKeyPrefix: `${payuKey.slice(0, 6)}…` }
      : {}),
    ...(payu ? { payuEnv: payuCreds?.env ?? env.payu.env } : {}),
    dsa,
    dsaLabel,
    ...(dsaGatewayId ? { dsaGatewayId } : {}),
    ...(storeDomain ? { storeDomain } : {}),
  };
};
