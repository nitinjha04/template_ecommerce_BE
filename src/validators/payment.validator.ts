import { body, param } from 'express-validator';

const paymentStatuses = ['Completed', 'Pending', 'Failed'];

export const updatePaymentStatusValidator = [
  param('id').isMongoId(),
  body('status').isIn(paymentStatuses),
];

export const paymentIdValidator = [param('id').isMongoId()];
