import nodemailer from "nodemailer";

/**
 * Secure Email Delivery Abstraction for RawReply
 * Supports standard SMTP (Gmail, Outlook, custom SMTP via nodemailer),
 * Resend API, SendGrid API, and structured dev logging when unconfigured.
 */

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  return cachedTransporter;
}

async function sendViaResend({ from, to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Resend API failed with status ${res.status}`);
  }
  return data;
}

export async function sendEmail({ to, subject, html, text }) {
  const emailFrom = process.env.EMAIL_FROM || "RawReply Security <noreply@rawreply.io>";

  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend({ from: emailFrom, to, subject, html, text });
      console.log(
        JSON.stringify({
          level: "info",
          service: "EmailClient",
          provider: "resend",
          action: "email_sent",
          to,
          subject,
        })
      );
      return { success: true, delivered: true, provider: "resend" };
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "EmailClient",
          provider: "resend",
          error: err.message,
          to,
        })
      );
      throw err;
    }
  }

  // 2. SMTP Transport (nodemailer)
  const transporter = getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        text,
        html,
      });
      console.log(
        JSON.stringify({
          level: "info",
          service: "EmailClient",
          provider: "smtp",
          action: "email_sent",
          messageId: info.messageId,
          to,
          subject,
        })
      );
      return { success: true, delivered: true, provider: "smtp", messageId: info.messageId };
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "EmailClient",
          provider: "smtp",
          error: err.message,
          to,
        })
      );
      throw err;
    }
  }

  // 3. Fallback for Local Dev / Testing without SMTP credentials
  console.warn(
    JSON.stringify({
      level: "warn",
      service: "EmailClient",
      action: "email_provider_not_configured",
      notice:
        "No SMTP credentials or Resend API key configured in .env.local. Logged email payload below for development.",
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

/**
 * Dispatch an account email verification message.
 */
export async function sendVerificationEmail({ to, name = "there", verificationUrl }) {
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
          <a href="${verificationUrl}" style="background-color: #000000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="font-size: 12px; color: #667085;">If the button does not work, copy and paste this URL into your browser:<br/>${verificationUrl}</p>
      </div>
    `,
  });
}

/**
 * Dispatch a password reset email with 6-digit OTP code and optional reset URL.
 */
export async function sendPasswordResetEmail({ to, name = "there", resetUrl = "", otpCode = "" }) {
  const subject = otpCode
    ? `${otpCode} is your RawReply password reset code`
    : "Reset your password — RawReply";

  const codeSection = otpCode
    ? `Your 6-digit verification code is: ${otpCode}\n\nThis code will expire in 15 minutes.\n\n`
    : "";

  const text = `Hello ${name},\n\n${codeSection}You recently requested to reset your RawReply password.${
    resetUrl ? ` You can use the 6-digit code or click the direct link below:\n${resetUrl}\n\n` : ""
  }This verification code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.\n\nRawReply Security Team`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; color: #111827;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">RawReply Security</h2>
        </div>
        <h1 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px;">Reset your password</h1>
        <p style="font-size: 14px; line-height: 20px; color: #4b5563; margin-top: 0;">Hello ${name},</p>
        <p style="font-size: 14px; line-height: 20px; color: #4b5563;">
          We received a request to reset your RawReply account password. Enter the 6-digit verification code below to set a new password:
        </p>
        ${
          otpCode
            ? `
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 10px; font-family: 'SF Mono', Monaco, Inconsolata, 'Fira Code', monospace; color: #000000; display: inline-block;">
            ${otpCode}
          </span>
          <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">Valid for 15 minutes</p>
        </div>`
            : ""
        }
        ${
          resetUrl
            ? `
        <p style="font-size: 14px; color: #4b5563; margin-top: 20px;">
          Alternatively, you can click the button below to reset your password directly:
        </p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 11px; color: #9ca3af; word-break: break-all;">
          Direct link: <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
        </p>`
            : ""
        }
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}
