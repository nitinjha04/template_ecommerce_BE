import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { adminListQueryValidator } from '../validators/adminList.validator';
import {
  contactIdValidator,
  createContactValidator,
} from '../validators/contact.validator';

const router = Router();

router.post('/', validate(createContactValidator), ContactController.create);

router.use(authenticate, authorize('admin'));
router.get('/', validate(adminListQueryValidator), ContactController.getAll);
router.get('/:id', validate(contactIdValidator), ContactController.getById);
router.patch('/:id/read', validate(contactIdValidator), ContactController.markAsRead);
router.delete('/:id', validate(contactIdValidator), ContactController.remove);

export default router;
