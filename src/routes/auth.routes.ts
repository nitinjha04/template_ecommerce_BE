import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginValidator, signupValidator } from '../validators/auth.validator';

const router = Router();

router.post('/signup', validate(signupValidator), AuthController.signup);
router.post('/login', validate(loginValidator), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);

export default router;
