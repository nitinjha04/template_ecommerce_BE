import { Router } from 'express';
import { param } from 'express-validator';
import { PincodeController } from '../controllers/pincode.controller';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get(
  '/:pin',
  validate([
    param('pin')
      .matches(/^\d{6}$/)
      .withMessage('PIN must be a 6-digit number'),
  ]),
  PincodeController.lookup
);

export default router;
