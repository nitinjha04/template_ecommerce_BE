"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetOtpEmail = void 0;
const passwordResetOtpEmail = (otp, name, brandName) => ({
    subject: `Your ${brandName} password reset code`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a5e5e;">Password reset</h2>
      <p>Hi ${name},</p>
      <p>Use this one-time code to reset your password. It expires in 10 minutes.</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1a5e5e;">${otp}</p>
      <p style="color: #666; font-size: 13px;">If you did not request this, you can ignore this email.</p>
    </div>
  `,
});
exports.passwordResetOtpEmail = passwordResetOtpEmail;
