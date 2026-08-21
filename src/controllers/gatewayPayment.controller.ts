import { Response } from 'express';
import { DsaGatewayPaymentService } from '../services/dsaGatewayPayment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../views/ApiResponse';
import { ApiError } from '../utils/ApiError';

export class GatewayPaymentController {
  static create = asyncHandler(async (req, res: Response) => {
    const { orderNumber, email, phone, name } = req.body as {
      orderNumber?: string;
      email?: string;
      phone?: string;
      name?: string;
    };

    if (!orderNumber?.trim()) {
      throw new ApiError(400, 'orderNumber is required');
    }

    const result = await DsaGatewayPaymentService.createForOrder({
      orderNumber: orderNumber.trim(),
      email,
      phone,
      name,
    });

    ApiResponse.success(res, result, 'Payment link created');
  });

  static webhook = asyncHandler(async (req, res: Response) => {
    // Gateway requires a literal "success" response body (not JSON).
    await DsaGatewayPaymentService.handleWebhook(req.body);
    res.type('text/plain').send('success');
  });

  static verify = asyncHandler(async (req, res: Response) => {
    const merchantOrderNo = String(req.params.merchantOrderNo ?? '').trim();
    if (!merchantOrderNo) throw new ApiError(400, 'merchantOrderNo is required');

    const result = await DsaGatewayPaymentService.verifyPayment(merchantOrderNo);
    ApiResponse.success(res, result, 'Payment verified');
  });

  static verifyByOrder = asyncHandler(async (req, res: Response) => {
    const orderNumber = String(req.params.orderNumber ?? '').trim();
    if (!orderNumber) throw new ApiError(400, 'orderNumber is required');

    const result = await DsaGatewayPaymentService.verifyPaymentByOrderNumber(orderNumber);
    ApiResponse.success(res, result, 'Payment verified');
  });
}

