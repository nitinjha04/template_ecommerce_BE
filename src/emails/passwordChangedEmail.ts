export const passwordChangedEmail = (name: string, brandName: string) => ({
  subject: `Your ${brandName} password was changed`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; line-height: 1.6; color: #333;">
      <h2 style="color: #1a5e5e; font-weight: normal;">Password updated</h2>
      <p>Hi ${name},</p>
      <p>This confirms that your ${brandName} account password was changed successfully.</p>
      <p style="padding: 16px; background: #fef3c7; border-left: 3px solid #d97706; font-size: 14px;">
        If you did not make this change, please contact us immediately and reset your password.
      </p>
      <p style="color: #666; font-size: 13px;">You can sign in with your new password at any time.</p>
    </div>
  `,
});
