import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  categoryIdValidator,
  createCategoryValidator,
  updateCategoryValidator,
} from '../validators/category.validator';

const router = Router();

router.get('/', CategoryController.list);

router.get(
  '/all',
  authenticate,
  authorize('admin'),
  CategoryController.listAll
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCategoryValidator),
  CategoryController.create
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateCategoryValidator),
  CategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(categoryIdValidator),
  CategoryController.remove
);

export default router;
