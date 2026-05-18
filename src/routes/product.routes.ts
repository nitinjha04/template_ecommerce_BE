import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createProductValidator,
  productIdValidator,
  productQueryValidator,
  updateProductValidator,
} from '../validators/product.validator';

const router = Router();

router.get('/', validate(productQueryValidator), ProductController.getAll);
router.get('/:id', validate(productIdValidator), ProductController.getById);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createProductValidator),
  ProductController.create
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateProductValidator),
  ProductController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(productIdValidator),
  ProductController.remove
);

export default router;
