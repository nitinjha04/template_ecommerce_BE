import { body, param } from 'express-validator';

const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export const createOrderValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('shippingAddress.firstName').trim().notEmpty(),
  body('shippingAddress.lastName').trim().notEmpty(),
  body('shippingAddress.phone').trim().notEmpty(),
  body('shippingAddress.street').trim().notEmpty(),
  body('shippingAddress.city').trim().notEmpty(),
  body('shippingAddress.state').trim().notEmpty(),
  body('shippingAddress.country').trim().notEmpty(),
  body('shippingAddress.postalCode').trim().notEmpty(),
  body('orderNote').optional().isString().trim(),
  body('paymentMethod')
    .equals('cod')
    .withMessage('Only Cash on Delivery is accepted'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId').isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.size').trim().notEmpty(),
  body('items.*.color').trim().notEmpty(),
];

export const updateOrderStatusValidator = [
  param('id').isMongoId(),
  body('status').isIn(orderStatuses),
];

export const orderIdValidator = [param('id').isMongoId()];
