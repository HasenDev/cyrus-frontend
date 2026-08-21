"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { config } from "@/lib/main";
import { useMainInfoStore } from "@/components/Layout/ClientProviders";

function NotFoundContent() {
  const router = useRouter();
  const { mainInfoStore } = useMainInfoStore();
  const accentColor = mainInfoStore?.accentColor || config.accentColor;
  const isDark = config.theme === "dark";

  return (
    <div
      className={`relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? "bg-[#050608] text-zinc-50" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div
          className={`absolute inset-0 ${isDark ? "opacity-[0.07]" : "opacity-[0.04]"}`}
          style={{
            backgroundImage: `
              linear-gradient(to right, ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} 1px, transparent 1px),
              linear-gradient(to bottom, ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
          }}
        />

        <div
          className={`absolute inset-0 ${isDark ? "opacity-30" : "opacity-15"}`}
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.05)"} 1px, transparent 0)`,
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
        className={`relative z-20 flex w-full flex-col justify-center px-6 py-10 min-h-[100dvh] sm:min-h-fit sm:max-w-[420px] border-t-[3px] sm:border sm:border-t-[3px] sm:rounded-2xl shadow-xl text-center transition-all ${
          isDark
            ? "bg-[#0F1014] sm:border-white/[0.06] shadow-black/50"
            : "bg-white sm:border-zinc-200/80 shadow-slate-200/50"
        }`}
      >
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${
            isDark ? "bg-white/5 text-zinc-400" : "bg-zinc-100 text-zinc-500"
          }`}
        >
          <ExclamationTriangleIcon className="h-8 w-8" style={{ color: accentColor }} />
        </div>

        <h1
          className="mb-2 text-2xl font-black tracking-tight font-sans"
          style={{ color: accentColor }}
        >
          Page Not Found
        </h1>
        <p className={`mb-8 text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>

        <button
          onClick={() => router.push("/")}
          style={{ backgroundColor: accentColor }}
          className="flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold text-slate-950 shadow-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  );
}

export default function NotFoundPage() {
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
      <NotFoundContent />
    </Suspense>
  );
}