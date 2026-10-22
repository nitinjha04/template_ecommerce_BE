import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { MAX_PRODUCT_IMAGES } from '../constants/productImages';

const router = Router();

router.use(authenticate, authorize('admin'));

router.post('/single', upload.single('image'), UploadController.uploadSingle);
router.post(
  '/multiple',
  upload.array('images', MAX_PRODUCT_IMAGES),
  UploadController.uploadMultiple
);

export default router;
