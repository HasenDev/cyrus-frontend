"use client";

import React, { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { config, apiRequest } from "@/lib/main";
import { ServerDetails } from "@/app/home/server/page";
import Loading from "@/components/Base/Loading";
import {
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface ActivityProps {
  serverId: string;
  serverData: ServerDetails;
  accentColor?: string;
  userPermissions?: string[];
  isOwner?: boolean;
}

interface ActivityItem {
  id: string;
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  action: string;
  detail: string;
  ip: string;
  metadata?: Record<string, any>;
  createdAt: string;
  timestamp: number;
}

function timeAgo(dateString: string | number): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export default function Activity({
  serverId,
  serverData,
  accentColor = "#00f2fe"
}: ActivityProps) {
  const isDark = config.theme === "dark";
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 12;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const getFullAvatarUrl = (avatarPath: string | null, id: string) => {
    if (!avatarPath) return `https://api.dicebear.com/7.x/identicon/svg?seed=${id}`;
    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) return avatarPath;
    const cleanBase = config.apiBaseUrl.endsWith("/") ? config.apiBaseUrl.slice(0, -1) : config.apiBaseUrl;
    const cleanPath = avatarPath.startsWith("/") ? avatarPath : `/${avatarPath}`;
    return `${cleanBase}${cleanPath}`;
  };

  const fetchActivities = useCallback(
    async (targetPage: number = page) => {
      setLoading(true);
      setError(null);
      try {
        const token = Cookies.get("token");
        const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
        const res = await apiRequest(
          `api/v1/client/servers/${serverId}/activity?page=${targetPage}&limit=${limit}${searchParam}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load audit activity.");
        }

        const data = await res.json();
        setActivities(data.activities || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        setPage(data.page || targetPage);
      } catch (err: any) {
        setError(err.message || "Failed to fetch activity logs.");
      } finally {
        setLoading(false);
      }
    },
    [serverId, debouncedSearch, limit, page]
  );

  useEffect(() => {
    fetchActivities(page);
  }, [page, debouncedSearch, fetchActivities]);

  const paginationRange = getPaginationRange(page, totalPages);

  const getActionBadgeColor = (action: string) => {
    if (action.includes("power") || action.includes("delete") || action.includes("kill")) {
      return "border-rose-500/25 bg-rose-500/10 text-rose-400";
    }
    if (action.includes("file") || action.includes("write") || action.includes("archive")) {
      return "border-sky-500/25 bg-sky-500/10 text-sky-400";
    }
    if (action.includes("console") || action.includes("command")) {
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
    }
    if (action.includes("settings") || action.includes("network") || action.includes("startup")) {
      return "border-purple-500/25 bg-purple-500/10 text-purple-400";
    }
    return isDark
      ? "border-white/10 bg-white/5 text-zinc-300"
      : "border-zinc-200 bg-zinc-100 text-zinc-700";
  };

  return (
    <div className="space-y-4 font-sans select-none w-full max-w-full overflow-x-hidden">
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors ${
          isDark ? "border-white/[0.08] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search by action, file path, user or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full text-xs outline-none bg-transparent ${
              isDark ? "text-white placeholder-zinc-500" : "text-zinc-900 placeholder-zinc-400"
            }`}
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className={`text-[11px] font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {totalCount} Total Event{totalCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => fetchActivities(page)}
            className={`p-1.5 rounded-xl border transition-all ${
              isDark
                ? "border-white/10 bg-zinc-900 text-zinc-400 hover:text-white"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-900 shadow-sm"
            }`}
            title="Refresh Activity"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loading width={32} height={32} color={accentColor} />
        </div>
      ) : activities.length === 0 ? (
        <div
          className={`p-14 text-center rounded-2xl border ${
            isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
          }`}
        >
          <ClockIcon className="mx-auto h-10 w-10 text-zinc-500 mb-2 stroke-[1.5]" />
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            No Activity Recorded
          </h3>
          <p className={`text-xs mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {search ? "No events matched your search query." : "No operations have been logged for this server yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {activities.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-4.5 rounded-2xl border shadow-sm transition-all ${
                isDark
                  ? "border-white/[0.06] bg-[#0c0d12] hover:border-white/10"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              } flex flex-col md:flex-row md:items-center justify-between gap-3.5 min-w-0`}
            >
              <div className="flex flex-col min-[370px]:flex-row items-center min-[370px]:items-start gap-3.5 min-w-0 flex-1 text-center min-[370px]:text-left">
                <img
                  src={getFullAvatarUrl(item.avatarUrl, item.userId || item.username)}
                  alt={item.username}
                  className="w-10 h-10 rounded-full object-cover shrink-0 bg-zinc-800 border border-white/5 mx-auto min-[370px]:mx-0 mt-0.5"
                />

                <div className="min-w-0 flex-1 space-y-1 w-full">
                  <div className="flex flex-wrap items-center justify-center min-[370px]:justify-start gap-1.5 min-w-0">
                    <span className={`text-xs font-bold truncate max-w-[140px] sm:max-w-[200px] ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {item.username}
                    </span>
                    <span className={`text-[11px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>—</span>
                    <span
                      title={item.action}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border truncate max-w-[170px] sm:max-w-[260px] ${getActionBadgeColor(
                        item.action
                      )}`}
                    >
                      {item.action}
                    </span>
                  </div>
                  <p
                    className={`text-xs leading-relaxed break-words [overflow-wrap:anywhere] ${
                      isDark ? "text-zinc-300" : "text-zinc-700"
                    }`}
                  >
                    {item.detail}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center md:flex-col md:items-end justify-between md:justify-center gap-x-2 gap-y-0.5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-white/5">
                <span className="font-mono text-[11px] text-zinc-500 font-medium select-text truncate max-w-[180px]">
                  {item.ip}
                </span>
                <span
                  className={`text-[11px] font-medium whitespace-nowrap ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                  title={new Date(item.createdAt).toLocaleString()}
                >
                  {timeAgo(item.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t ${
            isDark ? "border-white/10" : "border-zinc-200"
          }`}
        >
          <span className={`text-xs font-medium text-center sm:text-left ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
            Page <strong className={isDark ? "text-white" : "text-zinc-900"}>{page}</strong> of{" "}
            <strong className={isDark ? "text-white" : "text-zinc-900"}>{totalPages}</strong> ({totalCount} total entries)
          </span>

          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
              title="Previous Page"
            >
              <ChevronLeftIcon className="w-4 h-4 stroke-[2.5]" />
            </button>

            {paginationRange.map((pItem, idx) => {
              if (pItem === "...") {
                return (
                  <span
                    key={`dots-${idx}`}
                    className={`px-2 py-1.5 text-xs font-bold select-none ${
                      isDark ? "text-zinc-500" : "text-zinc-400"
                    }`}
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = pItem === page;
              return (
                <button
                  key={`page-${pItem}`}
                  type="button"
                  onClick={() => setPage(Number(pItem))}
                  style={isCurrent ? { backgroundColor: accentColor, color: "#000" } : {}}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isCurrent
                      ? "border-transparent font-black shadow-sm"
                      : isDark
                      ? "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {pItem}
                </button>
              );
            })}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
              title="Next Page"
            >
              <ChevronRightIcon className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}