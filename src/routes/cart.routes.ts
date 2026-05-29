import { Router } from 'express';
import { body } from 'express-validator';
import { CartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', CartController.get);

router.post(
  '/items',
  validate([
    body('productId').trim().notEmpty().withMessage('productId is required'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be >= 1'),
    body('size').optional({ values: 'falsy' }).isString(),
    body('color').optional({ values: 'falsy' }).isString(),
  ]),
  CartController.upsertLine
);

router.delete(
  '/items',
  validate([
    body('productId').trim().notEmpty().withMessage('productId is required'),
    body('size').optional({ values: 'falsy' }).isString(),
    body('color').optional({ values: 'falsy' }).isString(),
  ]),
  CartController.removeLine
);

router.delete('/', CartController.clear);

export default router;

