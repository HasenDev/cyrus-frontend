"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import { parseCredits } from "@/lib/misc/creditsParser";
import { ServerIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

type AccessLevel = "Developer" | "Admin" | "Moderator" | "Client";
type TabType = "overview" | "edit" | "permissions" | "servers" | "other";

interface UserDetail {
  id: string;
  email: string;
  username: string;
  admin: boolean;
  developer: boolean;
  bot: boolean;
  accessLevel: AccessLevel;
  credits: number;
  maxRam: number;
  maxDeployments: number;
  avatarUrl: string | null;
  permissions: string[];
  totalServers?: number;
  createdAt: number;
}

interface ServerItem {
  id: string;
  name: string;
  description: string;
  ownerUsername: string;
  nodeId: string;
  nodeName: string;
  allocation: string;
  memory: number;
  disk: number;
  cpu: number;
  priceCredits: number;
  createdAt: string;
}

const PERMISSION_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  ADMIN_OVERVIEW: {
    label: "Panel Overview",
    description:
      "View system metrics, general analytics, and overall performance summaries.",
  },
  ADMIN_SETTINGS: {
    label: "System Settings",
    description:
      "Modify global panel parameters, site configuration, and API integration settings.",
  },
  ADMIN_LOCATIONS: {
    label: "Location Management",
    description:
      "Create, edit, and manage global server deployment regions and locations.",
  },
  ADMIN_NODES: {
    label: "Node Management",
    description:
      "Configure daemon host nodes, allocations, port bindings, and capacity limits.",
  },
  ADMIN_SERVERS: {
    label: "Server Management",
    description:
      "Manage deployed servers, their configurations, resources, and lifecycle operations.",
  },
  ADMIN_SERVICES: {
    label: "Services & Plans",
    description:
      "Manage service tiers, billing plans, and resource allocation presets.",
  },
  ADMIN_PACKAGES: {
    label: "Package Management",
    description:
      "Create, edit, and manage server packages, resource limits, and service offerings.",
  },
  ADMIN_PAYMENT: {
    label: "Payment Settings",
    description: "Configure payment related settings.",
  },
  ADMIN_VOUCHERS: {
    label: "Voucher Management",
    description:
      "Create, edit, and manage promotional vouchers, discounts, and redemption settings.",
  },
  ADMIN_ANNOUNCEMENTS: {
    label: "Announcements Management",
    description: "Create, edit, and manage announcements.",
  },
  ADMIN_USERS: {
    label: "User Directory & Staff",
    description:
      "Manage client user accounts, update credentials, and configure staff permissions.",
  },
  ADMIN_NESTS: {
    label: "Nests & Eggs",
    description:
      "Group service configurations and customize Docker container egg templates.",
  },
};

const MAX_CREDITS_LIMIT = 999999999;

