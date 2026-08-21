"use client";

import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { config, apiRequest } from "@/lib/main";

interface OverviewData {
  apiVersion: string;
  usersCount: number;
  serversCount: number;
}

export default function AdminOverviewPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverview() {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized: Authentication token is missing.");
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest("api/v1/admin/overview", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          setError("Unauthorized: Please log in again to access admin metrics.");
          setLoading(false);
          return;
        }

        if (res.status === 403) {
          setError("Access Denied: You do not have the ADMIN_OVERVIEW permission.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError("Failed to load admin overview metrics from server.");
          setLoading(false);
          return;
        }

        const json: OverviewData = await res.json();
        setData(json);
      } catch (err) {
        setError("Network error occurred while fetching metrics.");
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, []);

  const stats = [
    {
      name: "API Version",
      value: data?.apiVersion ? `v${data.apiVersion}` : "v1.0.0",
      icon: (
        <svg
          className="h-6 w-6"
          style={{ color: accentColor }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
    {
      name: "Total Users",
      value: data ? data.usersCount.toLocaleString() : "0",
      icon: (
        <svg
          className="h-6 w-6 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      name: "Active Servers",
      value: data ? data.serversCount.toLocaleString() : "0",
      icon: (
        <svg
          className="h-6 w-6 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1
          className={`text-3xl font-black tracking-tight mb-1 ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          Admin Overview
        </h1>
        <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          System-wide administrative telemetry and infrastructure metrics.
        </p>
      </div>
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`rounded-xl border p-6 shadow-sm transition-colors ${
              isDark
                ? "border-white/[0.06] bg-[#0F1014]"
                : "border-zinc-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                {stat.name}
              </span>
              {stat.icon}
            </div>
            <p
              className={`text-3xl font-black tracking-tight ${
                loading
                  ? "animate-pulse text-zinc-600"
                  : isDark
                  ? "text-white"
                  : "text-zinc-900"
              }`}
            >
              {loading ? "..." : stat.value}
            </p>
          </div>
        ))}
      </div>
      <div
        className={`rounded-xl border p-6 sm:p-8 shadow-sm space-y-6 transition-colors ${
          isDark
            ? "border-white/[0.06] bg-[#0F1014]"
            : "border-zinc-200 bg-white"
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">
              System Up To Date
            </span>
          </div>

          <h2
            className={`text-xl font-bold tracking-tight ${
              isDark ? "text-white" : "text-zinc-900"
            }`}
          >
            You are currently using{" "}
            <span style={{ color: accentColor }}>
              Cyrus Panel v{config.panelVersion}
            </span>{" "}
            and you are on the latest version!
          </h2>
          <p
            className={`text-xs ${
              isDark ? "text-zinc-400" : "text-zinc-500"
            }`}
          >
            Manage issues, request features, or check API documentation using the resources below.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://discord.gg/3yuMkSnrFd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] transition-all shadow-md"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Official Support Server
          </a>
          <a
            href="https://cyrus.admibot.xyz/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all border ${
              isDark
                ? "bg-zinc-800 text-white border-white/10 hover:bg-zinc-700"
                : "bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-zinc-200"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Documentation
          </a>
          <a
            href="https://cyrus.admibot.xyz/bugs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Found A Bug?
          </a>
        </div>
      </div>
    </div>
  );
}