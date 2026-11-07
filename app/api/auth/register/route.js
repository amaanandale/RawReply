import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth-service";
import { setAuthCookies } from "@/lib/auth/cookies";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limiter";

export async function POST(req) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`register:${clientIp}`, 10, 60 * 1000); // 10 attempts per minute
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many registration attempts. Please wait ${rateLimit.resetInSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || "";
    const result = await authService.register({
      ...validated.data,
      userAgent,
      ipAddress: clientIp,
    });

    const response = NextResponse.json({
      success: true,
      user: result.user,
      organizationId: result.organizationId,
      role: result.role,
    });

    setAuthCookies(response, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

