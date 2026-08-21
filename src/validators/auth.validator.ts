import { body } from 'express-validator';
import { emailField } from './email';

export const signupValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  emailField(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const loginValidator = [
  emailField(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [emailField()];

export const verifyOtpValidator = [
  emailField(),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit code'),
];

export const resetPasswordValidator = [
  emailField(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const resendSignupOtpValidator = [emailField()];
