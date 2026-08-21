"use client";

import React, { useState, useEffect, useCallback, FormEvent } from "react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import {
  UserPlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

export interface ServerUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  permissions: string[];
  isOwner: boolean;
  createdAt: number;
}

interface UsersProps {
  serverId: string;
  serverData: any;
  accentColor: string;
  userPermissions: string[];
  isOwner: boolean;
}

const PERMISSION_GROUPS = [
  {
    title: "Overview",
    prefix: "overview",
    permissions: [
      { key: "overview.power", label: "Power Actions", desc: "Start, restart, and stop the server" },
      { key: "overview.console", label: "Console Interaction", desc: "Send commands and read logs" }
    ]
  },
  {
    title: "File Management",
    prefix: "files",
    permissions: [
      { key: "files.create", label: "Create Files/Folders", desc: "Create new files and directories" },
      { key: "files.upload", label: "Upload Files", desc: "Upload files to server directory" },
      { key: "files.download", label: "Download Files", desc: "Download files and directories" },
      { key: "files.archiving", label: "Archiving", desc: "Compress and extract zip archives" },
      { key: "files.content", label: "Read Content", desc: "View file contents" },
      { key: "files.editfile", label: "Edit & Rename", desc: "Modify file contents and attributes" },
      { key: "files.move", label: "Move / Delete", desc: "Move, rename, or delete files" }
    ]
  },
  {
    title: "Network Allocations",
    prefix: "network",
    permissions: [
      { key: "network.view", label: "View Network", desc: "View assigned ports and IP addresses" },
      { key: "network.manage", label: "Manage Network", desc: "Assign, remove, and set primary port" }
    ]
  },
  {
    title: "Startup Configuration",
    prefix: "startup",
    permissions: [
      { key: "startup.view", label: "View Startup", desc: "View startup command and environment variables" },
      { key: "startup.manage", label: "Manage Startup", desc: "Edit startup variables and parameters" }
    ]
  },
  {
    title: "Sub-Users",
    prefix: "users",
    permissions: [
      { key: "users.view", label: "View Users", desc: "View server sub-users list" },
      { key: "users.add", label: "Add Users", desc: "Invite new sub-users" },
      { key: "users.edit", label: "Edit Permissions", desc: "Modify permissions of sub-users" },
      { key: "users.remove", label: "Remove Users", desc: "Revoke sub-user access" }
    ]
  },
  {
    title: "Settings",
    prefix: "settings",
    permissions: [
      { key: "settings.view", label: "View Settings", desc: "View server details and settings" },
      { key: "settings.change.info", label: "Rename / Edit Info", desc: "Update name and description" },
      { key: "settings.reinstall", label: "Reinstall Server", desc: "Trigger server re-installation" }
    ]
  },
  {
    title: "Payment & Activity",
    prefix: "misc",
    permissions: [
      { key: "payment.view", label: "View Payment", desc: "Check server plan and renewal status" },
      { key: "payment.manage", label: "Manage Payment", desc: "Ability to unsuspend service." },
      { key: "activity.view", label: "View Activity Logs", desc: "Audit server operations and events" }
    ]
  }
];

