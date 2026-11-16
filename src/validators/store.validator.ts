import { body, param } from 'express-validator';

export const storeIdValidator = [param('id').isMongoId().withMessage('Invalid store id')];

export const createStoreValidator = [
  body('name').trim().notEmpty().withMessage('Store name is required'),
  body('domain').trim().notEmpty().withMessage('Domain is required'),
  body('slug').optional().trim().isLength({ min: 2, max: 80 }),
  body('isActive').optional().isBoolean(),
];

export const updateStoreValidator = [
  ...storeIdValidator,
  body('name').optional().trim().notEmpty(),
  body('domain').optional().trim().notEmpty(),
  body('slug').optional().trim().isLength({ min: 2, max: 80 }),
  body('isActive').optional().isBoolean(),
];
