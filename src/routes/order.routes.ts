import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminListQueryValidator } from '../validators/adminList.validator';
import {
  createOrderValidator,
  orderIdValidator,
  trackOrderValidator,
  updateOrderStatusValidator,
} from '../validators/order.validator';

const router = Router();

router.post('/track', validate(trackOrderValidator), OrderController.track);
router.post('/guest', validate(createOrderValidator), OrderController.createGuest);

router.use(authenticate);

router.post('/', validate(createOrderValidator), OrderController.create);
router.get('/my', OrderController.getMyOrders);
router.get('/export/csv', authorize('admin'), OrderController.exportCsv);
router.get(
  '/',
  authorize('admin'),
  validate(adminListQueryValidator),
  OrderController.getAll
);
router.get('/:id', validate(orderIdValidator), OrderController.getById);
router.patch(
  '/:id/status',
  authorize('admin'),
  validate(updateOrderStatusValidator),
  OrderController.updateStatus
);

export default router;
