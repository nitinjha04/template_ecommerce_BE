import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  forgotPasswordValidator,
  loginValidator,
  resendSignupOtpValidator,
  resetPasswordValidator,
  signupValidator,
  verifyOtpValidator,
} from '../validators/auth.validator';

const router = Router();

router.post('/signup', validate(signupValidator), AuthController.signup);
router.post(
  '/verify-signup-otp',
  validate(verifyOtpValidator),
  AuthController.verifySignupOtp
);
router.post(
  '/resend-signup-otp',
  validate(resendSignupOtpValidator),
  AuthController.resendSignupOtp
);
router.post('/login', validate(loginValidator), AuthController.login);
router.post('/admin/login', validate(loginValidator), AuthController.loginAdmin);
router.post(
  '/forgot-password',
  validate(forgotPasswordValidator),
  AuthController.forgotPassword
);
router.post(
  '/verify-forgot-otp',
  validate(verifyOtpValidator),
  AuthController.verifyForgotPasswordOtp
);
router.post(
  '/reset-password',
  validate(resetPasswordValidator),
  AuthController.resetPassword
);
router.get('/me', authenticate, AuthController.getMe);

export default router;
