"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/app/home/layout";
import { config, setTheme } from "@/lib/main";
import Cookies from "js-cookie";
import { parseCredits } from "@/lib/misc/creditsParser";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const { user } = useAppStore();
  const [currentTheme, setCurrentTheme] = useState<"white" | "dark">(config.theme);

  const isDark = currentTheme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  useEffect(() => {
    const saved = Cookies.get("theme") as "white" | "dark";
    if (saved && (saved === "dark" || saved === "white")) {
      setCurrentTheme(saved);
      config.theme = saved;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? "white" : "dark";
    setTheme(nextTheme);
    window.location.reload();
  };

  const dicebearUrl = user?.id
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=default`;

  const computeAvatarSrc = () => {
    if (!user?.avatarUrl) return dicebearUrl;
    if (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://")) {
      return user.avatarUrl;
    }
    const baseUrl = config.apiBaseUrl.endsWith("/")
      ? config.apiBaseUrl.slice(0, -1)
      : config.apiBaseUrl;
    const cleanPath = user.avatarUrl.startsWith("/")
      ? user.avatarUrl
      : `/${user.avatarUrl}`;
    return `${baseUrl}${cleanPath}`;
  };

  const [avatarSrc, setAvatarSrc] = useState<string>(computeAvatarSrc());

  useEffect(() => {
    setAvatarSrc(computeAvatarSrc());
  }, [user?.avatarUrl, user?.id]);

  const formattedCredits = parseCredits(user?.metrics?.credits);

  const CreditsBadge = () => (
    <Link
      href="/home/credits"
      className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-200 hover:scale-[1.02] ${
        isDark
          ? "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15"
          : "border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 hover:border-zinc-300"
      }`}
    >
      <svg
        className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
        style={{ color: accentColor }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="flex items-baseline gap-1">
        <span className={`text-xs font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
          {formattedCredits}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: accentColor }}>
          Cr
        </span>
      </div>
    </Link>
  );

  return (
    <header className="sticky top-0 z-[49] w-full px-3 sm:px-6 pt-3 pb-2 transition-all duration-300">
      <div
        className={`relative mx-auto w-full rounded-2xl border px-4 sm:px-6 shadow-xl transition-all duration-200 ${
          isDark
            ? "border-white/[0.08] bg-[#0F1014] text-zinc-100 shadow-black/40"
            : "border-zinc-200/90 bg-white text-zinc-900 shadow-zinc-900/5"
        }`}
      >
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`rounded-xl p-2 md:hidden transition-colors ${
                isDark
                  ? "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
              aria-label="Open Sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden md:flex">
              <CreditsBadge />
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden min-[300px]:flex md:hidden">
              <CreditsBadge />
            </div>

            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all duration-200 hover:scale-105 ${
                isDark
                  ? "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/15"
                  : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300"
              }`}
            >
              {isDark ? (
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {user && (
              <Link
                href="/home/account"
                className="flex items-center flex-shrink-0 transition-transform duration-200 hover:scale-105 focus:outline-none"
              >
                <img
                  src={avatarSrc}
                  onError={() => setAvatarSrc(dicebearUrl)}
                  alt="User Avatar"
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover ring-1 ${
                    isDark ? "ring-white/10" : "ring-zinc-200"
                  }`}
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
