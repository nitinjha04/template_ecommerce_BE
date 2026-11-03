import { body, param } from 'express-validator';

const paymentStatuses = ['Completed', 'Pending', 'Failed'];
const paymentProviders = [
  'dsa_deeplink',
  'payu',
  'phonepe',
  'direct_upi',
  'razorpay',
  'cashfree',
];

export const updatePaymentStatusValidator = [
  param('id').isMongoId(),
  body('status').isIn(paymentStatuses),
];

export const paymentIdValidator = [param('id').isMongoId()];

export const createProviderPaymentValidator = [
  body('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
  body('provider')
    .trim()
    .isIn(paymentProviders)
    .withMessage('provider is invalid'),
  body('gatewayId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('gatewayId must be a positive integer'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 8, max: 18 })
    .withMessage('Valid phone is required'),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Valid name is required'),
];

export const verifyRazorpayValidator = [
  body('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
  body('razorpay_order_id')
    .trim()
    .notEmpty()
    .withMessage('razorpay_order_id is required'),
  body('razorpay_payment_id')
    .trim()
    .notEmpty()
    .withMessage('razorpay_payment_id is required'),
  body('razorpay_signature')
    .trim()
    .notEmpty()
    .withMessage('razorpay_signature is required'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 8, max: 18 })
    .withMessage('Valid phone is required'),
];
export const verifyCashfreeValidator = [
  body('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
  body('cashfree_order_id')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('cashfree_order_id is invalid'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 8, max: 18 })
    .withMessage('Valid phone is required'),
];

export const verifyPayuValidator = [
  body('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
  body('txnid')
    .optional()
    .trim()
    .isLength({ min: 3, max: 40 })
    .withMessage('txnid is invalid'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 8, max: 18 })
    .withMessage('Valid phone is required'),
];
