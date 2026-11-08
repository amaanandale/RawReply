import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth-service";

export async function POST(req) {
  try {
    const body = await req.json();
    const validated = resetPasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    await authService.resetPassword({
      token: validated.data.token,
      email: validated.data.email,
      otp: validated.data.otp,
      newPassword: validated.data.password,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You may now log in with your new password.",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

