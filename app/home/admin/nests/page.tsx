"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";

interface NestItem {
  id: string;
  name: string;
  eggCount: number;
  createdAt?: string;
}

type ModalMode = "none" | "create" | "edit" | "delete";

export default function AdminNestsPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;

  const [nests, setNests] = useState<NestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("none");
  const [selectedNest, setSelectedNest] = useState<NestItem | null>(null);
  const [nestName, setNestName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchNests = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized: Token missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/nests", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError("Access Denied: You do not have the ADMIN_NESTS permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to load nests.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setNests(data.nests || []);
    } catch (err) {
      setError("Network error occurred while fetching nests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNests();
  }, []);

  const openCreateModal = () => {
    setNestName("");
    setModalError("");
    setModalMode("create");
  };

  const openEditModal = (nest: NestItem) => {
    setSelectedNest(nest);
    setNestName(nest.name);
    setModalError("");
    setModalMode("edit");
  };

  const openDeleteModal = (nest: NestItem) => {
    setSelectedNest(nest);
    setModalError("");
    setModalMode("delete");
  };

  const closeModal = () => {
    setModalMode("none");
    setSelectedNest(null);
    setNestName("");
    setModalError("");
    setModalLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalLoading(true);

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing.");
      setModalLoading(false);
      return;
    }

    try {
      const isEdit = modalMode === "edit";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit
        ? { id: selectedNest?.id, name: nestName }
        : { name: nestName };

      const res = await apiRequest("api/v1/admin/nests", {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to save nest.");
        setModalLoading(false);
        return;
      }

      showToast(data.message || (isEdit ? "Nest updated." : "Nest created."));
      closeModal();
      fetchNests();
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNest) return;
    setModalLoading(true);
    setModalError("");

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing.");
      setModalLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/nests", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: selectedNest.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to delete nest.");
        setModalLoading(false);
        return;
      }

      showToast("Nest and associated eggs deleted successfully.");
      closeModal();
      fetchNests();
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const ErrorIcon = () => (
    <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-1 sm:px-0">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Nests Management
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Group service configurations and server templates into structured application categories.
          </p>
        </div>

        {!error && (
          <button
            type="button"
            onClick={openCreateModal}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            <svg className="h-4 w-4 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Nest</span>
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
          className={`rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors overflow-hidden ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          {nests.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                No nests available
              </h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Create your first nest to begin organizing Docker egg templates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[320px]">
                <thead>
                  <tr
                    className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"
                    }`}
                  >
                    <th className="pb-3 px-3 font-bold">Nest Name</th>
                    <th className="pb-3 px-3 font-bold">Identifier</th>
                    <th className="pb-3 px-3 font-bold">Total Eggs</th>
                    <th className="pb-3 px-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                  {nests.map((nest) => (
                    <tr
                      key={nest.id}
                      className={`transition-colors ${
                        isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/home/admin/nests/manage?id=${nest.id}`}
                          className={`text-xs font-bold hover:underline ${
                            isDark ? "text-white" : "text-zinc-900"
                          }`}
                        >
                          {nest.name}
                        </Link>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                            isDark
                              ? "bg-[#07080a] border-white/5 text-zinc-400"
                              : "bg-zinc-100 border-zinc-200 text-zinc-600"
                          }`}
                        >
                          {nest.id}
                        </span>
                      </td>

                      <td className={`py-3.5 px-3 text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        {nest.eggCount} {nest.eggCount === 1 ? "Egg" : "Eggs"}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/home/admin/nests/manage?id=${nest.id}`}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              isDark
                                ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                            }`}
                          >
                            <span className="sm:hidden">Manage</span>
                            <span className="hidden sm:inline">Manage Eggs</span>
                            <svg className="hidden sm:block h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>

                          <button
                            type="button"
                            onClick={() => openEditModal(nest)}
                            className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
                              isDark
                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                : "bg-zinc-200/70 text-zinc-700 hover:bg-zinc-200"
                            }`}
                            title="Edit Nest"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(nest)}
                            className="p-2 rounded-lg transition-colors text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            title="Delete Nest"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <ModalMenu isOpen={modalMode === "create" || modalMode === "edit"} onClose={closeModal} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            {modalMode === "edit" ? "Edit Nest Name" : "Add New Nest"}
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Nests group related egg configurations (e.g. Languages, Voice Servers).
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Nest Name
              </label>
              <input
                type="text"
                value={nestName}
                onChange={(e) => setNestName(e.target.value)}
                placeholder="e.g. Languages or Game Servers"
                required
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading || !nestName.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : modalMode === "edit" ? "Save Changes" : "Create Nest"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={modalMode === "delete"} onClose={closeModal} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Delete Nest
              </h2>
              <span className="text-xs text-rose-500 font-semibold">Irreversible Action</span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Deleting{" "}
            <strong className={isDark ? "text-white" : "text-zinc-900"}>
              {selectedNest?.name}
            </strong>{" "}
            will also delete all eggs configured inside this nest.
          </p>

          {modalError && (
            <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
              <ErrorIcon />
              <span>{modalError}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeModal}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={modalLoading}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all active:scale-[0.98] shadow-md disabled:opacity-50"
            >
              {modalLoading ? <Loading width={16} height={16} color="#ffffff" /> : "Delete Nest"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}