"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupOtpEmail = void 0;
const signupOtpEmail = (otp, name, brandName) => ({
    subject: `Verify your ${brandName} account`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #3d2e4f;">Welcome to ${brandName}</h2>
      <p>Hi ${name},</p>
      <p>Use this code to verify your email and activate your account. It expires in 10 minutes.</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #3d2e4f;">${otp}</p>
      <p style="color: #666; font-size: 13px;">If you did not create an account, you can ignore this email.</p>
    </div>
  `,
});
exports.signupOtpEmail = signupOtpEmail;