export default function UsersTab({ serverId, accentColor, userPermissions, isOwner }: UsersProps) {
  const isDark = config.theme === "dark";
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedUser, setSelectedUser] = useState<ServerUser | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ServerUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const canAdd = isOwner || userPermissions.includes("users.add");
  const canEdit = isOwner || userPermissions.includes("users.edit");
  const canRemove = isOwner || userPermissions.includes("users.remove");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getFullAvatarUrl = (avatarPath: string | null, id: string) => {
    if (!avatarPath) return `https://api.dicebear.com/7.x/identicon/svg?seed=${id}`;
    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) return avatarPath;
    const cleanBase = config.apiBaseUrl.endsWith("/") ? config.apiBaseUrl.slice(0, -1) : config.apiBaseUrl;
    const cleanPath = avatarPath.startsWith("/") ? avatarPath : `/${avatarPath}`;
    return `${cleanBase}${cleanPath}`;
  };

  const fetchUsers = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token || !serverId) return;

    setLoading(true);
    try {
      const res = await apiRequest(`api/v1/client/servers/${serverId}/users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load sub-users.");
        return;
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError("Network communication error.");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAddModal = () => {
    setModalMode("add");
    setSelectedUser(null);
    setEmailInput("");
    setSelectedPermissions([]);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (u: ServerUser) => {
    setModalMode("edit");
    setSelectedUser(u);
    setEmailInput(u.email);
    setSelectedPermissions([...u.permissions]);
    setModalError("");
    setIsModalOpen(true);
  };

  const openDeleteModal = (u: ServerUser) => {
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };
  const togglePermission = (permKey: string) => {
    if (!isOwner && !userPermissions.includes(permKey)) return;

    const parts = permKey.split(".");
    const category = parts[0];
    const isViewPerm = parts[1] === "view";

    setSelectedPermissions(prev => {
      const isCurrentlyChecked = prev.includes(permKey);
      if (isCurrentlyChecked && isViewPerm) {
        return prev.filter(p => !p.startsWith(`${category}.`));
      }
      if (isCurrentlyChecked && permKey === "files.content") {
        return prev.filter(p => p !== "files.content" && p !== "files.editfile");
      }
      if (isCurrentlyChecked) {
        return prev.filter(p => p !== permKey);
      }
      let next = [...prev, permKey];
      if (permKey === "files.editfile") {
        if (isOwner || userPermissions.includes("files.content")) {
          next.push("files.content");
        }
      }
      const viewKey = `${category}.view`;
      const categoryHasViewPerm = PERMISSION_GROUPS.some(g =>
        g.permissions.some(p => p.key === viewKey)
      );

      if (categoryHasViewPerm && !next.includes(viewKey)) {
        if (isOwner || userPermissions.includes(viewKey)) {
          next.push(viewKey);
        }
      }

      return Array.from(new Set(next));
    });
  };

  const toggleGroup = (groupPerms: string[]) => {
    const assignable = groupPerms.filter(p => isOwner || userPermissions.includes(p));
    const allSelected = assignable.every(p => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !assignable.includes(p)));
    } else {
      setSelectedPermissions(prev => {
        const merged = new Set([...prev, ...assignable]);
        if (merged.has("files.editfile") && (isOwner || userPermissions.includes("files.content"))) {
          merged.add("files.content");
        }
        return Array.from(merged);
      });
    }
  };

  const handleDeleteUserDirect = async (userId: string) => {
    const token = Cookies.get("token");
    try {
      const res = await apiRequest(`api/v1/client/servers/${serverId}/users`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to remove sub-user.");
        return;
      }

      showToast("Sub-user removed successfully.");
      fetchUsers();
    } catch {
      showToast("Network error occurred.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    await handleDeleteUserDirect(userToDelete.id);
    setDeleteLoading(false);
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalLoading(true);
    const token = Cookies.get("token");

    try {
      const finalPerms = [...selectedPermissions];
      if (finalPerms.includes("files.editfile") && !finalPerms.includes("files.content")) {
        finalPerms.push("files.content");
      }

      if (modalMode === "add") {
        if (finalPerms.length === 0) {
          setModalError("Please select at least one permission to grant to this user.");
          setModalLoading(false);
          return;
        }

        const res = await apiRequest(`api/v1/client/servers/${serverId}/users`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            email: emailInput,
            permissions: finalPerms
          })
        });

        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || "Failed to add sub-user.");
          setModalLoading(false);
          return;
        }

        showToast("Sub-user added successfully.");
      } else {
        if (!selectedUser) return;
        if (finalPerms.length === 0) {
          await handleDeleteUserDirect(selectedUser.id);
          setIsModalOpen(false);
          setModalLoading(false);
          return;
        }

        const res = await apiRequest(`api/v1/client/servers/${serverId}/users`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            userId: selectedUser.id,
            permissions: finalPerms
          })
        });

        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || "Failed to update permissions.");
          setModalLoading(false);
          return;
        }

        showToast("Permissions updated successfully.");
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch {
      setModalError("Network error occurred.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
          >
            <CheckIcon className="h-5 w-5 shrink-0 stroke-[2.5]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-lg font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            Sub-User Access Management
          </h2>
          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Grant teammates granular control over specific components and functions of this container.
          </p>
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={openAddModal}
            style={{ backgroundColor: accentColor }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            <UserPlusIcon className="w-4 h-4 text-black stroke-[2]" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loading width={32} height={32} color={accentColor} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {users.map(u => (
            <div
              key={u.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
              } shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <img
                  src={getFullAvatarUrl(u.avatarUrl, u.id)}
                  alt={u.username}
                  className="w-10 h-10 rounded-full object-cover shrink-0 bg-zinc-800 border border-white/5"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {u.username}
                    </span>
                  </div>
                  <span className={`text-[11px] block truncate ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    {u.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-start sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                {u.isOwner ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs font-semibold">
                    <ShieldCheckIcon className="w-4 h-4 stroke-[2]" />
                    <span>Owner Access</span>
                  </div>
                ) : (
                  <div className="flex flex-col min-[314px]:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    {canEdit && (
                      <button
                        onClick={() => openEditModal(u)}
                        className={`w-full min-[314px]:w-auto min-[314px]:flex-1 sm:flex-initial px-3 py-2 sm:p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isDark
                            ? "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                        }`}
                        title="Edit Permissions"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5 stroke-[2]" />
                        <span className="sm:hidden">Edit</span>
                      </button>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => openDeleteModal(u)}
                        className="w-full min-[314px]:w-auto min-[314px]:flex-1 sm:flex-initial px-3 py-2 sm:p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                        title="Remove User"
                      >
                        <TrashIcon className="w-3.5 h-3.5 stroke-[2]" />
                        <span className="sm:hidden">Remove</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ModalMenu isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} desktopMaxWidth="650px">
        <div className={`flex flex-col h-full max-h-[85vh] text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className="p-6 sm:p-7 pb-4 shrink-0 border-b border-white/[0.06]">
            <h2 className={`text-lg font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
              {modalMode === "add" ? "Add Sub-User" : "Edit Permissions"}
            </h2>
            <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {modalMode === "add"
                ? "Assign granular access permissions to an existing user via their registered email."
                : `Updating assigned permissions for ${selectedUser?.username} (${selectedUser?.email}).`}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
              {modalMode === "add" && (
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    User Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="collaborator@example.com"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all ${
                      isDark ? "border-white/10 bg-[#07080a] text-white focus:border-white/30" : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                    }`}
                  />
                </div>
              )}
              <div className="space-y-4">
                <span className={`block text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Assign Permissions
                </span>

                <div className="space-y-4">
                  {PERMISSION_GROUPS.map(group => {
                    const groupKeys = group.permissions.map(p => p.key);
                    const isFullyChecked = groupKeys.every(k => selectedPermissions.includes(k));

                    return (
                      <div
                        key={group.prefix}
                        className={`p-4 rounded-xl border ${isDark ? "border-white/[0.05] bg-zinc-950/40" : "border-zinc-200 bg-zinc-50/50"}`}
                      >
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.05]">
                          <span className={`text-xs font-bold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                            {group.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupKeys)}
                            className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200"
                          >
                            {isFullyChecked ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {group.permissions.map(perm => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            const isDisabled = !isOwner && !userPermissions.includes(perm.key);

                            return (
                              <div
                                key={perm.key}
                                onClick={() => !isDisabled && togglePermission(perm.key)}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all select-none ${
                                  isDisabled
                                    ? "opacity-30 cursor-not-allowed border-transparent"
                                    : isChecked
                                    ? "border-emerald-500/30 bg-emerald-500/5 cursor-pointer"
                                    : isDark
                                    ? "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer"
                                    : "border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border transition-all ${
                                    isChecked
                                      ? "bg-emerald-500 border-emerald-500 text-black"
                                      : isDark
                                      ? "border-white/20 bg-zinc-900"
                                      : "border-zinc-300 bg-white"
                                  }`}
                                >
                                  {isChecked && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <span className={`block text-xs font-bold leading-tight ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                                    {perm.label}
                                  </span>
                                  <span className={`block text-[10px] leading-snug truncate ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                                    {perm.desc}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {modalError && (
                <div className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl font-medium">
                  {modalError}
                </div>
              )}
            </div>
            <div className={`p-4 sm:p-6 shrink-0 border-t ${isDark ? "border-white/10 bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
              <div className="flex flex-col-reverse min-[320px]:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`w-full min-[320px]:w-1/2 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{ backgroundColor: accentColor }}
                  className="w-full min-[320px]:w-1/2 py-2.5 rounded-xl text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                >
                  {modalLoading ? (
                    <Loading width={16} height={16} color="#000000" />
                  ) : modalMode === "add" ? (
                    "Add Sub-User"
                  ) : selectedPermissions.length === 0 ? (
                    "Revoke Access"
                  ) : (
                    "Save Permissions"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={isDeleteModalOpen} onClose={closeDeleteModal} desktopMaxWidth="420px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Revoke User Access
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to remove <strong className={isDark ? "text-white" : "text-zinc-900"}>{userToDelete?.username}</strong> ({userToDelete?.email}) from this server? All permissions will be revoked immediately.
          </p>

          <div className="flex flex-col-reverse min-[320px]:flex-row gap-3">
            <button
              type="button"
              disabled={deleteLoading}
              onClick={closeDeleteModal}
              className={`w-full min-[320px]:w-1/2 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              className="w-full min-[320px]:w-1/2 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {deleteLoading ? <Loading width={16} height={16} color="#ffffff" /> : "Confirm Revoke"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}