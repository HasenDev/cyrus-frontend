"use client";

import React, { useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import {
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";

interface LegalAcceptanceModalProps {
  isOpen: boolean;
  onAccepted: () => void;
}

export default function LegalAcceptanceModal({ isOpen, onAccepted }: LegalAcceptanceModalProps) {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAgreeAndContinue = async () => {
    if (!agreed) return;

    setSubmitting(true);
    setError(null);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/account/legal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accept: true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to confirm agreement. Please try again.");
        setSubmitting(false);
        return;
      }

      onAccepted();
    } catch {
      setError("A network error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 min-[350px]:p-4 bg-black/85 overflow-y-auto">
      <div
        className={`w-full max-w-lg min-h-[100dvh] min-[350px]:min-h-0 min-[350px]:max-h-[90vh] overflow-y-auto rounded-none min-[350px]:rounded-3xl border-0 min-[350px]:border p-5 min-[350px]:p-6 sm:p-8 space-y-6 shadow-2xl transition-all flex flex-col justify-between min-[350px]:justify-start ${
          isDark ? "bg-[#0B0C10] border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3.5">
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Updated Legal Agreements
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Our legal terms have changed since your last visit.
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
            isDark ? "bg-white/[0.02] border-white/5 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"
          }`}>
            <p>
              We have recently updated our <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>. To continue using your account and services without interruption, please review and agree to the revised terms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/terms"
              target="_blank"
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all group ${
                isDark
                  ? "bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-900"
                  : "bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold">Terms of Service</span>
              </div>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </Link>

            <Link
              href="/privacy"
              target="_blank"
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all group ${
                isDark
                  ? "bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-900"
                  : "bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold">Privacy Policy</span>
              </div>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </Link>
          </div>

          {error && (
            <div className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-medium">
              <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.value === "on" ? e.target.checked : !agreed)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-700 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span className={`text-xs font-medium leading-tight ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              I acknowledge that I have read, understood, and agree to be bound by the updated{" "}
              <Link href="/terms" target="_blank" className="font-bold underline text-cyan-400 hover:opacity-80">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="font-bold underline text-cyan-400 hover:opacity-80">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        <div className="pt-4 min-[350px]:pt-0">
          <button
            type="button"
            disabled={!agreed || submitting}
            onClick={handleAgreeAndContinue}
            style={{ backgroundColor: accentColor, color: "#000" }}
            className="w-full py-3.5 rounded-2xl font-bold text-xs shadow-lg transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center"
          >
            {submitting ? <Loading width={16} height={16} color="#000000" /> : "I Agree & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}