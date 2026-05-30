export const signupWelcomeEmail = (name: string, shopUrl: string) => ({
  subject: 'Welcome to Casaq — your account is ready',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; line-height: 1.6; color: #333;">
      <h2 style="color: #1a5e5e; font-weight: normal;">Welcome, ${name}!</h2>
      <p>Your email has been verified and your Casaq account is now active.</p>
      <p>You can sign in anytime to shop, save items to your wishlist, and track your orders.</p>
      <p style="margin-top: 24px;">
        <a href="${shopUrl}/shop"
           style="display: inline-block; background: #1a5e5e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Start shopping
        </a>
      </p>
      <p style="color: #666; font-size: 13px; margin-top: 32px;">Thank you for joining Casaq.</p>
    </div>
  `,
});
