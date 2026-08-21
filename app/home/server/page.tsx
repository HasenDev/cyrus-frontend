"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
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
  ShieldExclamationIcon
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
    enabled: Boolean(server && !server.installing && !server.suspended)
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
    if (server?.installing) {
      installPollInterval = setInterval(() => {
        silentRefetchServer();
      }, 3000);
    }
    return () => {
      if (installPollInterval) clearInterval(installPollInterval);
    };
  }, [server?.installing, silentRefetchServer]);
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
    <div className="space-y-6 font-sans w-full max-w-full">      <div
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
            </div>
            <p className={`text-xs truncate ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {server.description ? server.description : "No description provided."}
            </p>
          </div>

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
      {server.installing ? (
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