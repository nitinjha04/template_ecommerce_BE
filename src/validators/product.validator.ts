import { body, param, query } from 'express-validator';

const categories = ['Men', 'Women', 'Accessories'];

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price')
    .isFloat({ min: 500, max: 1000 })
    .withMessage('Price must be between ₹500 and ₹1000'),
  body('category').isIn(categories).withMessage('Invalid category'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('sizes').optional().isArray(),
  body('colors').optional().isArray(),
  body('images').optional().isArray(),
  body('tags').optional().isArray(),
  body('slug').optional().trim().isLength({ min: 1, max: 200 }),
  body('metaTitle').optional().trim().isLength({ max: 200 }),
  body('metaDescription').optional().trim().isLength({ max: 500 }),
  body('metaKeywords').optional().isArray(),
  body('inStock').optional().isBoolean(),
  body('featured').optional().isBoolean(),
];

export const updateProductValidator = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('name').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 500, max: 1000 }),
  body('category').optional().isIn(categories),
  body('description').optional().trim().notEmpty(),
  body('sizes').optional().isArray(),
  body('colors').optional().isArray(),
  body('images').optional().isArray(),
  body('tags').optional().isArray(),
  body('slug').optional().trim().isLength({ min: 1, max: 200 }),
  body('metaTitle').optional().trim().isLength({ max: 200 }),
  body('metaDescription').optional().trim().isLength({ max: 500 }),
  body('metaKeywords').optional().isArray(),
  body('inStock').optional().isBoolean(),
  body('featured').optional().isBoolean(),
];

export const productIdValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Product identifier is required')
    .isLength({ min: 1, max: 200 }),
];

export const productQueryValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(categories),
  query('featured').optional().isIn(['true', 'false']),
  query('inStock').optional().isIn(['true', 'false']),
  query('search').optional().isString(),
  query('sort').optional().isIn(['price_asc', 'price_desc', 'newest', 'oldest']),
];
