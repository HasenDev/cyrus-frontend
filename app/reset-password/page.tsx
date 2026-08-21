"use client";

import React, { useEffect, useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import { useMainInfoStore } from "@/components/Layout/ClientProviders";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams?.get("code");
  const { mainInfoStore } = useMainInfoStore();
  const accentColor = mainInfoStore?.accentColor || config.accentColor || "#00f2fe";
  const isDark = config.theme === "dark";
  const [checkingCode, setCheckingCode] = useState(true);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeError, setCodeError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  useEffect(() => {
    if (!code) {
      setCheckingCode(false);
      setCodeValid(false);
      setCodeError("No password reset code provided in URL.");
      return;
    }

    const validateCode = async () => {
      setCheckingCode(true);
      try {
        const res = await apiRequest(
          `api/v1/auth/reset-password?code=${encodeURIComponent(code)}`,
          {
            method: "GET",
          }
        );

        const data = await res.json();

        if (res.ok && data.valid) {
          setCodeValid(true);
        } else {
          setCodeValid(false);
          setCodeError(
            data.error || "The password reset link is invalid or has expired."
          );
        }
      } catch (err) {
        setCodeValid(false);
        setCodeError("Unable to connect to server. Please try again.");
      } finally {
        setCheckingCode(false);
      }
    };

    validateCode();
  }, [code]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    if (!newPassword || newPassword.length < 6) {
      setSubmitError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError("New passwords do not match.");
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await apiRequest("api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.error || "Failed to reset password.");
      }
    } catch (err) {
      setSubmitError("Unable to connect to server. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div
      className={`relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? "bg-[#050608] text-zinc-50" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div
          className={`absolute inset-0 ${
            isDark ? "opacity-[0.07]" : "opacity-[0.04]"
          }`}
          style={{
            backgroundImage: `
              linear-gradient(to right, ${
                isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
              } 1px, transparent 1px),
              linear-gradient(to bottom, ${
                isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
              } 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
          }}
        />

        <div
          className={`absolute inset-0 ${isDark ? "opacity-30" : "opacity-15"}`}
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${
              isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.05)"
            } 1px, transparent 0)`,
            backgroundSize: "14px 14px",
          }}
        />

        <div
          className="absolute top-[10%] right-[5%] w-[650px] h-[650px] rounded-full filter blur-[150px] opacity-[0.08]"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          }}
        />

        <div
          className="absolute bottom-[10%] left-[5%] w-[600px] h-[600px] rounded-full filter blur-[130px] opacity-[0.05]"
          style={{
            background: `radial-gradient(circle, #4facfe 0%, transparent 70%)`,
          }}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        style={{ borderTopColor: accentColor }}
        className={`relative z-20 flex w-full flex-col justify-center px-6 py-10 min-h-[100dvh] sm:min-h-fit sm:max-w-[420px] border-t-[3px] sm:border sm:border-t-[3px] sm:rounded-2xl shadow-xl transition-all ${
          isDark
            ? "bg-[#0F1014] sm:border-white/[0.06] shadow-black/50"
            : "bg-white sm:border-zinc-200/80 shadow-slate-200/50"
        }`}
      >
        {checkingCode ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <Loading width={28} height={28} color="#000000" />
            </div>
            <h1 className="text-base font-bold">Validating Reset Link...</h1>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Please wait while we verify your password reset token.
            </p>
          </div>
        ) : submitSuccess ? (
          <div className="text-center py-2 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <CheckCircleIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Password Reset Complete
              </h1>
              <p
                className={`text-xs leading-relaxed mt-2 ${
                  isDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                Your password has been successfully updated. You can now sign in using your new credentials.
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              style={{ backgroundColor: accentColor }}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold text-slate-950 shadow-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              <span>Proceed to Sign In</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        ) : !codeValid ? (
          <div className="text-center py-2 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
              <ExclamationCircleIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Invalid Reset Link
              </h1>
              <p
                className={`text-xs leading-relaxed mt-2 ${
                  isDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                {codeError}
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              style={{ backgroundColor: accentColor }}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold text-slate-950 shadow-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-8 text-center sm:text-left">
              <h1
                className="mb-2 text-2xl font-black tracking-tight font-sans flex items-center gap-2 justify-center sm:justify-start"
                style={{ color: accentColor }}
              >
                <span>Set new password</span>
              </h1>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Enter a secure new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className={`mb-1.5 block text-xs font-semibold tracking-wide ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setSubmitError("");
                  }}
                  placeholder="••••••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 ${
                    submitError
                      ? "border-red-500 focus:ring-1 focus:ring-red-500/10"
                      : isDark
                      ? "border-white/5 bg-[#07080a] text-white placeholder:text-zinc-650 focus:border-cyan-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white"
                  }`}
                  required
                />
              </div>

              <div>
                <label
                  className={`mb-1.5 block text-xs font-semibold tracking-wide ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setSubmitError("");
                  }}
                  placeholder="••••••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 ${
                    submitError
                      ? "border-red-500 focus:ring-1 focus:ring-red-500/10"
                      : isDark
                      ? "border-white/5 bg-[#07080a] text-white placeholder:text-zinc-650 focus:border-cyan-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white"
                  }`}
                  required
                />
              </div>

              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-500 pt-1"
                >
                  <ExclamationCircleIcon className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{submitError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={submitLoading || !newPassword || !confirmPassword}
                style={{ backgroundColor: accentColor }}
                className="mt-2 flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold text-slate-950 shadow-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {submitLoading ? (
                  <div className="flex items-center gap-2">
                    <Loading width={14} height={14} color="#000000" />
                    <span>Updating password...</span>
                  </div>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.push("/")}
              className={`mt-5 w-full text-xs font-semibold transition-colors ${
                isDark
                  ? "text-zinc-500 hover:text-zinc-300"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Cancel and Return to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className={`flex min-h-[100dvh] w-full ${
            config.theme === "dark" ? "bg-[#050608]" : "bg-slate-50"
          }`}
        />
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}