export default function ManageUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [user, setUser] = useState<UserDetail | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<
    string[]
  >([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(
    [],
  );
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serverPage, setServerPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);

  const [serversLoading, setServersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editCreditsStr, setEditCreditsStr] = useState("0");

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permError, setPermError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getFullAvatarUrl = (avatarPath: string | null, id: string) => {
    if (!avatarPath) {
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(id)}`;
    }
    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
      return avatarPath;
    }
    const cleanBase = config.apiBaseUrl.endsWith("/")
      ? config.apiBaseUrl.slice(0, -1)
      : config.apiBaseUrl;
    const cleanPath = avatarPath.startsWith("/")
      ? avatarPath
      : `/${avatarPath}`;
    return `${cleanBase}${cleanPath}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchUser = async (pageForServers = serverPage) => {
    if (!userId) {
      setError("No user ID specified.");
      setLoading(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access.");
      setLoading(false);
      return;
    }

    setServersLoading(true);
    try {
      const res = await apiRequest(
        `api/v1/admin/users/manage?id=${encodeURIComponent(userId)}&serverPage=${pageForServers}&serverLimit=10`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to fetch user profile.");
        setLoading(false);
        return;
      }

      setUser(data.user);
      setCurrentUserPermissions(data.currentUserPermissions || []);
      setAvailablePermissions(data.availablePermissions || []);
      setServers(data.servers || []);

      if (data.serverPagination) {
        setServerPage(data.serverPagination.page);
        setServerTotalPages(data.serverPagination.totalPages);
        setServerTotal(data.serverPagination.total);
      }

      setEditEmail(data.user.email || "");
      setEditUsername(data.user.username || "");
      setEditCreditsStr(String(data.user.credits || 0));
      setUserPermissions(data.user.permissions || []);
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
      setServersLoading(false);
    }
  };

  useEffect(() => {
    void fetchUser(1);
  }, [userId]);

  const handleServerPageChange = (newPage: number) => {
    setServerPage(newPage);
    void fetchUser(newPage);
  };

  const handleCreditsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === "") {
      setEditCreditsStr("");
      return;
    }
    if (/^\d*$/.test(rawVal)) {
      const numVal = parseInt(rawVal, 10);
      if (numVal > MAX_CREDITS_LIMIT) {
        setEditCreditsStr(String(MAX_CREDITS_LIMIT));
      } else {
        setEditCreditsStr(rawVal);
      }
    }
  };

  const handleUpdateInfo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setSaveError("");

    const parsedCredits = parseInt(editCreditsStr || "0", 10);
    if (isNaN(parsedCredits) || parsedCredits < 0) {
      setSaveError("Please enter a valid amount of credits.");
      return;
    }

    if (parsedCredits > MAX_CREDITS_LIMIT) {
      setSaveError(
        `Credits cannot exceed ${MAX_CREDITS_LIMIT.toLocaleString()}.`,
      );
      return;
    }

    setSaveLoading(true);
    const token = Cookies.get("token");

    if (!token) {
      setSaveError("Unauthorized access.");
      setSaveLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/users/manage", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: user.id,
          email: editEmail,
          username: editUsername,
          password: editPassword || undefined,
          credits: parsedCredits,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Failed to update user profile.");
        return;
      }

      showToast("Changes saved!");
      setEditPassword("");
      await fetchUser(serverPage);
    } catch {
      setSaveError("Network error occurred.");
    } finally {
      setSaveLoading(false);
    }
  };

  const togglePermission = (perm: string) => {
    if (!user || user.admin || user.developer) return;
    setUserPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSavePermissions = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (user.admin || user.developer) {
      setPermError(
        "Full Administrators/Developers are untouchable. Permissions cannot be modified.",
      );
      return;
    }

    setPermError("");
    setPermLoading(true);

    const token = Cookies.get("token");
    if (!token) {
      setPermError("Unauthorized access.");
      setPermLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/users/manage", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: user.id,
          permissions: userPermissions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPermError(data.error || "Failed to update user permissions.");
        return;
      }

      showToast("Changes saved!");
      await fetchUser(serverPage);
    } catch {
      setPermError("Network error occurred.");
    } finally {
      setPermLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    setDeleteError("");
    setDeleteLoading(true);

    const token = Cookies.get("token");
    if (!token) {
      setDeleteError("Unauthorized access.");
      setDeleteLoading(false);
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/users/manage", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete user.");
        setIsDeleteModalOpen(false);
        return;
      }

      router.push("/home/admin/users");
    } catch {
      setDeleteError("Network error while deleting user.");
      setIsDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDark ? "text-white" : "text-zinc-900"}`}
      >
        <Loading
          width={28}
          height={28}
          color={isDark ? "#ffffff" : "#000000"}
        />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "text-white" : "text-zinc-900"}`}
      >
        <div
          className={`max-w-md w-full rounded-2xl border p-6 shadow-sm ${isDark ? "border-white/10 bg-[#0F1014]" : "border-zinc-200 bg-white"}`}
        >
          <p className="text-sm font-semibold mb-4">
            {error || "User account not found."}
          </p>
          <Link
            href="/home/admin/users"
            className={`inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold border ${
              isDark
                ? "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Return to Users
          </Link>
        </div>
      </div>
    );
  }

  const renderAccessLevelBadge = (level: AccessLevel) => {
    switch (level) {
      case "Developer":
        return (
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
              isDark
                ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                : "bg-orange-50 text-orange-600 border-orange-200"
            }`}
          >
            Developer
          </span>
        );
      case "Admin":
        return (
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
              isDark
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-rose-50 text-rose-600 border-rose-200"
            }`}
          >
            Administrator
          </span>
        );
      case "Moderator":
        return (
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
              isDark
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-blue-50 text-blue-600 border-blue-200"
            }`}
          >
            Moderator
          </span>
        );
      default:
        return (
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold border border-transparent"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            Client User
          </span>
        );
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "edit", label: "Edit Profile" },
    { key: "permissions", label: "Permissions" },
    { key: "servers", label: "Servers" },
    { key: "other", label: "Other" },
  ];

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 py-6 ${isDark ? "text-white" : "text-zinc-900"}`}
    >
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-6xl space-y-6">
        <div
          className={`p-6 rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"} shadow-sm`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex flex-col min-[300px]:flex-row items-start min-[300px]:items-center gap-4">
              <img
                src={getFullAvatarUrl(user.avatarUrl, user.id)}
                alt={user.username}
                className="h-14 w-14 rounded-full object-cover bg-zinc-800 shrink-0 shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1
                    className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}
                  >
                    {user.username}
                  </h1>
                  {renderAccessLevelBadge(user.accessLevel)}
                </div>
                <p
                  className={`text-xs mt-1 break-all ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  {user.email}
                </p>
              </div>
            </div>

            <Link
              href="/home/admin/users"
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 text-center shrink-0 ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Return to Users</span>
            </Link>
          </div>
        </div>

        <div
          className={`flex flex-wrap items-center border-b ${isDark ? "border-white/10" : "border-zinc-200"}`}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSaveError("");
                  setPermError("");
                  setDeleteError("");
                }}
                className={`px-4 py-3 text-xs font-bold relative transition-colors ${
                  isActive
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
                    layoutId="tab-underline"
                    style={{ backgroundColor: accentColor }}
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          className={`rounded-2xl border p-6 sm:p-8 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="border-b pb-4 border-white/10">
                <h2
                  className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
                >
                  Account Overview
                </h2>
                <p
                  className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  General summary of user status, system access level, and
                  resource allocations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}
                >
                  <div className="flex flex-col min-[280px]:flex-row items-start min-[280px]:items-center justify-between gap-1.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 order-first min-[280px]:order-last">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      System Role
                    </span>
                  </div>
                  <div className="mt-1">
                    {renderAccessLevelBadge(user.accessLevel)}
                  </div>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}
                >
                  <div className="flex flex-col min-[280px]:flex-row items-start min-[280px]:items-center justify-between gap-1.5 mb-2">
                    <div className="shrink-0 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 order-first min-[280px]:order-last">
                      <svg
                        className="w-4 h-4"
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
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider break-words ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      User ID
                    </span>
                  </div>
                  <p
                    className={`text-xs font-mono font-bold break-all mt-1 ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
                    title={user.id}
                  >
                    {user.id}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}
                >
                  <div className="flex flex-col min-[280px]:flex-row items-start min-[280px]:items-center justify-between gap-1.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 order-first min-[280px]:order-last">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      Available Credits
                    </span>
                  </div>
                  <p
                    className={`text-lg font-black ${isDark ? "text-white" : "text-zinc-900"}`}
                  >
                    {parseCredits(user.credits)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}
                >
                  <div className="flex flex-col min-[280px]:flex-row items-start min-[280px]:items-center justify-between gap-1.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 order-first min-[280px]:order-last">
                      <ServerIcon className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      Active Servers
                    </span>
                  </div>
                  <p
                    className={`text-lg font-black ${isDark ? "text-white" : "text-zinc-900"}`}
                  >
                    {user.totalServers || serverTotal} Deployed
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}
                >
                  <div className="flex flex-col min-[280px]:flex-row items-start min-[280px]:items-center justify-between gap-1.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 order-first min-[280px]:order-last">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      Assigned Permissions
                    </span>
                  </div>
                  <p
                    className={`text-lg font-black ${isDark ? "text-white" : "text-zinc-900"}`}
                  >
                    {user.admin || user.developer
                      ? "All (Full)"
                      : `${user.permissions.length} Active`}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}
                >
                  <div className="flex flex-col min-[280px]:flex-row items-start min-[280px]:items-center justify-between gap-1.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 order-first min-[280px]:order-last">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      Member Since
                    </span>
                  </div>
                  <p
                    className={`text-xs font-bold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
                  >
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "edit" && (
            <form onSubmit={handleUpdateInfo} className="space-y-6 max-w-xl">
              <div className="border-b pb-4 border-white/10">
                <h2
                  className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
                >
                  Edit User Credentials & Resources
                </h2>
                <p
                  className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  Modify login information or adjust assigned credits balance.
                </p>
              </div>

              {saveError && (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2 mb-6">
                  <InformationCircleIcon className="h-5 w-5 shrink-0 text-rose-400" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                      isDark
                        ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                        : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                      isDark
                        ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                        : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                  >
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all ${
                      isDark
                        ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                        : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1.5">
                    <label
                      className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                    >
                      Credits Balance
                    </label>
                    <span
                      className={`text-[10px] font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      Maximum limit: 999,999,999
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editCreditsStr}
                    onChange={handleCreditsChange}
                    placeholder="0"
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-all font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      isDark
                        ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                        : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                style={{ backgroundColor: accentColor }}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[130px]"
              >
                {saveLoading ? (
                  <Loading width={16} height={16} color="#000000" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          )}

          {activeTab === "permissions" && (
            <form onSubmit={handleSavePermissions} className="space-y-6">
              <div className="border-b pb-4 border-white/10">
                <h2
                  className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
                >
                  Access Control List
                </h2>
                <p
                  className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  Assign granular system access permissions to standard user
                  accounts.
                </p>
              </div>

              {permError && (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2 mb-6">
                  <InformationCircleIcon className="h-5 w-5 shrink-0 text-rose-400" />
                  <span>{permError}</span>
                </div>
              )}

              {user.admin || user.developer ? (
                <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-300 text-xs font-medium flex flex-col min-[460px]:flex-row items-start min-[460px]:items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-purple-200">
                      Full Administrator Protected
                    </h4>
                    <p className="text-purple-300/80 mt-1 leading-relaxed">
                      This account holds Full Administrator or Developer status
                      and is untouchable. Custom permissions cannot be modified.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {availablePermissions.map((perm) => {
                    const hasPerm = userPermissions.includes(perm);
                    const reqUserHasPerm =
                      currentUserPermissions.includes(perm);
                    const canEdit =
                      reqUserHasPerm && !user.admin && !user.developer;
                    const meta = PERMISSION_LABELS[perm] || {
                      label: perm,
                      description:
                        "Grants access to administrative capabilities.",
                    };

                    return (
                      <div
                        key={perm}
                        onClick={() => canEdit && togglePermission(perm)}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                          !canEdit
                            ? "opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900/30"
                            : hasPerm
                              ? isDark
                                ? "border-emerald-500/40 bg-emerald-500/[0.06] cursor-pointer"
                                : "border-emerald-500/50 bg-emerald-50 cursor-pointer"
                              : isDark
                                ? "border-white/5 bg-[#07080a] hover:border-white/20 cursor-pointer"
                                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 cursor-pointer"
                        }`}
                      >
                        <div className="flex flex-col pr-2 flex-1">
                          <span
                            className={`text-xs font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
                          >
                            {meta.label}
                          </span>
                          <span
                            className={`text-[11px] leading-relaxed mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                          >
                            {meta.description}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 mt-2">
                            {perm}
                          </span>
                          {!reqUserHasPerm && (
                            <span className="text-[10px] text-amber-500 font-semibold mt-1">
                              (You lack this permission)
                            </span>
                          )}
                        </div>

                        <div className="pt-0.5 shrink-0 self-end sm:self-auto">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              hasPerm
                                ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                : isDark
                                  ? "border-white/20 bg-white/5"
                                  : "border-zinc-300 bg-white"
                            }`}
                          >
                            {hasPerm && (
                              <svg
                                className="w-3.5 h-3.5 stroke-[3]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!user.admin && !user.developer && (
                <button
                  type="submit"
                  disabled={permLoading}
                  style={{ backgroundColor: accentColor }}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                >
                  {permLoading ? (
                    <Loading width={16} height={16} color="#000000" />
                  ) : (
                    "Save Permissions"
                  )}
                </button>
              )}
            </form>
          )}

          {activeTab === "servers" && (
            <div className="space-y-4">
              <div className="border-b pb-4 border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2
                    className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
                  >
                    Assigned Server Containers ({serverTotal})
                  </h2>
                  <p
                    className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    Active server deployments owned by{" "}
                    <strong>{user.username}</strong>.
                  </p>
                </div>
              </div>

              {serversLoading ? (
                <div className="py-12 flex justify-center">
                  <Loading width={28} height={28} />
                </div>
              ) : servers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                    <ServerIcon className="h-8 w-8 stroke-[1.5]" />
                  </div>
                  <h3
                    className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}
                  >
                    No Active Server Deployments
                  </h3>
                  <p
                    className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    This user currently has no server containers assigned.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[550px]">
                      <thead>
                        <tr
                          className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}
                        >
                          <th className="pb-3 px-3 font-bold">Server Name</th>
                          <th className="pb-3 px-3 font-bold">
                            Node & Allocation
                          </th>
                          <th className="pb-3 px-3 font-bold">Specs</th>
                          <th className="pb-3 px-3 font-bold">Price</th>
                          <th className="pb-3 px-3 font-bold text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}
                      >
                        {servers.map((srv) => (
                          <tr
                            key={srv.id}
                            className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"}`}
                          >
                            <td className="py-3.5 px-3">
                              <Link
                                href={`/home/admin/servers/manage?serverId=${srv.id}`}
                                className={`text-xs font-bold hover:underline block ${isDark ? "text-white" : "text-zinc-900"}`}
                              >
                                {srv.name}
                              </Link>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {srv.id}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-xs font-mono">
                              <span
                                className={`block font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                              >
                                {srv.nodeName}
                              </span>
                              <span className="text-zinc-500 text-[10px]">
                                {srv.allocation}
                              </span>
                            </td>
                            <td
                              className={`py-3.5 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                            >
                              {srv.memory}MB / {srv.disk}MB / {srv.cpu}%
                            </td>
                            <td
                              className={`py-3.5 px-3 text-xs font-bold ${isDark ? "text-white" : "text-zinc-900"}`}
                            >
                              {srv.priceCredits === 0
                                ? "Free"
                                : `${srv.priceCredits} Cr/mo`}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <Link
                                href={`/home/admin/servers/manage?serverId=${srv.id}`}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-block ${
                                  isDark
                                    ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                                }`}
                              >
                                Manage
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col min-[367px]:flex-row min-[367px]:items-center justify-between gap-2.5 pt-2">
                    <span
                      className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      Page <strong>{serverPage}</strong> of{" "}
                      <strong>{serverTotalPages}</strong> ({serverTotal} Total)
                    </span>
                    <div className="flex gap-2 self-start min-[367px]:self-auto">
                      <button
                        type="button"
                        disabled={serverPage <= 1}
                        onClick={() => handleServerPageChange(serverPage - 1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                          isDark
                            ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={serverPage >= serverTotalPages}
                        onClick={() => handleServerPageChange(serverPage + 1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                          isDark
                            ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "other" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-rose-500">Danger Zone</h3>

              {deleteError && (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2 mb-4">
                  <InformationCircleIcon className="h-5 w-5 shrink-0 text-rose-400" />
                  <span>{deleteError}</span>
                </div>
              )}

              {user.admin || user.developer ? (
                <p className="text-xs text-purple-400 font-medium">
                  This account holds Full Administrator or Developer privileges
                  and cannot be deleted.
                </p>
              ) : (
                <>
                  <p
                    className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    Deleting this user will permanently eliminate their account
                    data, settings, and database records.
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md"
                  >
                    Delete User Account
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <ModalMenu
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          desktopMaxWidth="420px"
        >
          <div
            className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h2
                  className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}
                >
                  Confirm Deletion
                </h2>
                <span className="text-xs text-rose-500 font-semibold">
                  Irreversible Action
                </span>
              </div>
            </div>

            <p
              className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
            >
              Are you sure you want to delete user account{" "}
              <strong className={isDark ? "text-white" : "text-zinc-900"}>
                {user.username}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                  isDark
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all disabled:opacity-50"
              >
                {deleteLoading ? (
                  <Loading width={16} height={16} color="#ffffff" />
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          </div>
        </ModalMenu>
      </div>
    </div>
  );
}
