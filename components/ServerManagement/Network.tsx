"use client";

import React, { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { config, apiRequest } from "@/lib/main";
import { ServerDetails } from "@/app/home/server/page";
import Loading from "@/components/Base/Loading";
import ModalMenu from "@/components/Base/ModalMenu";
import {
  GlobeAltIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  StarIcon,
  TrashIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

interface NetworkProps {
  serverId: string;
  serverData: ServerDetails;
  accentColor?: string;
  onRefreshServer?: () => Promise<void> | void;
  userPermissions?: string[];
  isOwner?: boolean;
}

interface Allocation {
  id: string;
  ip: string;
  port: number;
  alias?: string | null;
  isPrimary: boolean;
  notes: string;
}

export default function Network({
  serverId,
  serverData,
  accentColor = "#00f2fe",
  onRefreshServer,
  userPermissions = [],
  isOwner = true
}: NetworkProps) {
  const isDark = config.theme === "dark";

  const canManage = isOwner || userPermissions.includes("network.manage");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [maxAllocations, setMaxAllocations] = useState(5);
  const [availableOnNode, setAvailableOnNode] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [primaryTarget, setPrimaryTarget] = useState<Allocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);
  const [notesTarget, setNotesTarget] = useState<Allocation | null>(null);
  const [notesValue, setNotesValue] = useState("");

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const fetchNetwork = useCallback(async () => {
    setError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/network`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load allocations.");

      setAllocations(data.allocations || []);
      setMaxAllocations(data.maxAllocations || 5);
      setAvailableOnNode(data.availableOnNode || 0);
    } catch (err: any) {
      setError(err.message || "Failed to communicate with network service.");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const handleAssignPort = async () => {
    if (!canManage) return;
    setActionLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/network`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "assign" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign port.");

      setAssignModalOpen(false);
      showToast("Port successfully allocated!");
      await fetchNetwork();
      onRefreshServer?.();
    } catch (err: any) {
      setModalError(err.message || "Failed to assign port.");
    } finally {
      setActionLoading(false);
    }
  };
  const handleSetPrimary = async () => {
    if (!canManage || !primaryTarget) return;
    setActionLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/network`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "set-primary", allocationId: primaryTarget.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set primary port.");

      setPrimaryTarget(null);
      showToast("Primary connection port updated!");
      await fetchNetwork();
      onRefreshServer?.();
    } catch (err: any) {
      setModalError(err.message || "Failed to set primary port.");
    } finally {
      setActionLoading(false);
    }
  };
  const handleDeletePort = async () => {
    if (!canManage || !deleteTarget || deleteTarget.isPrimary) return;
    setActionLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/network`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", allocationId: deleteTarget.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove port.");

      setDeleteTarget(null);
      showToast("Allocation removed and returned to pool.");
      await fetchNetwork();
      onRefreshServer?.();
    } catch (err: any) {
      setModalError(err.message || "Failed to remove port.");
    } finally {
      setActionLoading(false);
    }
  };
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !notesTarget) return;
    setActionLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/network`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "notes", allocationId: notesTarget.id, notes: notesValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save notes.");

      setNotesTarget(null);
      showToast("Port notes updated!");
      await fetchNetwork();
    } catch (err: any) {
      setModalError(err.message || "Failed to save notes.");
    } finally {
      setActionLoading(false);
    }
  };

  const primaryAlloc = allocations.find((a) => a.isPrimary) || allocations[0];
  const canAssignMore = allocations.length < maxAllocations && canManage;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] w-full">
        <Loading width={32} height={32} color={accentColor} />
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none w-full max-w-full">
      {successToast && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 stroke-[3]" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="hover:opacity-75">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="hover:opacity-75">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 min-[980px]:grid-cols-2 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
          } shadow-sm flex flex-col min-[980px]:flex-row min-[980px]:items-center justify-between gap-3 min-w-0`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              className="p-3 rounded-xl shrink-0"
            >
              <GlobeAltIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Primary Endpoint</p>
              <p className={`text-sm font-bold font-mono truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                {primaryAlloc ? `${primaryAlloc.ip}:${primaryAlloc.port}` : "No Allocation"}
              </p>
            </div>
          </div>

          {primaryAlloc && (
            <button
              onClick={() => handleCopy(`${primaryAlloc.ip}:${primaryAlloc.port}`, "primary_box")}
              className={`w-full min-[980px]:w-auto p-2.5 min-[980px]:p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
              title="Copy primary IP:Port"
            >
              {copiedId === "primary_box" ? (
                <CheckIcon className="w-4 h-4 text-emerald-400 stroke-[3]" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
              <span className="min-[980px]:hidden hidden min-[240px]:inline text-[11px]">Copy Primary IP</span>
              <span className="min-[980px]:hidden inline min-[240px]:hidden text-[11px]">Copy</span>
            </button>
          )}
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
          } shadow-sm flex flex-col min-[980px]:flex-row min-[980px]:items-center justify-between gap-3 min-w-0`}
        >
          <div className="min-w-0">
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Allocations Used</p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5 min-w-0">
              <span className={`text-sm font-black shrink-0 ${isDark ? "text-white" : "text-zinc-900"}`}>
                {allocations.length} / {maxAllocations}
              </span>
              <span className={`text-[11px] font-medium truncate ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                {allocations.length < maxAllocations
                  ? `${maxAllocations - allocations.length} slots left`
                  : "Limit Reached"}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!canManage) return;
              setModalError(null);
              setAssignModalOpen(true);
            }}
            disabled={!canAssignMore || actionLoading}
            style={
              canAssignMore
                ? {
                    backgroundColor: `${accentColor}18`,
                    color: accentColor,
                    borderColor: `${accentColor}35`
                  }
                : undefined
            }
            className={`w-full min-[980px]:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all shrink-0 outline-none focus:outline-none ${
              !canAssignMore
                ? isDark
                  ? "border-white/5 bg-zinc-900/60 text-zinc-600 cursor-not-allowed opacity-40"
                  : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-40"
                : "hover:opacity-90 active:scale-95 shadow-sm"
            }`}
            title={!canManage ? "Requires network.manage permission" : undefined}
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden min-[240px]:inline">Assign Port</span>
            <span className="inline min-[240px]:hidden">Assign</span>
          </button>
        </div>
      </div>
      <div
        className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? "border-white/[0.08] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className={`p-4 border-b ${isDark ? "border-white/[0.06] bg-[#111218]" : "border-zinc-200 bg-zinc-50"}`}>
          <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Assigned Allocations</h2>
          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Port bindings and external connection endpoints assigned to this server.
          </p>
        </div>

        <div className="w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full text-left text-xs border-collapse min-w-[540px]">
            <thead>
              <tr className={`border-b font-medium select-none ${
                isDark ? "border-white/[0.06] bg-[#111218] text-zinc-400" : "border-zinc-200 bg-zinc-50 text-zinc-600"
              }`}>
                <th className="py-3.5 px-4 min-w-[180px]">Endpoint</th>
                <th className="py-3.5 px-4 min-w-[160px]">Notes</th>
                <th className="py-3.5 px-4 w-28">Type</th>
                <th className="py-3.5 px-4 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-white/[0.04]" : "divide-zinc-100"}`}>
              {allocations.map((alloc) => {
                const endpoint = `${alloc.ip}:${alloc.port}`;
                const isCopied = copiedId === alloc.id;
                return (
                  <tr key={alloc.id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50"}`}>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <span className={isDark ? "text-white" : "text-zinc-900"}>{endpoint}</span>
                        <button
                          onClick={() => handleCopy(endpoint, alloc.id)}
                          className={`p-1 rounded transition-colors ${
                            isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                          }`}
                          title="Copy Endpoint"
                        >
                          {isCopied ? (
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          ) : (
                            <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 group">
                        <span className={`truncate max-w-[200px] ${
                          alloc.notes ? (isDark ? "text-zinc-300" : "text-zinc-700") : "text-zinc-500 italic"
                        }`}>
                          {alloc.notes || "No notes set"}
                        </span>
                        {canManage && (
                          <button
                            onClick={() => {
                              setModalError(null);
                              setNotesTarget(alloc);
                              setNotesValue(alloc.notes || "");
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity text-zinc-500"
                            title="Edit Note"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {alloc.isPrimary ? (
                        <span
                          style={{ backgroundColor: `${accentColor}18`, color: accentColor, borderColor: `${accentColor}35` }}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold border inline-block select-none"
                        >
                          Primary
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-medium border inline-block select-none ${
                          isDark ? "bg-zinc-800/80 border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
                        }`}>
                          Secondary
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!alloc.isPrimary && (
                          <button
                            disabled={!canManage}
                            onClick={() => {
                              if (!canManage) return;
                              setModalError(null);
                              setPrimaryTarget(alloc);
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center transition-all ${
                              !canManage
                                ? "opacity-35 cursor-not-allowed border-white/5 bg-zinc-900/40 text-zinc-600"
                                : isDark
                                ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:border-white/20"
                                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 shadow-sm"
                            }`}
                            title={!canManage ? "Requires network.manage permission" : "Make Primary Connection Port"}
                          >
                            <StarIcon className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        )}
                        {!alloc.isPrimary && (
                          <button
                            disabled={!canManage}
                            onClick={() => {
                              if (!canManage) return;
                              setModalError(null);
                              setDeleteTarget(alloc);
                            }}
                            className={`p-1.5 rounded-lg border text-xs transition-all ${
                              !canManage
                                ? "opacity-35 cursor-not-allowed border-white/5 bg-zinc-900/40 text-zinc-600"
                                : "border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95"
                            }`}
                            title={!canManage ? "Requires network.manage permission" : "Delete / Unassign Port"}
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ModalMenu isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)}>
        <div className="p-6 space-y-4">
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Assign New Allocation
          </h3>

          {modalError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
            Are you sure you want to assign a new port to this server? An available port from the node daemon pool will be linked immediately.
          </p>

          <div className={`p-3.5 rounded-xl border text-xs ${isDark ? "bg-[#14161f] border-white/5" : "bg-zinc-50 border-zinc-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-medium">
              <span className="text-zinc-400">Current Allocations:</span>
              <span className="font-bold shrink-0">{allocations.length} / {maxAllocations}</span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              disabled={actionLoading}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignPort}
              disabled={actionLoading}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
            >
              {actionLoading ? "Assigning..." : "Confirm & Assign"}
            </button>
          </div>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={Boolean(primaryTarget)} onClose={() => setPrimaryTarget(null)}>
        {primaryTarget && (
          <div className="p-6 space-y-4">
            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Change Primary Port
            </h3>

            {modalError && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
              }`}>
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Are you sure you want to set <strong className="font-mono text-amber-400">{primaryTarget.ip}:{primaryTarget.port}</strong> as the primary connection endpoint for this server?
            </p>

            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrimaryTarget(null)}
                disabled={actionLoading}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                  isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetPrimary}
                disabled={actionLoading}
                className="w-full px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Updating..." : "Make Primary"}
              </button>
            </div>
          </div>
        )}
      </ModalMenu>
      <ModalMenu isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        {deleteTarget && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-rose-500">Remove Allocation</h3>

            {modalError && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
              }`}>
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className={`text-xs ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
              Are you sure you want to unassign <strong className="font-mono text-rose-400">{deleteTarget.ip}:{deleteTarget.port}</strong>? This port will be returned to the node pool and can be assigned to other servers.
            </p>

            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                  isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePort}
                disabled={actionLoading}
                className="w-full px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Removing..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        )}
      </ModalMenu>
      <ModalMenu isOpen={Boolean(notesTarget)} onClose={() => setNotesTarget(null)}>
        {notesTarget && (
          <form onSubmit={handleSaveNotes} className="p-6 space-y-4">
            <div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Edit Allocation Note
              </h3>
              <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Add or edit custom label for <span className="font-mono font-semibold">{notesTarget.ip}:{notesTarget.port}</span>
              </p>
            </div>

            {modalError && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
              }`}>
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <input
              type="text"
              maxLength={100}
              placeholder="e.g. Voice Server, Web Port, RCON..."
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                isDark
                  ? "bg-zinc-900 border-white/10 text-white focus:border-white/30"
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
              }`}
              autoFocus
            />

            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNotesTarget(null)}
                disabled={actionLoading}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                  isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                style={{ backgroundColor: accentColor, color: "#000" }}
                className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Saving..." : "Save Note"}
              </button>
            </div>
          </form>
        )}
      </ModalMenu>
    </div>
  );
}