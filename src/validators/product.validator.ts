import { body, param, query } from 'express-validator';
import { MAX_PRODUCT_IMAGES } from '../constants/productImages';

const imagesValidator = body('images')
  .optional()
  .isArray({ max: MAX_PRODUCT_IMAGES })
  .withMessage(`Maximum ${MAX_PRODUCT_IMAGES} images allowed`)
  .custom((value) => {
    if (value === undefined) return true;
    if (!Array.isArray(value)) return false;
    const urls = value.filter((u) => typeof u === 'string' && u.trim());
    if (urls.length === 0) {
      throw new Error('At least one product image is required');
    }
    if (urls.length > MAX_PRODUCT_IMAGES) {
      throw new Error(`Maximum ${MAX_PRODUCT_IMAGES} images allowed`);
    }
    return true;
  });

const optionalString = (field: string) =>
  body(field).optional({ values: 'null' }).isString().trim();

const optionalDate = (field: string) =>
  body(field).optional({ values: 'null' }).isISO8601().toDate();

const detailFields = [
  optionalString('fabricComposition'),
  optionalString('garmentLength'),
  optionalString('packageContains'),
  optionalString('washCare'),
  optionalString('neckline'),
  optionalString('sleeveLength'),
  optionalString('fitting'),
  optionalString('weight'),
  optionalString('dimensions'),
  optionalString('breadcrumbCategory'),
  body('originalPrice').optional().isFloat({ min: 0 }),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('isHot').optional().isBoolean(),
  body('isPublished').optional().isBoolean(),
  optionalDate('deliveryStartDate'),
  optionalDate('deliveryEndDate'),
];

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price')
    .isFloat({ min: 500, max: 1000 })
    .withMessage('Price must be between ₹500 and ₹1000'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('sizes').optional().isArray(),
  body('colors').optional().isArray(),
  imagesValidator,
  body('tags').optional().isArray(),
  body('slug').optional().trim().isLength({ min: 1, max: 200 }),
  body('metaTitle').optional().trim().isLength({ max: 200 }),
  body('metaDescription').optional().trim().isLength({ max: 500 }),
  body('metaKeywords').optional().isArray(),
  body('inStock').optional().isBoolean(),
  body('featured').optional().isBoolean(),
  body('isPublished').optional().isBoolean(),
  ...detailFields,
];

export const updateProductValidator = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('name').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 500, max: 1000 }),
  body('category').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('sizes').optional().isArray(),
  body('colors').optional().isArray(),
  imagesValidator,
  body('tags').optional().isArray(),
  body('slug').optional().trim().isLength({ min: 1, max: 200 }),
  body('metaTitle').optional().trim().isLength({ max: 200 }),
  body('metaDescription').optional().trim().isLength({ max: 500 }),
  body('metaKeywords').optional().isArray(),
  body('inStock').optional().isBoolean(),
  body('featured').optional().isBoolean(),
  body('isPublished').optional().isBoolean(),
  ...detailFields,
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
  query('category').optional().isString().trim(),
  query('featured').optional().isIn(['true', 'false']),
  query('inStock').optional().isIn(['true', 'false']),
  query('search').optional().isString(),
  query('sort').optional().isIn([
    'price_asc',
    'price_desc',
    'newest',
    'oldest',
    'random',
  ]),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sizes').optional().isString(),
  query('subcategory').optional().isString(),
  query('includeUnpublished').optional().isIn(['true', 'false']),
];
