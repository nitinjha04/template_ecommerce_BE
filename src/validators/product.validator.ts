import { body, param, query } from 'express-validator';

const categories = [
  'Men',
  'Women',
  'Outerwear',
  'Knitwear',
  'Shirts',
  'Trousers',
  'Accessories',
];

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
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
  body('price').optional().isFloat({ min: 0 }),
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
