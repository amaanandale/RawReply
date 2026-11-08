import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth-service";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limiter";

export async function POST(req) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`forgot-password:${clientIp}`, 5, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many password reset requests. Please wait ${rateLimit.resetInSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const validated = forgotPasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;

    const result = await authService.requestPasswordReset(validated.data.email, appUrl);

    // If SMTP is not yet configured in local development, return devOtp preview so testing is seamless
    const isDev =
      process.env.NODE_ENV !== "production" ||
      (!process.env.SMTP_HOST && !process.env.RESEND_API_KEY);

    return NextResponse.json({
      success: true,
      message: "If an account matches that email address, a 6-digit verification code has been dispatched.",
      devOtp: isDev ? result.otpCode : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

