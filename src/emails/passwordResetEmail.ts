export const passwordResetEmail = (resetUrl: string, name: string) => ({
  subject: 'Reset your NEXACORE password',
  html: `
<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;background:#f9f9f9;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:40px;">
    <h1 style="font-weight:normal;letter-spacing:2px;margin:0 0 24px;">NEXACORE</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
    <p style="margin:32px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Reset Password</a>
    </p>
    <p style="font-size:12px;color:#888;">If you did not request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
});
