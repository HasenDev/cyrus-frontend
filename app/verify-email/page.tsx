"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { config, apiRequest } from "@/lib/main";
import { useMainInfoStore } from "@/components/Layout/ClientProviders";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const { mainInfoStore } = useMainInfoStore();

  const isDark = config.theme === "dark";
  const accentColor = mainInfoStore?.accentColor || config.accentColor || "#00f2fe";

  const [verifying, setVerifying] = useState<boolean>(!!code);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!code) {
      setVerifying(false);
      setSuccess(false);
      setMessage("Invalid verification link. No verification code was provided.");
      return;
    }

    const verifyCode = async () => {
      setVerifying(true);
      try {
        const res = await apiRequest("api/v1/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setSuccess(true);
          setMessage(data.message || "Your email address has been successfully verified.");
        } else {
          setSuccess(false);
          setMessage(data.error || "The verification link is invalid or has expired.");
        }
      } catch (err) {
        setSuccess(false);
        setMessage("Unable to connect to the server. Please try again later.");
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [code]);

  const token = typeof window !== "undefined" ? Cookies.get("token") : null;

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-4 font-sans transition-colors ${
        isDark ? "bg-[#050608] text-white" : "bg-slate-50 text-zinc-900"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`w-full max-w-md rounded-2xl border p-8 shadow-2xl backdrop-blur-xl transition-all ${
          isDark
            ? "border-white/[0.08] bg-[#0F1014]/90"
            : "border-zinc-200 bg-white/90 shadow-slate-200/50"
        }`}
      >
        <div className="text-center space-y-6">
          <div
            className="h-1.5 w-16 mx-auto rounded-full"
            style={{ backgroundColor: accentColor }}
          />

          {verifying ? (
            <div className="py-8 space-y-4">
              <div className="relative h-12 w-12 mx-auto">
                <div
                  className={`absolute inset-0 rounded-full border-2 ${
                    isDark ? "border-white/10" : "border-zinc-200"
                  }`}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-r-transparent border-b-transparent border-l-transparent"
                  style={{ borderTopColor: accentColor }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
                />
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                Verifying Email Address
              </h1>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Please wait while we confirm your verification code...
              </p>
            </div>
          ) : success ? (
            <div className="py-4 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                Email Verified!
              </h1>
              <p className={`text-sm leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                {message}
              </p>
              <button
                type="button"
                onClick={() => router.push(token ? "/home" : "/")}
                style={{ backgroundColor: accentColor }}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-slate-950 shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {token ? "Continue to Dashboard" : "Proceed to Sign In"}
              </button>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                Verification Failed
              </h1>
              <p className={`text-sm leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                {message}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(token ? "/home/account" : "/")}
                  style={{ backgroundColor: accentColor }}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-slate-950 shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  {token ? "Go to Account Settings" : "Return to Sign In"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}