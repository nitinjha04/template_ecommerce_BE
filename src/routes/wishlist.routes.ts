import { Router } from 'express';
import { body } from 'express-validator';
import { WishlistController } from '../controllers/wishlist.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', WishlistController.list);
router.post(
  '/toggle',
  validate([
    body('productId').trim().notEmpty().withMessage('productId is required'),
  ]),
  WishlistController.toggle
);
router.delete('/', WishlistController.clear);

export default router;
