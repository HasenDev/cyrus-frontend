"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import { PlusIcon } from "@heroicons/react/24/outline";

interface NodeItem {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  locationFlag: string;
  fqdn: string;
  scheme: string;
  daemonPort: number;
  uploadSize: number;
  maintenanceMode: boolean;
  isOnline: boolean;
  allocationCount: number;
  serverCount: number;
  createdAt?: string;
}

export default function AdminNodesListingPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchNodes = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/nodes", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError("Access Denied: Requires ADMIN_NODES permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to load host nodes.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setNodes(data.nodes || []);
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-1 sm:px-0">
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
            Nodes Management
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Manage daemon compute host nodes, allocations, and deployment configurations.
          </p>
        </div>

        {!error && (
          <Link
            href="/home/admin/nodes/create"
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <PlusIcon className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span>Create New Node</span>
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
          {nodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>No host nodes deployed</h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Create your first node daemon target to begin deploying server containers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
                    <th className="pb-3 px-3 font-bold">Node Name</th>
                    <th className="pb-3 px-3 font-bold">Status</th>
                    <th className="pb-3 px-3 font-bold">Location</th>
                    <th className="pb-3 px-3 font-bold">FQDN & Port</th>
                    <th className="pb-3 px-3 font-bold">Allocations</th>
                    <th className="pb-3 px-3 font-bold">Servers</th>
                    <th className="pb-3 px-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                  {nodes.map((node) => (
                    <tr key={node.id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"}`}>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/home/admin/nodes/manage?nodeId=${node.id}`} className={`text-xs font-bold hover:underline ${isDark ? "text-white" : "text-zinc-900"}`}>
                            {node.name}
                          </Link>
                          {node.maintenanceMode && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Maint.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                          node.isOnline
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${node.isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                          {node.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                          {node.locationName} ({node.locationFlag})
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span className="text-emerald-500 font-bold">https://</span>
                          <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>{node.fqdn}:{node.daemonPort}</span>
                        </div>
                      </td>

                      <td className={`py-3.5 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        {node.allocationCount} Ports
                      </td>

                      <td className={`py-3.5 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        {node.serverCount} Deployed
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <Link
                          href={`/home/admin/nodes/manage?nodeId=${node.id}`}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-block ${isDark ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"}`}
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}