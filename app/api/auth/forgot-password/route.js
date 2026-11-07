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
      `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`;

    await authService.requestPasswordReset(validated.data.email, appUrl);

    return NextResponse.json({
      success: true,
      message: "If an account matches that email address, a password reset link has been dispatched.",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

