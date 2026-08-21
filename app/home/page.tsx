"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import MDHandler from "@/components/Design/MDHandler";
import { useAppStore } from "@/app/home/layout";
import { config, apiRequest } from "@/lib/main";
import { parseCredits } from "@/lib/misc/creditsParser";
import {
  ServerIcon,
  CurrencyDollarIcon,
  SignalIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";

function getBannerUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }
  const baseUrl = config.apiBaseUrl.endsWith("/")
    ? config.apiBaseUrl.slice(0, -1)
    : config.apiBaseUrl;
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
}

export default function HomePage() {
  const { user: initialUser } = useAppStore();
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const [loadingStats, setLoadingStats] = useState(true);
  const [userData, setUserData] = useState<any>(initialUser || null);

  const fetchLatestStats = async () => {
    setLoadingStats(true);
    const token = Cookies.get("token");
    if (!token) {
      setLoadingStats(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/account/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (e) {
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLatestStats();
  }, []);

  const activeUser = userData || initialUser;

  const stats = [
    {
      name: "Active Deployments",
      value: activeUser?.metrics
        ? `${activeUser.metrics.deployments} / ${activeUser.metrics.maxDeployments}`
        : "0 / 0",
      icon: (
        <ServerIcon className="h-6 w-6 shrink-0" style={{ color: accentColor }} />
      ),
    },
    {
      name: "Credits Available",
      value: `${parseCredits(activeUser?.metrics?.credits ?? activeUser?.credits)} Cr`,
      icon: <CurrencyDollarIcon className="h-6 w-6 shrink-0 text-emerald-500" />,
    },
    {
      name: "Online Servers",
      value: activeUser?.metrics?.onlineServers !== undefined
        ? `${activeUser.metrics.onlineServers}`
        : "0",
      icon: <SignalIcon className="h-6 w-6 shrink-0 text-cyan-500" />,
    },
  ];

  const bannerImageUrl = getBannerUrl(activeUser?.newsletter?.image);

  return (
    <div className="space-y-8 w-full max-w-full min-w-0 overflow-hidden">
      <div>
        <h1
          className={`text-3xl font-black tracking-tight mb-2 truncate ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          Dashboard
        </h1>
        <p className={`text-sm break-words ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Welcome back,{" "}
          <span
            className={`font-bold inline-block max-w-full truncate align-bottom ${
              isDark ? "text-white" : "text-zinc-900"
            }`}
          >
            {activeUser?.username || "Guest"}
          </span>
          . Here is a summary of your network usage.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3 w-full min-w-0">
        {loadingStats
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className={`rounded-xl border p-6 shadow-sm animate-pulse min-w-0 ${
                  isDark
                    ? "border-white/[0.06] bg-[#0F1014]"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div
                    className={`h-3 w-24 rounded ${
                      isDark ? "bg-zinc-800" : "bg-zinc-200"
                    }`}
                  />
                  <div
                    className={`h-6 w-6 rounded-full shrink-0 ${
                      isDark ? "bg-zinc-800" : "bg-zinc-200"
                    }`}
                  />
                </div>
                <div
                  className={`h-8 w-28 rounded ${
                    isDark ? "bg-zinc-800" : "bg-zinc-200"
                  }`}
                />
              </div>
            ))
          : stats.map((stat) => (
              <div
                key={stat.name}
                className={`rounded-xl border p-6 shadow-sm transition-colors min-w-0 overflow-hidden ${
                  isDark
                    ? "border-white/[0.06] bg-[#0F1014]"
                    : "border-zinc-200 bg-white shadow-slate-200/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider truncate min-w-0 ${
                      isDark ? "text-zinc-500" : "text-zinc-400"
                    }`}
                  >
                    {stat.name}
                  </span>
                  {stat.icon}
                </div>
                <p
                  className={`text-2xl font-black tracking-tight truncate min-w-0 ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
                  title={stat.value}
                >
                  {stat.value}
                </p>
              </div>
            ))}
      </div>
      <div
        className={`rounded-xl border overflow-hidden shadow-sm transition-colors w-full min-w-0 ${
          isDark
            ? "border-white/[0.06] bg-[#0F1014]"
            : "border-zinc-200 bg-white shadow-slate-200/50"
        }`}
      >
        {loadingStats ? (
          <div className="w-full min-w-0 overflow-hidden animate-pulse">
            <div
              className={`h-48 sm:h-64 w-full rounded-b-2xl ${
                isDark ? "bg-zinc-800/80" : "bg-zinc-200"
              }`}
            />
            <div className="p-6 sm:p-8 space-y-4">
              <div
                className={`h-3 w-36 rounded ${
                  isDark ? "bg-zinc-800" : "bg-zinc-200"
                }`}
              />
              <div
                className={`h-7 w-3/4 sm:w-1/2 rounded ${
                  isDark ? "bg-zinc-800" : "bg-zinc-200"
                }`}
              />
              <div
                className={`h-1.5 w-20 rounded-full ${
                  isDark ? "bg-zinc-800" : "bg-zinc-200"
                }`}
              />
              <div className="space-y-2 pt-2">
                <div
                  className={`h-4 w-full rounded ${
                    isDark ? "bg-zinc-800" : "bg-zinc-200"
                  }`}
                />
                <div
                  className={`h-4 w-5/6 rounded ${
                    isDark ? "bg-zinc-800" : "bg-zinc-200"
                  }`}
                />
                <div
                  className={`h-4 w-2/3 rounded ${
                    isDark ? "bg-zinc-800" : "bg-zinc-200"
                  }`}
                />
              </div>
            </div>
          </div>
        ) : activeUser?.newsletter ? (
          <div className="w-full min-w-0 overflow-hidden">
            {bannerImageUrl && (
              <div
                className={`relative h-48 sm:h-64 w-full overflow-hidden rounded-b-2xl border-b ${
                  isDark
                    ? "bg-zinc-900 border-white/[0.06]"
                    : "bg-zinc-100 border-zinc-200"
                }`}
              >
                <img
                  src={bannerImageUrl}
                  alt="Announcement Banner"
                  className="object-cover h-full w-full rounded-b-2xl"
                />
              </div>
            )}
            <div className="p-6 sm:p-8 space-y-4 min-w-0 overflow-hidden">
              <span
                className="text-[10px] font-bold uppercase tracking-widest block truncate"
                style={{ color: accentColor }}
              >
                Latest System Announcement
              </span>
              <h2
                className={`text-xl sm:text-2xl font-black break-words ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                {activeUser.newsletter.title}
              </h2>
              <div
                className="h-1.5 w-20 rounded-full my-4 shrink-0"
                style={{ backgroundColor: accentColor }}
              />
              <div className="w-full min-w-0 overflow-x-auto break-words">
                <MDHandler content={activeUser.newsletter.description} />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`p-8 text-center ${
              isDark ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            <MegaphoneIcon
              className={`mx-auto h-12 w-12 mb-3 ${
                isDark ? "text-zinc-600" : "text-zinc-300"
              }`}
            />
            <p className="text-sm font-semibold">No announcements were made.</p>
          </div>
        )}
      </div>
    </div>
  );
}