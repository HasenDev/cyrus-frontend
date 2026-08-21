"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import { PlusIcon, ServerIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface ServerItem {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerUsername: string;
  nodeId: string;
  nodeName: string;
  allocation: string;
  memory: number;
  disk: number;
  cpu: number;
  priceCredits: number;
  installing: boolean;
  status: string;
  createdAt: string;
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

export default function AdminServersListingPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalServers, setTotalServers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchServers = async (page: number, search: string) => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await apiRequest(
        `api/v1/admin/servers?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 403) {
        setError("Access Denied: Requires ADMIN_SERVERS permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to load servers.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setServers(data.servers || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalServers(data.pagination?.total || 0);
      setCurrentPage(data.pagination?.currentPage || page);
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const paginationRange = getPaginationRange(currentPage, totalPages);

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-1 sm:px-0 font-sans">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Servers Management
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Manage panel server containers, deployments, resource allocations, and owner assignments.
          </p>
        </div>

        {!error && (
          <Link
            href="/home/admin/servers/create"
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <PlusIcon className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span>Deploy New Server</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {!error && (
        <div className={`rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors overflow-hidden ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search server, ID, or owner..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-xl border px-3.5 py-2 pl-9 text-xs outline-none transition-all ${
                  isDark ? "border-white/10 bg-[#07080a] text-white focus:border-white/30" : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
              <MagnifyingGlassIcon className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
            </div>
            <div className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Showing {servers.length} of {totalServers} Servers
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loading width={32} height={32} />
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                <ServerIcon className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>No servers found</h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                {searchQuery ? "Try refining your search query." : "Deploy your first server container on an active daemon host node."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
                      <th className="pb-3 px-3 font-bold">Server Name</th>
                      <th className="pb-3 px-3 font-bold">Status</th>
                      <th className="pb-3 px-3 font-bold">Node & Port</th>
                      <th className="pb-3 px-3 font-bold">Owner</th>
                      <th className="pb-3 px-3 font-bold">Specs</th>
                      <th className="pb-3 px-3 font-bold">Price</th>
                      <th className="pb-3 px-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                    {servers.map((srv) => {
                      const isInstalling = srv.installing || srv.status === "installing";
                      const isRunning = srv.status === "running";

                      return (
                        <tr key={srv.id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"}`}>
                          <td className="py-3.5 px-3">
                            <Link href={`/home/admin/servers/manage?serverId=${srv.id}`} className={`text-xs font-bold hover:underline block ${isDark ? "text-white" : "text-zinc-900"}`}>
                              {srv.name}
                            </Link>
                            <span className="text-[10px] text-zinc-500 font-mono">{srv.id}</span>
                          </td>

                          <td className="py-3.5 px-3">
                            {isInstalling ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                Installing
                              </span>
                            ) : isRunning ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Running
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                Offline
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-xs font-mono">
                            <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>{srv.nodeName}</span>
                            <span className="text-zinc-500 block text-[10px]">{srv.allocation}</span>
                          </td>

                          <td className={`py-3.5 px-3 text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            {srv.ownerUsername}
                          </td>

                          <td className={`py-3.5 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            {srv.memory}MB / {srv.disk}MB / {srv.cpu}%
                          </td>

                          <td className={`py-3.5 px-3 text-xs font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                            {srv.priceCredits === 0 ? "Free" : `${srv.priceCredits} Cr/mo`}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <Link
                              href={`/home/admin/servers/manage?serverId=${srv.id}`}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-block ${
                                isDark ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                              }`}
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className={`flex flex-wrap items-center justify-between gap-4 pt-5 border-t ${isDark ? "border-white/5" : "border-zinc-100"}`}>
                  <span className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        currentPage === 1
                          ? "opacity-30 cursor-not-allowed border-transparent"
                          : isDark
                          ? "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                          : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      &lt;
                    </button>
                    {paginationRange.map((page, idx) => {
                      if (page === "...") {
                        return (
                          <span key={`dots-${idx}`} className={`px-2 py-1.5 text-xs font-bold select-none ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                            ...
                          </span>
                        );
                      }

                      const isCurrent = page === currentPage;
                      return (
                        <button
                          key={`page-${page}`}
                          type="button"
                          onClick={() => setCurrentPage(Number(page))}
                          style={isCurrent ? { backgroundColor: accentColor, color: "#000" } : {}}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isCurrent
                              ? "border-transparent font-black shadow-sm"
                              : isDark
                              ? "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                              : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        currentPage === totalPages
                          ? "opacity-30 cursor-not-allowed border-transparent"
                          : isDark
                          ? "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                          : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}