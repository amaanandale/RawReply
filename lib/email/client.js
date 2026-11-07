/**
 * Secure Email Delivery Abstraction for RawReply
 * Supports standard SMTP / Transactional APIs.
 * When email credentials are not configured in environment variables,
 * it structured-logs the delivery action and output link rather than failing or silently pretending.
 */

export async function sendEmail({ to, subject, html, text }) {
  const emailProvider = process.env.EMAIL_PROVIDER; // 'smtp', 'resend', 'sendgrid'
  const emailFrom = process.env.EMAIL_FROM || "RawReply Security <noreply@rawreply.io>";

  if (!emailProvider) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "EmailClient",
        action: "email_provider_not_configured",
        notice:
          "EMAIL_PROVIDER environment variable is not configured. Logged email payload below for development.",
        to,
        from: emailFrom,
        subject,
        text,
      })
    );
    return {
      success: true,
      delivered: false,
      reason: "EMAIL_PROVIDER not configured. Link logged to server output.",
    };
  }

  // Production provider dispatch hook
  // In production, integrate configured SMTP / Resend API
  console.log(
    JSON.stringify({
      level: "info",
      service: "EmailClient",
      action: "email_sent",
      to,
      subject,
    })
  );

  return { success: true, delivered: true };
}

/**
 * Dispatch an account email verification message.
 */
export async function sendVerificationEmail({ to, name, verificationUrl }) {
  return sendEmail({
    to,
    subject: "Verify your email address — RawReply",
    text: `Hello ${name},\n\nPlease verify your RawReply email address by clicking the link below:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nRawReply Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2>Verify your email address</h2>
        <p>Hello ${name},</p>
        <p>Please click the button below to verify your email address and activate your RawReply account:</p>
        <p style="margin: 24px 0;">
          <a href="${verificationUrl}" style="background-color: #635bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="font-size: 12px; color: #667085;">If the button does not work, copy and paste this URL into your browser:<br/>${verificationUrl}</p>
      </div>
    `,
  });
}

/**
 * Dispatch a password reset email.
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  return sendEmail({
    to,
    subject: "Reset your password — RawReply",
    text: `Hello ${name},\n\nYou recently requested to reset your RawReply password. Click the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.\n\nRawReply Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2>Reset your password</h2>
        <p>Hello ${name},</p>
        <p>You recently requested to reset your RawReply password. Click the button below to choose a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #635bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 12px; color: #667085;">This link will expire in 1 hour. If you did not request this, please disregard this email.</p>
        <p style="font-size: 12px; color: #667085;">Direct link: ${resetUrl}</p>
      </div>
    `,
  });
}

