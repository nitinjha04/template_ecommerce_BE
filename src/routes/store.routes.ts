import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createStoreValidator,
  storeIdValidator,
  updateStoreValidator,
} from '../validators/store.validator';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', StoreController.list);
router.get('/:id', validate(storeIdValidator), StoreController.getById);
router.post('/', validate(createStoreValidator), StoreController.create);
router.patch('/:id', validate(updateStoreValidator), StoreController.update);
router.delete('/:id', validate(storeIdValidator), StoreController.remove);

export default router;
