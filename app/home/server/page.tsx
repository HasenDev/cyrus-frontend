"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import Overview from "@/components/ServerManagement/Overview";
import FileManager from "@/components/ServerManagement/FileManager";
import Network from "@/components/ServerManagement/Network";
import Startup from "@/components/ServerManagement/Startup";
import UsersTab from "@/components/ServerManagement/Users";
import Settings from "@/components/ServerManagement/Settings";
import Payment from "@/components/ServerManagement/Payment";
import Activity from "@/components/ServerManagement/Activity";
import { useServerWebSocket } from "@/components/Handler/WebSocket";
import { config, apiRequest } from "@/lib/main";
import {
  ArrowLeftIcon,
  WrenchScrewdriverIcon,
  ShieldExclamationIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export interface ServerDetails {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerUsername: string;
  nodeId: string;
  allocationId: string;
  additionalAllocationIds?: string[];
  nestId: string;
  eggId: string;
  memory: number;
  disk: number;
  cpu: number;
  status: string;
  allocation?: string;
  installing?: boolean;
  suspended?: boolean;
}

export type TabType = "overview" | "files" | "network" | "startup" | "payment" | "activity" | "users" | "settings";

const ALL_TABS_CONFIG: { key: TabType; label: string; prefix: string }[] = [
  { key: "overview", label: "Overview", prefix: "overview." },
  { key: "files", label: "Files", prefix: "files." },
  { key: "network", label: "Network", prefix: "network." },
  { key: "startup", label: "Startup", prefix: "startup." },
  { key: "payment", label: "Payment", prefix: "payment." },
  { key: "users", label: "Users", prefix: "users." },
  { key: "settings", label: "Settings", prefix: "settings." },
  { key: "activity", label: "Activity", prefix: "activity." }
];

function ServerPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serverId = searchParams.get("serverId") || searchParams.get("id");
  const tabParam = searchParams.get("tab")?.toLowerCase() as TabType | undefined;
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && ALL_TABS_CONFIG.some(t => t.key === tabParam) ? tabParam : "overview"
  );
  const [server, setServer] = useState<ServerDetails | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [nodeOnline, setNodeOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isInstalling = Boolean(server?.installing && server?.status !== "installation_failed");
  const isInstallationFailed = Boolean(server?.status === "installation_failed");

  const {
    status,
    setStatus,
    stats,
    overlayState,
    sendCommand,
    getConsoleHistory,
    subscribeConsoleOutput
  } = useServerWebSocket({
    serverId: server?.id || null,
    serverMemory: server?.memory || 1024,
    enabled: Boolean(server && !isInstalling && !server.suspended && !isInstallationFailed)
  });

  const accessibleTabs = useMemo(() => {
    if (isOwner) return ALL_TABS_CONFIG;
    return ALL_TABS_CONFIG.filter(tab => {
      if (tab.key === "activity") return userPermissions.includes("activity.view");
      return userPermissions.some(p => p.startsWith(tab.prefix));
    });
  }, [isOwner, userPermissions]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    if (tab !== "files") {
      params.delete("directory");
      params.delete("edit");
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, []);

  const fetchServerDetails = useCallback(async (silent = false) => {
    if (!serverId) {
      setError("No Server ID specified.");
      setLoading(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("Missing authentication token.");
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const res = await apiRequest(`api/v1/client/servers/manage?serverId=${serverId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (!silent) setError("Server not found or access denied.");
        return;
      }

      const data = await res.json();
      setServer(data.server);
      setIsOwner(Boolean(data.isOwner));
      setUserPermissions(data.userPermissions || []);
      setNodeOnline(data.server.status !== "offline_node");

      if (data.server?.suspended) {
        if (tabParam !== "payment" && tabParam !== "users") {
          setActiveTab("payment");
        }
      }
    } catch {
      if (!silent) setError("Network communication error occurred.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [serverId, tabParam]);

  const silentRefetchServer = useCallback(async () => {
    await fetchServerDetails(true);
  }, [fetchServerDetails]);

  useEffect(() => {
    let installPollInterval: NodeJS.Timeout | null = null;
    if (server?.installing && server.status !== "installation_failed") {
      installPollInterval = setInterval(() => {
        silentRefetchServer();
      }, 3000);
    }
    return () => {
      if (installPollInterval) clearInterval(installPollInterval);
    };
  }, [server?.installing, server?.status, silentRefetchServer]);

  useEffect(() => {
    fetchServerDetails(false);
  }, [serverId]);

  useEffect(() => {
    if (loading || !server) return;

    if (server.suspended) {
      if (activeTab !== "payment" && activeTab !== "users") {
        setActiveTab("payment");
      }
      return;
    }

    if (accessibleTabs.length > 0) {
      const isCurrentTabAllowed = accessibleTabs.some(t => t.key === activeTab);
      if (!isCurrentTabAllowed) {
        setActiveTab(accessibleTabs[0].key);
      }
    }
  }, [loading, server, accessibleTabs, activeTab]);

  const handleDeleteServer = async () => {
    if (!server) return;
    setDeleteLoading(true);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/client/servers", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: server.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to delete server.", "error");
        setDeleteLoading(false);
        return;
      }

      setIsDeleteModalOpen(false);
      router.push("/home/services");
    } catch {
      showToast("Network error while requesting server deletion.", "error");
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <Loading width={36} height={36} color={accentColor} />
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] w-full py-8">
        <div
          className={`w-full max-w-lg p-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-4 ${
            isDark ? "border-white/[0.08] bg-[#0F1014]" : "border-zinc-200 bg-white"
          } shadow-xl`}
        >
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldExclamationIcon className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div className="space-y-1 max-w-sm">
            <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              {error || "Server Not Found"}
            </h2>
            <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              You don&apos;t have access to this server instance or it has been permanently removed from the system.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/home/services"
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center gap-2 shadow-sm ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Return</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans w-full max-w-full">
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

      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-colors ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        } shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h1
                className={`text-xl sm:text-2xl font-black tracking-tight break-words [overflow-wrap:anywhere] ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                {server.name}
              </h1>
              {!isOwner && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  Shared
                </span>
              )}
              {server.suspended && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                  Suspended
                </span>
              )}
              {isInstallationFailed && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                  Installation Failed
                </span>
              )}
              {isInstalling && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  Installing
                </span>
              )}
            </div>
            <p className={`text-xs truncate ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {server.description ? server.description : "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto w-full sm:w-auto">
            {isOwner && (!isInstalling || isInstallationFailed) && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center gap-1.5 shrink-0 shadow-sm outline-none focus:outline-none border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete Server</span>
              </button>
            )}

            <Link
              href="/home/services"
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center gap-1.5 shrink-0 shadow-sm outline-none focus:outline-none ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Return</span>
            </Link>
          </div>
        </div>
      </div>

      {isInstalling ? (
        <div
          className={`p-10 sm:p-14 rounded-2xl border text-center flex flex-col items-center justify-center gap-5 ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          } shadow-sm`}
        >
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <WrenchScrewdriverIcon className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              Server Installation in Progress
            </h2>
            <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              The node daemon is preparing dependencies, downloading egg assets, and configuring your container environment. Management controls will unlock automatically once completed.
            </p>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
            <Loading width={14} height={14} color="#f59e0b" />
            <span>Provisioning environment...</span>
          </div>
        </div>
      ) : isInstallationFailed ? (
        <div
           className={`p-10 sm:p-14 rounded-2xl border text-center flex flex-col items-center justify-center gap-5 ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          } shadow-sm`}
        >
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <ExclamationTriangleIcon className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              Server Installation Failed
            </h2>
            <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              The installation process could not be completed or exceeded the timeout limit. You can safely delete this server instance or contact an administrator to restore your data.
            </p>
          </div>

          {isOwner && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-sm flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete Failed Server</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div
            className={`border-b overflow-x-auto no-scrollbar scroll-smooth flex items-center transition-colors ${
              isDark ? "border-white/10" : "border-zinc-200"
            }`}
          >
            <div className="flex items-center whitespace-nowrap min-w-max">
              {accessibleTabs.map(tab => {
                const isActive = activeTab === tab.key;
                const isTabDisabled = server.suspended && tab.key !== "payment" && tab.key !== "users";

                return (
                  <button
                    key={tab.key}
                    disabled={isTabDisabled}
                    onClick={() => handleTabChange(tab.key)}
                    className={`px-4 sm:px-5 py-3 text-xs font-bold relative transition-colors outline-none focus:outline-none ${
                      isTabDisabled
                        ? "opacity-30 cursor-not-allowed text-zinc-600"
                        : isActive
                        ? isDark
                          ? "text-white"
                          : "text-zinc-900"
                        : isDark
                        ? "text-zinc-500 hover:text-zinc-300"
                        : "text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="server-tab-underline"
                        style={{ backgroundColor: accentColor }}
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {activeTab === "overview" && (
            <Overview
              serverId={server.id}
              serverData={server}
              nodeOnline={nodeOnline}
              accentColor={accentColor}
              status={status}
              setStatus={setStatus}
              stats={stats}
              overlayState={overlayState}
              sendCommand={sendCommand}
              getConsoleHistory={getConsoleHistory}
              subscribeConsoleOutput={subscribeConsoleOutput}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}

          {activeTab === "files" && (
            <FileManager
              serverId={server.id}
              nodeOnline={nodeOnline}
              accentColor={accentColor}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}

          {activeTab === "network" && (
            <Network
              serverId={server.id}
              serverData={server}
              accentColor={accentColor}
              onRefreshServer={silentRefetchServer}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}

          {activeTab === "startup" && (
            <Startup
              serverId={server.id}
              serverData={server}
              accentColor={accentColor}
              onRefreshServer={silentRefetchServer}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}

          {activeTab === "payment" && (
            <Payment
              serverId={server.id}
              serverData={server}
              accentColor={accentColor}
              onRefreshServer={silentRefetchServer}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}
          {activeTab === "users" && (
            <UsersTab
              serverId={server.id}
              serverData={server}
              accentColor={accentColor}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}

          {activeTab === "settings" && (
            <Settings
              serverId={server.id}
              serverData={server}
              accentColor={accentColor}
              onRefreshServer={silentRefetchServer}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}
          {activeTab === "activity" && (
            <Activity
              serverId={server.id}
              serverData={server}
              accentColor={accentColor}
              userPermissions={userPermissions}
              isOwner={isOwner}
            />
          )}
        </>
      )}

      <ModalMenu isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} desktopMaxWidth="420px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Delete Server
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to permanently delete{" "}
            <strong className={isDark ? "text-white" : "text-zinc-900"}>{server?.name}</strong>? All files,
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

export default function ServerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] w-full">
          <Loading width={36} height={36} color="#00f2fe" />
        </div>
      }
    >
      <ServerPageContent />
    </Suspense>
  );
}
