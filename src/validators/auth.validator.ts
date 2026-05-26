import { body } from 'express-validator';

export const signupValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const verifyOtpValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit code'),
];

export const resetPasswordValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const resendSignupOtpValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];
