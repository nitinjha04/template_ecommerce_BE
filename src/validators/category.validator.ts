import { body, param } from 'express-validator';

export const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
];

export const updateCategoryValidator = [
  param('id').isMongoId().withMessage('Invalid category id'),
  body('name').optional().trim().notEmpty(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
];

export const categoryIdValidator = [
  param('id').isMongoId().withMessage('Invalid category id'),
];
