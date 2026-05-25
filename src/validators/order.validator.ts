import { body, param } from 'express-validator';

const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const requiredField = (path: string, label: string) =>
  body(path).trim().notEmpty().withMessage(`${label} is required`);

const phoneDigitsRule = (path: string, label: string) =>
  body(path)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .custom((value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        throw new Error(`${label} must be 10–15 digits`);
      }
      return true;
    });

export const createOrderValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  phoneDigitsRule('phone', 'Phone'),
  requiredField('shippingAddress.firstName', 'First name'),
  requiredField('shippingAddress.lastName', 'Last name'),
  body('shippingAddress.company').optional({ values: 'falsy' }).trim().isString(),
  body('shippingAddress.phone').optional({ values: 'falsy' }).trim().isString(),
  requiredField('shippingAddress.street', 'Street address'),
  requiredField('shippingAddress.city', 'City'),
  requiredField('shippingAddress.state', 'State'),
  requiredField('shippingAddress.country', 'Country'),
  requiredField('shippingAddress.postalCode', 'Postal code'),
  body('orderNote').optional({ values: 'falsy' }).isString().trim(),
  body('paymentMethod')
    .equals('cod')
    .withMessage('Only Cash on Delivery is accepted'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId').isMongoId().withMessage('Invalid product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
  body('items.*.size')
    .customSanitizer((value) => {
      const s = typeof value === 'string' ? value.trim() : '';
      return s || 'One Size';
    })
    .isString()
    .notEmpty()
    .withMessage('Size is required'),
  body('items.*.color')
    .customSanitizer((value) => {
      const c = typeof value === 'string' ? value.trim() : '';
      return c || 'Default';
    })
    .isString()
    .notEmpty()
    .withMessage('Color is required'),
];

export const updateOrderStatusValidator = [
  param('id').isMongoId(),
  body('status').isIn(orderStatuses),
];

export const orderIdValidator = [param('id').isMongoId()];

export const trackOrderValidator = [
  body('query').trim().notEmpty().withMessage('Enter order ID, email, or phone'),
];
