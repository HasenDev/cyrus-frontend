"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";

type AccessLevel = "Developer" | "Admin" | "Moderator" | "Client";

interface UserItem {
  id: string;
  email: string;
  username: string;
  admin: boolean;
  developer: boolean;
  accessLevel: AccessLevel;
  credits: number;
  avatarUrl: string | null;
  createdAt: number;
}
function getPaginationRange(
  currentPage: number,
  totalPages: number,
): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export default function AdminUsersPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const getFullAvatarUrl = (avatarPath: string | null, id: string) => {
    if (!avatarPath) {
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${id}`;
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
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchUsers = async (page: number, search: string) => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized: Token missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await apiRequest(
        `api/v1/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.status === 403) {
        setError("Access Denied: Requires ADMIN_USERS permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to fetch user directory.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalUsers(data.pagination?.total || 0);
      setCurrentPage(data.pagination?.currentPage || page);
    } catch (err) {
      setError("Network error occurred while fetching users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const openCreateModal = () => {
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setModalError("");
    setIsCreateOpen(true);
  };

  const closeModal = () => {
    setIsCreateOpen(false);
    setModalLoading(false);
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (password !== confirmPassword) {
      setModalError("Passwords do not match.");
      return;
    }

    setModalLoading(true);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/users", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to create user.");
        setModalLoading(false);
        return;
      }

      showToast("User account created successfully.");
      closeModal();
      fetchUsers(currentPage, searchQuery);
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const renderAccessBadge = (level: AccessLevel) => {
    switch (level) {
      case "Developer":
        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
            className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-transparent"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            Client
          </span>
        );
    }
  };

  const paginationRange = getPaginationRange(currentPage, totalPages);

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-1 sm:px-0 font-sans">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
          >
            <svg
              className="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            User Management
          </h1>
          <p
            className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Manage system access, adjust user credits, update credentials, and
            review user accounts.
          </p>
        </div>

        {!error && (
          <button
            type="button"
            onClick={openCreateModal}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            <svg
              className="h-4 w-4 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Create User</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {!error && (
        <div
          className={`rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors overflow-hidden ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}
        >
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by username, email, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-xl border px-3.5 py-2 pl-9 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
              <svg
                className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div
              className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
            >
              Showing {users.length} of {totalUsers} Users
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loading width={32} height={32} />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3
                className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}
              >
                No users found
              </h3>
              <p
                className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
              >
                {searchQuery
                  ? "Try refining your search query."
                  : "Start by registering a user account."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr
                      className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}
                    >
                      <th className="pb-3 px-3 font-bold">User</th>
                      <th className="pb-3 px-3 font-bold">Role</th>
                      <th className="pb-3 px-3 font-bold">Credits</th>
                      <th className="pb-3 px-3 font-bold">Joined</th>
                      <th className="pb-3 px-3 font-bold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}
                  >
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"}`}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={getFullAvatarUrl(user.avatarUrl, user.id)}
                              alt={user.username}
                              className="h-9 w-9 rounded-full object-cover shrink-0 bg-zinc-800"
                            />
                            <div className="flex flex-col">
                              <Link
                                href={`/home/admin/users/manage?id=${user.id}`}
                                style={{ color: accentColor }}
                                className="text-xs font-bold hover:underline"
                              >
                                {user.username}
                              </Link>
                              <span
                                className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                              >
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {renderAccessBadge(user.accessLevel)}
                        </td>

                        <td
                          className={`py-3.5 px-3 text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                        >
                          {user.credits.toLocaleString()}
                        </td>

                        <td
                          className={`py-3.5 px-3 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                        >
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <Link
                            href={`/home/admin/users/manage?id=${user.id}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isDark
                                ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                            }`}
                          >
                            <span>Manage</span>
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-4 pt-5 border-t ${isDark ? "border-white/5" : "border-zinc-100"}`}
                >
                  <span
                    className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    Page <strong>{currentPage}</strong> of{" "}
                    <strong>{totalPages}</strong>
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
                          <span
                            key={`dots-${idx}`}
                            className={`px-2 py-1.5 text-xs font-bold select-none ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                          >
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
                          style={
                            isCurrent
                              ? { backgroundColor: accentColor, color: "#000" }
                              : {}
                          }
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
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
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
      <ModalMenu
        isOpen={isCreateOpen}
        onClose={closeModal}
        desktopMaxWidth="440px"
      >
        <div
          className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}
        >
          <h2
            className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            Create User Account
          </h2>
          <p
            className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Add a new user directly into the system database.
          </p>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label
                className={`block text-xs font-semibold mb-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className={`w-full rounded-lg border px-3.5 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-semibold mb-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="john_doe"
                className={`w-full rounded-lg border px-3.5 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-semibold mb-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3.5 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-semibold mb-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3.5 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            {modalError && (
              <div className="p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium">
                {modalError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                  isDark
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? (
                  <Loading width={16} height={16} color="#000000" />
                ) : (
                  "Create User"
                )}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
    </div>
  );
}
