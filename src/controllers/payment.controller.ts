import { env, isCashfreeConfigured, isPayuConfigured, isRazorpayConfigured, resolveCashfreeCredentials, resolvePayuCredentials, resolveRazorpayCredentials } from '../config/env';
import { getStoreContext } from '../context/store.context';
import { DsaGatewayPaymentService } from '../services/dsaGatewayPayment.service';
import { CashfreePaymentService } from '../services/cashfreePayment.service';
import { PayuPaymentService } from '../services/payuPayment.service';
import { RazorpayPaymentService } from '../services/razorpayPayment.service';
import { ApiError } from '../utils/ApiError';
import { Order, Payment } from '../models';
import { mergeStoreFilter } from '../utils/storeScope';
import { pickStoreIdFromQuery } from '../utils/adminStoreQuery';
import { PaymentService } from '../services/payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamId } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';
import { AuthRequest, PaymentStatus } from '../types';
import { Request, Response } from 'express';

export class PaymentController {
  static getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, search, status } = req.query;
    const result = await PaymentService.getAllAdmin({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      storeId: pickStoreIdFromQuery(req.query.storeId),
    });
    ApiResponse.success(res, result.items, 'Payments fetched', 200, result.pagination);
  });

  static getMyPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const payments = await PaymentService.getMyPayments(req.user!.userId);
    ApiResponse.success(res, payments);
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user!.role === 'admin';
    const payment = await PaymentService.getById(
      getParamId(req),
      req.user!.userId,
      isAdmin
    );
    ApiResponse.success(res, payment);
  });

  static updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const payment = await PaymentService.updateStatus(
      getParamId(req),
      req.body.status as PaymentStatus
    );
    ApiResponse.success(res, payment, 'Payment status updated');
  });

  static createProviderPayment = asyncHandler(async (req: Request, res: Response) => {
    const {
      orderNumber,
      provider,
      gatewayId,
      email,
      phone,
      name,
    } = req.body as {
      orderNumber: string;
      provider: 'dsa_deeplink' | 'payu' | 'phonepe' | 'direct_upi' | 'razorpay' | 'cashfree';
      gatewayId?: number;
      email?: string;
      phone?: string;
      name?: string;
    };

    if (provider === 'cashfree') {
      const result = await CashfreePaymentService.createForOrder({
        orderNumber,
        email,
        phone,
        name,
      });
      ApiResponse.success(res, result, 'Cashfree order created');
      return;
    }

    if (provider === 'payu') {
      const result = await PayuPaymentService.createForOrder({
        orderNumber,
        email,
        phone,
        name,
      });
      ApiResponse.success(res, result, 'PayU checkout created');
      return;
    }

    if (provider === 'razorpay') {
      const result = await RazorpayPaymentService.createForOrder({
        orderNumber,
        email,
        phone,
        name,
      });
      ApiResponse.success(res, result, 'Razorpay order created');
      return;
    }

    if (provider === 'dsa_deeplink') {
      const result = await DsaGatewayPaymentService.createForOrder({
        orderNumber,
        gatewayId,
        email,
        phone,
        name,
      });
      ApiResponse.success(res, result, 'Payment link created');
      return;
    }

    if (provider === 'direct_upi') {
      const vpa = env.directUpi.vpa;
      if (!vpa) {
        throw new ApiError(500, 'Direct UPI is not configured');
      }

      const order = await Order.findOne(
        mergeStoreFilter({ orderNumber: orderNumber.trim() })
      );
      if (!order) throw new ApiError(404, 'Order not found');

      // Optional guest safety check (match on email/phone if provided)
      if (email && order.email !== email.trim().toLowerCase()) {
        throw new ApiError(403, 'Order email does not match');
      }
      if (phone) {
        const digits = phone.replace(/\D/g, '');
        const orderDigits = String(order.phone ?? '').replace(/\D/g, '');
        if (digits && orderDigits && digits !== orderDigits) {
          throw new ApiError(403, 'Order phone does not match');
        }
      }

      const payment = await Payment.findOne({ order: order._id });
      if (!payment) throw new ApiError(404, 'Payment record not found for order');
      if (payment.status === 'Completed') {
        throw new ApiError(400, 'Order is already paid');
      }

      const amount = String(order.total);
      const tn = `Order ${order.orderNumber}`;
      const upiLink =
        `upi://pay?pa=${encodeURIComponent(vpa)}` +
        `&am=${encodeURIComponent(amount)}` +
        `&cu=INR` +
        `&tn=${encodeURIComponent(tn)}`;

      await Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            provider: 'direct_upi',
            method: 'Direct UPI',
            status: 'Pending',
            directUpi: {
              vpa,
              upiLink,
            },
          },
        }
      );

      ApiResponse.success(
        res,
        { upiLink, qrData: upiLink, vpa, amount: order.total, orderNumber: order.orderNumber },
        'UPI link created'
      );
      return;
    }

    if (provider === 'phonepe') {
      throw new ApiError(
        501,
        'PhonePe integration is not configured yet. Please choose another method.'
      );
    }

    throw new ApiError(400, 'Invalid provider');
  });

  /** Public: which checkout providers are enabled on this API. */
  static getAvailableMethods = asyncHandler(async (_req: Request, res: Response) => {
    const storeDomain = getStoreContext()?.storeDomain;
    const rzpCreds = resolveRazorpayCredentials(storeDomain);
    const cfCreds = resolveCashfreeCredentials(storeDomain);
    const payuCreds = resolvePayuCredentials(storeDomain);
    const razorpay = Boolean(rzpCreds) || isRazorpayConfigured();
    const cashfree = Boolean(cfCreds) || isCashfreeConfigured();
    const payu = Boolean(payuCreds) || isPayuConfigured();
    const keyId = rzpCreds?.keyId ?? (isRazorpayConfigured() ? env.razorpay.keyId : undefined);
    const appId = cfCreds?.appId ?? (isCashfreeConfigured() ? env.cashfree.appId : undefined);
    const payuKey = payuCreds?.key ?? (isPayuConfigured() ? env.payu.key : undefined);
    ApiResponse.success(
      res,
      {
        razorpay,
        keyId: razorpay ? keyId : undefined,
        keyIdPrefix: keyId ? `${keyId.slice(0, 6)}…` : undefined,
        cashfree,
        appId: cashfree ? appId : undefined,
        appIdPrefix: appId ? `${appId.slice(0, 6)}…` : undefined,
        cashfreeEnv: cashfree ? (cfCreds?.env ?? env.cashfree.env) : undefined,
        payu,
        payuKey: payu ? payuKey : undefined,
        payuKeyPrefix: payuKey ? `${payuKey.slice(0, 6)}…` : undefined,
        payuEnv: payu ? (payuCreds?.env ?? env.payu.env) : undefined,
        storeDomain: storeDomain || undefined,
      },
      'Payment methods'
    );
  });

  static verifyRazorpay = asyncHandler(async (req: Request, res: Response) => {
    const {
      orderNumber,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email,
      phone,
    } = req.body as {
      orderNumber: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      email?: string;
      phone?: string;
    };

    const result = await RazorpayPaymentService.verifyAndCapture({
      orderNumber,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email,
      phone,
    });
    ApiResponse.success(res, result, 'Payment verified');
  });

  static razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.header('x-razorpay-signature') ?? undefined;
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}));

    await RazorpayPaymentService.handleWebhook(rawBody, signature, req.body);
    res.status(200).json({ status: 'ok' });
  });

  static verifyCashfree = asyncHandler(async (req: Request, res: Response) => {
    const { orderNumber, cashfree_order_id, email, phone } = req.body as {
      orderNumber: string;
      cashfree_order_id?: string;
      email?: string;
      phone?: string;
    };

    const result = await CashfreePaymentService.verifyAndCapture({
      orderNumber,
      cashfree_order_id,
      email,
      phone,
    });
    ApiResponse.success(res, result, 'Payment verified');
  });

  static cashfreeWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.header('x-webhook-signature') ?? undefined;
    const timestamp = req.header('x-webhook-timestamp') ?? undefined;
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}));

    await CashfreePaymentService.handleWebhook(
      rawBody,
      signature,
      timestamp,
      req.body
    );
    res.status(200).json({ status: 'ok' });
  });

  /** PayU surl/furl — browser lands here after hosted checkout. */
  static payuReturn = asyncHandler(async (req: Request, res: Response) => {
    const payload = {
      ...(typeof req.body === 'object' && req.body ? req.body : {}),
      ...(typeof req.query === 'object' && req.query ? req.query : {}),
    } as Record<string, unknown>;

    const { redirectUrl } = await PayuPaymentService.handleReturn(payload);
    res.redirect(302, redirectUrl);
  });

  /** PayU server webhook / IPN (configure in PayU dashboard or via partner_webhook_*). */
  static payuWebhook = asyncHandler(async (req: Request, res: Response) => {
    const payload = {
      ...(typeof req.body === 'object' && req.body ? req.body : {}),
      ...(typeof req.query === 'object' && req.query ? req.query : {}),
    } as Record<string, unknown>;

    const result = await PayuPaymentService.handleWebhook(payload);
    res.status(200).json(result);
  });

  static verifyPayu = asyncHandler(async (req: Request, res: Response) => {
    const { orderNumber, txnid, email, phone } = req.body as {
      orderNumber: string;
      txnid?: string;
      email?: string;
      phone?: string;
    };

    const result = await PayuPaymentService.verifyAndCapture({
      orderNumber,
      txnid,
      email,
      phone,
    });
    ApiResponse.success(res, result, 'Payment verified');
  });
}
