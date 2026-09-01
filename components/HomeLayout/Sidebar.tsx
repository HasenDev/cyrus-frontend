"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/app/home/layout";
import { config } from "@/lib/main";
import {
  MegaphoneIcon,
  ScaleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { FaDiscord, FaGlobe } from "react-icons/fa";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function SidebarContent({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAppStore();
  const accentColor = config.accentColor || "#00f2fe";
  const isDark = config.theme === "dark";

  const panelName =
    user?.panel?.name && user.panel.name.trim()
      ? user.panel.name.trim()
      : "Control Panel";
  const panelIcon = user?.panel?.icon || "/icon.png";

  const websiteUrl = user?.panel?.websiteUrl?.trim() || "";
  const discordUrl = user?.panel?.discordUrl?.trim() || "";
  const hasLinks = Boolean(websiteUrl || discordUrl);

  const [panelIconSrc, setPanelIconSrc] = useState<string>(panelIcon);

  useEffect(() => {
    if (user?.panel?.icon) {
      setPanelIconSrc(user.panel.icon);
    }
  }, [user?.panel?.icon]);

  const hasPermission = (perm?: string | string[]) => {
    if (!perm) return true;
    if (user?.admin || user?.developer) return true;
    if (Array.isArray(perm)) {
      return perm.some((p) => user?.permissions?.includes(p));
    }
    return user?.permissions?.includes(perm);
  };

  const isMenuItemActive = (href: string) => {
    if (href === "/home" || href === "/home/admin/overview") {
      return pathname === href;
    }
    if (href === "/home/services") {
      return (
        pathname === "/home/services" ||
        pathname.startsWith("/home/services/") ||
        pathname === "/home/server" ||
        pathname.startsWith("/home/server/")
      );
    }
    if (href === "/home/admin/payment") {
      return (
        pathname.startsWith("/home/admin/payment") ||
        pathname.startsWith("/home/admin/payments")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const menuItems = [
    {
      name: "Home",
      href: "/home",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Services",
      href: "/home/services",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      name: "Shop Packages",
      href: "/home/packages",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: "Credits",
      href: "/home/credits",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Account",
      href: "/home/account",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const adminMenuItems = [
    {
      name: "Overview",
      href: "/home/admin/overview",
      perm: "ADMIN_OVERVIEW",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: "Settings",
      href: "/home/admin/settings",
      perm: "ADMIN_SETTINGS",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: "Legal",
      href: "/home/admin/legal",
      perm: "ADMIN_SETTINGS",
      icon: <ScaleIcon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />,
    },
    {
      name: "Payment",
      href: "/home/admin/payment",
      perm: "ADMIN_PAYMENT",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Vouchers",
      href: "/home/admin/vouchers",
      perm: "ADMIN_VOUCHERS",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12h5.25c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125H7.5a2.25 2.25 0 01-2.25-2.25V7.5A2.25 2.25 0 017.5 5.25zm9 0h1.5A2.25 2.25 0 0120.25 7.5v9a2.25 2.25 0 01-2.25 2.25H16.5" />
        </svg>
      ),
    },
    {
      name: "Packages",
      href: "/home/admin/packages",
      perm: "ADMIN_PACKAGES",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: "Announcements",
      href: "/home/admin/announcements",
      perm: "ADMIN_ANNOUNCEMENTS",
      icon: <MegaphoneIcon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />,
    },
    {
      name: "Locations",
      href: "/home/admin/locations",
      perm: "ADMIN_LOCATIONS",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: "Servers",
      href: "/home/admin/servers",
      perm: "ADMIN_SERVERS",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Nodes",
      href: "/home/admin/nodes",
      perm: "ADMIN_NODES",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
    },
    {
      name: "Users",
      href: "/home/admin/users",
      perm: "ADMIN_USERS",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: "Nests",
      href: "/home/admin/nests",
      perm: "ADMIN_NESTS",
      icon: (
        <svg className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
  ].filter((item) => hasPermission(item.perm));

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed bottom-0 top-0 left-0 z-50 flex w-64 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden border-r transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isDark
            ? "border-white/[0.06] bg-[#0F1014] text-zinc-100"
            : "border-zinc-200/80 bg-white text-zinc-900"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 shrink-0 w-full items-center justify-between px-5 gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <img
              src={panelIconSrc}
              onError={() => setPanelIconSrc("/icon.png")}
              alt="Logo"
              className={`h-8 w-8 rounded-full object-cover shrink-0 ring-1 ${
                isDark ? "ring-white/10" : "ring-zinc-200"
              }`}
            />
            <span
              className={`text-sm sm:text-base font-bold tracking-tight truncate min-w-0 flex-1 ${
                isDark ? "text-zinc-100" : "text-zinc-800"
              }`}
              title={panelName}
            >
              {panelName}
            </span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className={`md:hidden p-2 rounded-lg transition-colors shrink-0 ${
              isDark
                ? "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden">
          <nav className="space-y-1.5 px-3 py-4">
            <p className={`px-3.5 mb-2 text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              General
            </p>
            {menuItems.map((item) => {
              const isActive = isMenuItemActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 min-w-0 overflow-hidden ${
                    isActive
                      ? isDark
                        ? "text-white bg-white/[0.08] shadow-sm"
                        : "text-zinc-950 bg-zinc-100 shadow-sm"
                      : isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] hover:translate-x-1"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 hover:translate-x-1"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r-full transition-all duration-200 ${
                      isActive
                        ? "opacity-100 scale-y-100"
                        : "opacity-0 scale-y-50 group-hover:opacity-40 group-hover:scale-y-75"
                    }`}
                    style={{ backgroundColor: accentColor }}
                  />

                  <div
                    className="transition-colors duration-200"
                    style={{ color: isActive ? accentColor : "inherit" }}
                  >
                    {item.icon}
                  </div>
                  <span className="truncate min-w-0">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {adminMenuItems.length > 0 && (
            <nav className={`space-y-1.5 px-3 py-4 border-t ${isDark ? "border-white/[0.04]" : "border-zinc-200/60"}`}>
              <p className={`px-3.5 mb-2 text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Administration
              </p>
              {adminMenuItems.map((item) => {
                const isActive = isMenuItemActive(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 min-w-0 overflow-hidden ${
                      isActive
                        ? isDark
                          ? "text-white bg-white/[0.08] shadow-sm"
                          : "text-zinc-950 bg-zinc-100 shadow-sm"
                        : isDark
                        ? "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] hover:translate-x-1"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 hover:translate-x-1"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r-full transition-all duration-200 ${
                        isActive
                          ? "opacity-100 scale-y-100"
                          : "opacity-0 scale-y-50 group-hover:opacity-40 group-hover:scale-y-75"
                      }`}
                      style={{ backgroundColor: accentColor }}
                    />

                    <div
                      className="transition-colors duration-200"
                      style={{ color: isActive ? accentColor : "inherit" }}
                    >
                      {item.icon}
                    </div>
                    <span className="truncate min-w-0">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {hasLinks && (
            <nav className={`space-y-1.5 px-3 py-4 border-t ${isDark ? "border-white/[0.04]" : "border-zinc-200/60"}`}>
              <p className={`px-3.5 mb-2 text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Links
              </p>
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center justify-between gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 min-w-0 overflow-hidden ${
                    isDark
                      ? "text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:translate-x-1"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 hover:translate-x-1"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <FaGlobe className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    <span className="truncate min-w-0">Website</span>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {discordUrl && (
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center justify-between gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 min-w-0 overflow-hidden ${
                    isDark
                      ? "text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:translate-x-1"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 hover:translate-x-1"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <FaDiscord className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    <span className="truncate min-w-0">Discord Server</span>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </nav>
          )}
        </div>
      </aside>

      <style jsx global>{`
        html,
        body {
          color-scheme: ${isDark ? "dark" : "light"} !important;
        }

        @media (min-width: 768px) {
          html,
          body,
          .sidebar-scroll,
          body * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          html::-webkit-scrollbar,
          body::-webkit-scrollbar,
          .sidebar-scroll::-webkit-scrollbar,
          body *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
        }

        @media (max-width: 767px) {
          html,
          body {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          html::-webkit-scrollbar,
          body::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }

          .sidebar-scroll {
            scrollbar-width: thin;
            scrollbar-color: ${
              isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"
            } transparent;
          }

          .sidebar-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
            background: transparent !important;
          }

          .sidebar-scroll::-webkit-scrollbar-track,
          .sidebar-scroll::-webkit-scrollbar-track-piece,
          .sidebar-scroll::-webkit-scrollbar-corner {
            background: transparent !important;
          }

          .sidebar-scroll::-webkit-scrollbar-thumb {
            background-color: ${
              isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"
            } !important;
            border: 0 !important;
            border-radius: 9999px;
          }

          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background-color: ${accentColor} !important;
          }
        }
      `}</style>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
