"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { config, apiRequest } from "@/lib/main";
import { ServerDetails } from "@/app/home/server/page";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import {
  AdjustmentsHorizontalIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
  TrashIcon,
  SquaresPlusIcon
} from "@heroicons/react/24/outline";

interface SettingsProps {
  serverId: string;
  serverData: ServerDetails;
  accentColor?: string;
  onRefreshServer?: () => Promise<void> | void;
  userPermissions?: string[];
  isOwner?: boolean;
}

export default function Settings({
  serverId,
  serverData,
  accentColor = "#00f2fe",
  onRefreshServer,
  userPermissions = [],
  isOwner = true
}: SettingsProps) {
  const isDark = config.theme === "dark";
  const router = useRouter();
  const canChangeInfo = isOwner || userPermissions.includes("settings.change.info");
  const canReinstall = isOwner || userPermissions.includes("settings.reinstall");
  const [name, setName] = useState(serverData.name || "");
  const [description, setDescription] = useState(serverData.description || "");
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [reinstallModalOpen, setReinstallModalOpen] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [reinstallError, setReinstallError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChangeInfo) return;

    setGeneralError(null);
    setGeneralSuccess(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setGeneralError("Server name cannot be empty.");
      return;
    }

    setSavingGeneral(true);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/settings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "rename",
          name: cleanName,
          description: description.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update server details.");

      setGeneralSuccess("Server details updated successfully!");
      setTimeout(() => setGeneralSuccess(null), 3500);
      onRefreshServer?.();
    } catch (err: any) {
      setGeneralError(err.message || "Failed to update server details.");
    } finally {
      setSavingGeneral(false);
    }
  };
  const handleReinstallServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReinstall) return;

    setReinstallError(null);
    setReinstalling(true);

    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/settings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "reinstall" })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate reinstallation.");

      setReinstallModalOpen(false);
      onRefreshServer?.();
    } catch (err: any) {
      setReinstallError(err.message || "Failed to initiate reinstallation.");
    } finally {
      setReinstalling(false);
    }
  };
  const handleDeleteServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    if (deleteConfirmName !== serverData.name) {
      setDeleteError("The entered server name does not match.");
      return;
    }

    setDeleteError(null);
    setDeleting(true);

    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/settings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete" })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete server.");

      setDeleteModalOpen(false);
      router.push("/home/services");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete server.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 select-none w-full max-w-full">
      <div
        className={`p-5 sm:p-6 rounded-2xl border ${
          isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        } shadow-sm space-y-5`}
      >
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            className="p-3 rounded-xl shrink-0"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              General Settings
            </h2>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Modify the server identifier name and optional description.
            </p>
          </div>
        </div>

        {generalSuccess && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 stroke-[3]" />
              <span>{generalSuccess}</span>
            </div>
            <button type="button" onClick={() => setGeneralSuccess(null)} className="hover:opacity-75">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {generalError && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{generalError}</span>
            </div>
            <button type="button" onClick={() => setGeneralError(null)} className="hover:opacity-75">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSaveGeneral} className="space-y-4">
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Server Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={!canChangeInfo}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Node 1"
              maxLength={64}
              required
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-colors ${
                !canChangeInfo
                  ? isDark
                    ? "bg-zinc-900/60 border-white/5 text-zinc-500 cursor-not-allowed"
                    : "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed"
                  : isDark
                  ? "bg-[#111218] border-white/10 text-white focus:border-white/20"
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Server Description <span className={`text-[10px] font-normal ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>(optional)</span>
            </label>
            <textarea
              disabled={!canChangeInfo}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Primary production instance running Spigot."
              rows={3}
              maxLength={255}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-colors resize-none ${
                !canChangeInfo
                  ? isDark
                    ? "bg-zinc-900/60 border-white/5 text-zinc-500 cursor-not-allowed"
                    : "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed"
                  : isDark
                  ? "bg-[#111218] border-white/10 text-white focus:border-white/20"
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
              }`}
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingGeneral || !canChangeInfo}
              style={
                canChangeInfo
                  ? { backgroundColor: accentColor, color: "#000" }
                  : undefined
              }
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                !canChangeInfo
                  ? isDark
                    ? "bg-zinc-900/60 text-zinc-600 border border-white/5 cursor-not-allowed opacity-40"
                    : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-40"
                  : "hover:opacity-90 active:scale-95 disabled:opacity-50"
              }`}
              title={!canChangeInfo ? "Requires settings.change.info permission" : undefined}
            >
              {savingGeneral && <Loading width={14} height={14} color="#000" />}
              <span>{savingGeneral ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
      {(canReinstall || isOwner) && (
        <div
          className={`p-5 sm:p-6 rounded-2xl border ${
            isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
          } shadow-sm space-y-5`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-white/[0.05] text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>
              <SquaresPlusIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Others
              </h2>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Advanced operations and lifecycle actions for your server instance.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDark ? "border-white/[0.06] bg-[#111218]" : "border-zinc-200 bg-zinc-50/60"
              }`}
            >
              <div>
                <h3 className="text-xs font-bold text-orange-500">
                  Reinstall Server
                </h3>
                <p className={`text-[11px] mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Re-runs the egg installation script on top of the server directory and rebuilds the container.
                </p>
              </div>
              <button
                type="button"
                disabled={!canReinstall}
                onClick={() => {
                  if (!canReinstall) return;
                  setReinstallError(null);
                  setReinstallModalOpen(true);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center justify-center gap-1.5 ${
                  !canReinstall
                    ? "opacity-35 cursor-not-allowed border-white/5 bg-zinc-900/40 text-zinc-600"
                    : isDark
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 active:scale-95"
                    : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 active:scale-95"
                }`}
                title={!canReinstall ? "Requires settings.reinstall permission" : undefined}
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                <span>Reinstall Server</span>
              </button>
            </div>
            {isOwner && (
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDark ? "border-white/[0.06] bg-[#111218]" : "border-zinc-200 bg-zinc-50/60"
                }`}
              >
                <div>
                  <h3 className="text-xs font-bold text-rose-500">
                    Delete Server
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Permanently wipes all server data, containers, volumes, and releases bound port allocations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmName("");
                    setDeleteError(null);
                    setDeleteModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete Server</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <ModalMenu isOpen={reinstallModalOpen} onClose={() => setReinstallModalOpen(false)}>
        <form onSubmit={handleReinstallServer} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
              <ArrowPathIcon className="w-5 h-5 stroke-2" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Reinstall Server Instance?
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                This will stop the server and re-run the egg provisioner.
              </p>
            </div>
          </div>

          {reinstallError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{reinstallError}</span>
            </div>
          )}

          <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
            Your server will be temporarily offline while the installation scripts run. Some configuration or binary files might be overwritten during this process.
          </p>

          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReinstallModalOpen(false)}
              disabled={reinstalling}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reinstalling || !canReinstall}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-400 text-black shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {reinstalling && <Loading width={14} height={14} color="#000" />}
              <span>{reinstalling ? "Reinstalling..." : "Confirm Reinstall"}</span>
            </button>
          </div>
        </form>
      </ModalMenu>
      {isOwner && (
        <ModalMenu isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
          <form onSubmit={handleDeleteServer} className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                <TrashIcon className="w-5 h-5 stroke-2" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Delete Server Instance
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
              }`}>
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Please type <span className={`font-bold font-mono px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-900"}`}>{serverData.name}</span> below to confirm permanent deletion:
            </p>

            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={serverData.name}
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                isDark
                  ? "bg-zinc-900 border-white/10 text-white focus:border-rose-500/40"
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-rose-400"
              }`}
              autoFocus
            />

            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                  isDark
                    ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting || deleteConfirmName !== serverData.name}
                className="w-full px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
              >
                {deleting && <Loading width={14} height={14} color="#fff" />}
                <span>{deleting ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </form>
        </ModalMenu>
      )}
    </div>
  );
}