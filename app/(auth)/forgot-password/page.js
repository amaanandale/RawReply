"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step 1: email, Step 2: otp + new password, Step 3: success
  const [step, setStep] = React.useState(1);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [devOtp, setDevOtp] = React.useState(null);
  const [cooldown, setCooldown] = React.useState(0);

  // Cooldown countdown timer for resend
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Handle Step 1: Request OTP code
  const handleRequestOtp = async (e) => {
    e?.preventDefault?.();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch verification code.");
      }

      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setError("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification code.");
      }

      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  // Handle Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setStep(3);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border bg-card shadow-sm w-full">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary-accent/10 text-primary-accent mb-2">
          {step === 1 ? <KeyRound className="size-5" /> : <ShieldCheck className="size-5" />}
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          {step === 1 && "Reset Your Password"}
          {step === 2 && "Enter Verification Code"}
          {step === 3 && "Password Updated"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {step === 1 && "Enter your registered email address to receive a 6-digit OTP code."}
          {step === 2 && (
            <span>
              We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
            </span>
          )}
          {step === 3 && "Your password has been reset successfully. Redirecting..."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Step 1: Request OTP Code */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-primary-accent hover:bg-primary-accent-hover text-white text-xs font-medium h-10 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending Verification Code...
                </>
              ) : (
                <>
                  Send 6-Digit Code
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* Step 2: Enter OTP & Set New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Development OTP preview helper */}
            {devOtp && (
              <div className="rounded-md border border-blue-200 bg-blue-50/80 p-2.5 text-xs text-blue-900 flex items-center justify-between">
                <span>
                  Development Preview Code: <strong className="font-mono text-sm tracking-widest">{devOtp}</strong>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setOtp(devOtp)}
                  className="text-blue-700 hover:text-blue-900 text-[11px] h-6 px-2"
                >
                  Auto-fill
                </Button>
              </div>
            )}

            {/* 6-Digit OTP Code Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground" htmlFor="otp">
                  6-Digit Verification Code (OTP)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  className="text-[11px] text-muted-foreground hover:text-primary-accent underline"
                >
                  Change email
                </button>
              </div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="123456"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(val);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg font-mono font-bold tracking-[0.5em] text-foreground placeholder:text-muted-foreground/40 placeholder:tracking-normal focus:outline-none focus:ring-1 focus:ring-primary-accent"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="password">
                New Password (8+ chars, 1 uppercase, 1 number)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-9 pr-10 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-9 pr-10 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length !== 6 || !password}
              className="w-full bg-primary-accent hover:bg-primary-accent-hover text-white text-xs font-medium h-10 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>

            {/* Resend Code Action */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || resending}
                className="text-muted-foreground hover:text-foreground inline-flex items-center disabled:opacity-50"
              >
                <RotateCcw className={`size-3 mr-1 ${resending ? "animate-spin" : ""}`} />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>

              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* Step 3: Success State */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">
                  Password Reset Successfully!
                </p>
                <p className="mt-0.5 text-emerald-700">
                  Your new password is now active. All previous sessions have been securely signed out.
                </p>
              </div>
            </div>
            <Button asChild className="w-full text-xs bg-primary-accent hover:bg-primary-accent-hover text-white">
              <Link href="/login">Go to Sign In Now</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
