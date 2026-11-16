import { body } from 'express-validator';

/**
 * Validates email format and lowercases + trims only.
 * Do not use express-validator's normalizeEmail() — it strips Gmail +tags
 * (e.g. user+15@gmail.com → user@gmail.com).
 */
export const emailField = (field = 'email') =>
  body(field)
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .customSanitizer((value: string) => value.toLowerCase());
