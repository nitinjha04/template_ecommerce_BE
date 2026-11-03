"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetSuccessEmail = void 0;
const passwordResetSuccessEmail = (name, brandName) => ({
    subject: `Your ${brandName} password has been reset`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; line-height: 1.6; color: #333;">
      <h2 style="color: #1a5e5e; font-weight: normal;">Password reset successful</h2>
      <p>Hi ${name},</p>
      <p>Your ${brandName} account password has been reset successfully.</p>
      <p style="padding: 16px; background: #fef3c7; border-left: 3px solid #d97706; font-size: 14px;">
        If you did not make this change, please contact support immediately and reset your password again.
      </p>
      <p style="color: #666; font-size: 13px;">For your security, we recommend using a strong, unique password.</p>
    </div>
  `,
});
exports.passwordResetSuccessEmail = passwordResetSuccessEmail;
