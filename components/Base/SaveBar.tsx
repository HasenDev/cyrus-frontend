"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/components/Loading";
import { config } from "@/lib/main";

interface SaveBarProps {
  isOpen: boolean;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
  message?: string;
  pendingAccentColor?: string;
}

export default function SaveBar({
  isOpen,
  onReset,
  onSave,
  isSaving,
  message = "You got some unsaved changes!",
  pendingAccentColor,
}: SaveBarProps) {
  const [mounted, setMounted] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const isDark = config.theme === "dark";
  const accentColor = pendingAccentColor || config.accentColor || "#00f2fe";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const barContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={constraintsRef}
          className="fixed inset-0 pointer-events-none z-[100000] flex items-end justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] px-4"
        >
          <motion.div
            drag
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ y: 50, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto w-full max-w-[440px] rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl transition-colors duration-200 ${
              isDark
                ? "border-white/[0.08] bg-[#0F1014]/95 text-zinc-100 shadow-black/60"
                : "border-zinc-200/90 bg-white/95 text-zinc-900 shadow-zinc-900/10"
            }`}
          >
            {/* Draggable Handle Indicator */}
            <div
              className="flex justify-center pb-2.5 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: "none" }}
            >
              <div
                className={`w-10 h-1 rounded-full transition-colors ${
                  isDark ? "bg-white/20" : "bg-zinc-300"
                }`}
              />
            </div>

            <div className="flex flex-col gap-3">
              <span
                className={`w-full text-center text-sm font-medium tracking-tight ${
                  isDark ? "text-zinc-200" : "text-zinc-800"
                }`}
              >
                {message}
              </span>

              <div
                className={`flex items-stretch overflow-hidden rounded-xl border transition-colors ${
                  isDark
                    ? "border-white/[0.08] bg-white/[0.03]"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <button
                  type="button"
                  onClick={onReset}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${
                    isDark
                      ? "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  Reset
                </button>

                <div
                  className={`w-px ${
                    isDark ? "bg-white/[0.08]" : "bg-zinc-200"
                  }`}
                />

                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {isSaving ? (
                    <Loading width={18} height={18} />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(barContent, document.body);
}
