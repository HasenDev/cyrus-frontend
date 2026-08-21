"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import {
  ServerIcon,
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface ClientServer {
  id: string;
  name: string;
  description?: string;
  status: "running" | "offline" | "starting" | "installing" | "suspended" | "installation_failed" | string;
  installing: boolean;
  suspended?: boolean;
  shared?: boolean;
  ipAddress: string;
  port: number;
  memory: number;
  disk: number;
  cpu: number;
  nodeName?: string;
  nestName?: string;
  eggName?: string;
  createdAt?: string;
}

const formatStatus = (status: string, installing: boolean, suspended?: boolean) => {
  if (installing || status === "installing") return "Installing";
  if (suspended || status === "suspended") return "Suspended";
  if (!status) return "Offline";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

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

export default function ServicesPage() {
  const router = useRouter();
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [servers, setServers] = useState<ClientServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState<number>(1024);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;
  const [serverToDelete, setServerToDelete] = useState<ClientServer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchServers = useCallback(
    async (targetPage: number = 1) => {
      setLoading(true);

      const token = Cookies.get("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest(`api/v1/client/servers?page=${targetPage}&limit=${limit}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          showToast("Failed to load servers.", "error");
          return;
        }

        const data = await res.json();
        setServers(data.servers || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        setPage(data.page || targetPage);
      } catch {
        showToast("Network error fetching services.", "error");
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchServers(page);
  }, [page, fetchServers]);

  const handleDeleteServer = async () => {
    if (!serverToDelete) return;
    setDeleteLoading(true);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/client/servers", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: serverToDelete.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to delete server.", "error");
        return;
      }

      showToast("Server successfully deleted.");
      setIsDeleteModalOpen(false);
      setServerToDelete(null);

      const nextTargetPage = servers.length === 1 && page > 1 ? page - 1 : page;
      fetchServers(nextTargetPage);
    } catch {
      showToast("Network error while requesting server deletion.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCardClick = (serviceId: string) => {
    if (screenWidth >= 820) {
      router.push(`/home/server?id=${serviceId}`);
    }
  };

  const getStatusLineColor = (status: string, installing: boolean, suspended?: boolean) => {
    if (installing || status === "installing") return "bg-cyan-500 shadow-cyan-500/50";
    if (suspended || status === "suspended") return "bg-rose-500 shadow-rose-500/50";
    switch (status) {
      case "running":
      case "online":
        return "bg-emerald-500 shadow-emerald-500/50";
      case "starting":
        return "bg-amber-500 shadow-amber-500/50";
      case "offline":
      default:
        return "bg-zinc-500 shadow-zinc-500/30";
    }
  };

  const StatusBadge = ({ status, installing, suspended }: { status: string; installing: boolean; suspended?: boolean }) => {
    if (installing || status === "installing") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-400 border border-cyan-500/20 shrink-0">
          <Loading width={12} height={12} color="#22d3ee" />
          Installing
        </span>
      );
    }

    if (suspended || status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400 border border-rose-500/20 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Suspended
        </span>
      );
    }

    switch (status) {
      case "running":
      case "online":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        );
      case "starting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 border border-amber-500/20 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Starting
          </span>
        );
      case "offline":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs font-bold text-zinc-400 border border-zinc-500/20 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            {formatStatus(status, installing, suspended)}
          </span>
        );
    }
  };

  const isDesktop = screenWidth >= 820;
  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold backdrop-blur-md ${
              toastMessage.type === "error"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            Your Services
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
            Manage active services ({totalCount} total).
          </p>
        </div>

        <Link
          href="/home/packages"
          style={{ backgroundColor: accentColor }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-black transition-all hover:opacity-90 shadow-sm shrink-0"
        >
          <PlusIcon className="h-4 w-4 stroke-[3]" />
          <span>Add Service</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <Loading width={32} height={32} color={accentColor} />
        </div>
      ) : servers.length === 0 ? (
        <div
          className={`p-10 sm:p-14 text-center rounded-2xl border ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          <ServerIcon className="mx-auto h-12 w-12 text-zinc-500 mb-3 stroke-[1.5]" />
          <h3 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            No Services Deployed
          </h3>
          <p className={`text-xs mt-1 mb-6 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            You don't have any active servers yet. Deploy a service package to get started!
          </p>
          <Link
            href="/home/packages"
            style={{ backgroundColor: accentColor }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            Create Your First Server
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servers.map((service) => (
              <div
                key={service.id}
                onClick={() => handleCardClick(service.id)}
                className={`relative overflow-hidden rounded-2xl border p-4 sm:p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
                  isDark
                    ? "border-white/[0.06] bg-[#0F1014] hover:border-white/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                } ${isDesktop ? "cursor-pointer group hover:shadow-md" : ""}`}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusLineColor(
                    service.status,
                    service.installing,
                    service.suspended
                  )}`}
                />

                <div className="pl-2 sm:pl-3 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <div className="space-y-1.5 min-w-[150px] flex-1">
                        <h3
                          className={`text-base sm:text-lg font-extrabold tracking-tight truncate ${
                            isDark ? "text-white" : "text-zinc-900"
                          }`}
                        >
                          {service.name}
                        </h3>

                        <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          {service.description ? service.description : service.eggName || service.nestName || "Standard Instance"}
                        </p>

                        {service.shared && (
                          <div className="pt-0.5 flex items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              Shared
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <StatusBadge
                          status={service.status}
                          installing={service.installing}
                          suspended={service.suspended}
                        />
                        {isDesktop && !service.shared && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setServerToDelete(service);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all opacity-80 group-hover:opacity-100"
                            title="Delete Server"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isDesktop && (
                    <div
                      className={`pt-3 flex items-center justify-between border-t text-xs font-bold transition-colors ${
                        isDark
                          ? "border-white/5 text-zinc-400 group-hover:text-white"
                          : "border-zinc-100 text-zinc-500 group-hover:text-zinc-900"
                      }`}
                    >
                      <span>Manage service</span>
                      <ArrowRightIcon className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" style={{ color: accentColor }} />
                    </div>
                  )}

                  {!isDesktop && (
                    <div
                      className={`pt-3 flex flex-col min-[290px]:flex-row items-stretch min-[290px]:items-center gap-2.5 border-t ${
                        isDark ? "border-white/5" : "border-zinc-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/home/server?id=${service.id}`);
                        }}
                        style={{ backgroundColor: accentColor }}
                        className="w-full min-[290px]:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-black transition-all hover:opacity-90 shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>Manage</span>
                        <ArrowRightIcon className="w-4 h-4 stroke-[2.5]" />
                      </button>

                      {!service.shared && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setServerToDelete(service);
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-full min-[290px]:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
                          title="Delete Server"
                        >
                          <TrashIcon className="w-4 h-4 stroke-[2.2]" />
                          <span className="inline min-[290px]:hidden">Delete Server</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div
              className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t ${
                isDark ? "border-white/10" : "border-zinc-200"
              }`}
            >
              <span className={`text-xs font-medium text-center sm:text-left ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                Page <strong className={isDark ? "text-white" : "text-zinc-900"}>{page}</strong> of{" "}
                <strong className={isDark ? "text-white" : "text-zinc-900"}>{totalPages}</strong> ({totalCount} total services)
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
      )}

      <ModalMenu isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} desktopMaxWidth="420px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Delete Server
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to permanently delete{" "}
            <strong className={isDark ? "text-white" : "text-zinc-900"}>{serverToDelete?.name}</strong>? All files,
            volumes, and bound network allocations will be permanently unassigned.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className={`w-1/2 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteServer}
              disabled={deleteLoading}
              className="w-1/2 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {deleteLoading ? <Loading width={16} height={16} color="#ffffff" /> : "Confirm Delete"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}