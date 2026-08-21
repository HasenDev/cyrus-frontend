"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import { parseCredits } from "@/lib/misc/creditsParser";

interface VoucherItem {
  id: string;
  code: string;
  credits: number;
  maxUses: number;
  usesCount: number;
  expiresAt: string | null;
  createdAt: string;
}

type ModalMode = "none" | "create" | "edit" | "delete";

export default function AdminVouchersPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("none");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherItem | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState("100");
  const [maxUses, setMaxUses] = useState("0");
  const [expiryHours, setExpiryHours] = useState("0");
  const [clearExpiry, setClearExpiry] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };
  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let p1 = "",
      p2 = "";
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(`${p1}-${p2}`);
  };

  const fetchVouchers = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized: Token missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/vouchers", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError("Access Denied: Requires ADMIN_VOUCHERS permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to load vouchers.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch {
      setError("Network error occurred while fetching vouchers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const openCreateModal = () => {
    generateRandomCode();
    setCredits("100");
    setMaxUses("0");
    setExpiryHours("0");
    setClearExpiry(false);
    setModalError("");
    setModalMode("create");
  };

  const openEditModal = (voucher: VoucherItem) => {
    setSelectedVoucher(voucher);
    setCode(voucher.code);
    setCredits(String(voucher.credits));
    setMaxUses(String(voucher.maxUses));
    setExpiryHours("0");
    setClearExpiry(false);
    setModalError("");
    setModalMode("edit");
  };

  const openDeleteModal = (voucher: VoucherItem) => {
    setSelectedVoucher(voucher);
    setModalError("");
    setModalMode("delete");
  };

  const closeModal = () => {
    setModalMode("none");
    setSelectedVoucher(null);
    setCode("");
    setCredits("100");
    setMaxUses("0");
    setExpiryHours("0");
    setClearExpiry(false);
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
      const payload: any = {
        code,
        credits: parseInt(credits, 10),
        maxUses: parseInt(maxUses, 10),
        expiryHours: parseInt(expiryHours, 10),
      };

      if (isEdit && selectedVoucher) {
        payload.id = selectedVoucher.id;
        payload.clearExpiry = clearExpiry;
      }

      const res = await apiRequest("api/v1/admin/vouchers", {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to save voucher.");
        setModalLoading(false);
        return;
      }

      showToast(
        data.message || (isEdit ? "Voucher updated." : "Voucher created."),
      );
      closeModal();
      fetchVouchers();
    } catch {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVoucher) return;
    setModalLoading(true);
    setModalError("");

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing.");
      setModalLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/vouchers", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: selectedVoucher.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to delete voucher.");
        setModalLoading(false);
        return;
      }

      showToast("Voucher deleted successfully.");
      closeModal();
      fetchVouchers();
    } catch {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const ErrorIcon = () => (
    <svg
      className="h-4 w-4 shrink-0 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
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
    <div className="space-y-8 max-w-5xl mx-auto px-1 sm:px-0">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs font-bold backdrop-blur-md"
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
            Vouchers Management
          </h1>
          <p
            className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Create credit promo codes with custom usage caps and automatic
            expiration timers.
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
              className="h-4 w-4 shrink-0 text-black"
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
            <span>Create Voucher</span>
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
            isDark
              ? "border-white/[0.06] bg-[#0F1014]"
              : "border-zinc-200 bg-white"
          }`}
        >
          {vouchers.length === 0 ? (
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
                    d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12h5.25c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125H7.5a2.25 2.25 0 01-2.25-2.25V7.5A2.25 2.25 0 017.5 5.25zm9 0h1.5A2.25 2.25 0 0120.25 7.5v9a2.25 2.25 0 01-2.25 2.25H16.5"
                  />
                </svg>
              </div>
              <h3
                className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}
              >
                No vouchers created
              </h3>
              <p
                className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
              >
                Generate promo codes to distribute free credits to your users.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr
                    className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isDark
                        ? "border-white/10 text-zinc-400"
                        : "border-zinc-200 text-zinc-500"
                    }`}
                  >
                    <th className="pb-3 px-3 font-bold">Voucher Code</th>
                    <th className="pb-3 px-3 font-bold">Credits</th>
                    <th className="pb-3 px-3 font-bold">Redemptions</th>
                    <th className="pb-3 px-3 font-bold">Expiration</th>
                    <th className="pb-3 px-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}
                >
                  {vouchers.map((voucher) => {
                    const isExpired =
                      voucher.expiresAt &&
                      new Date(voucher.expiresAt).getTime() < Date.now();
                    const isMaxed =
                      voucher.maxUses > 0 &&
                      voucher.usesCount >= voucher.maxUses;

                    return (
                      <tr
                        key={voucher.id}
                        className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"}`}
                      >
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider border ${
                              isDark
                                ? "bg-white/[0.04] border-white/10 text-cyan-400"
                                : "bg-zinc-100 border-zinc-200 text-cyan-600"
                            }`}
                          >
                            {voucher.code}
                          </span>
                        </td>

                        <td
                          className={`py-3.5 px-3 text-xs font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}
                        >
                          +{parseCredits(voucher.credits)} Cr
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                          >
                            {voucher.usesCount} /{" "}
                            {voucher.maxUses === 0
                              ? "Unlimited"
                              : voucher.maxUses}
                          </span>
                          {isMaxed && (
                            <span className="ml-2 px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Fully Used
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {voucher.expiresAt ? (
                            <span
                              className={`text-xs font-medium ${
                                isExpired
                                  ? "text-rose-400"
                                  : isDark
                                    ? "text-zinc-400"
                                    : "text-zinc-600"
                              }`}
                            >
                              {isExpired
                                ? "Expired"
                                : new Date(voucher.expiresAt).toLocaleString()}
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                            >
                              Never
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(voucher)}
                              className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
                                isDark
                                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                  : "bg-zinc-200/70 text-zinc-700 hover:bg-zinc-200"
                              }`}
                              title="Edit Voucher"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(voucher)}
                              className="p-2 rounded-lg transition-colors text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                              title="Delete Voucher"
                            >
                              <svg
                                className="h-4 w-4"
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
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <ModalMenu
        isOpen={modalMode === "create" || modalMode === "edit"}
        onClose={closeModal}
        desktopMaxWidth="440px"
      >
        <div
          className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}
        >
          <h2
            className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            {modalMode === "edit" ? "Edit Voucher" : "Create New Voucher"}
          </h2>
          <p
            className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Configure promo code format, credit reward value, and redemption
            rules.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Voucher Code (Format: XXXX-XXXX)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. SAVE-2025"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className={`w-full sm:flex-1 rounded-lg border px-3.5 py-2.5 text-xs font-mono font-bold uppercase outline-none ${
                    isDark
                      ? "border-white/10 bg-[#07080a] text-white"
                      : "border-zinc-300 bg-zinc-50 text-zinc-900"
                  }`}
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className={`w-full sm:w-auto px-3.5 py-2.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                    isDark
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  }`}
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Credits Awarded
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="100"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900"
                }`}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Max Redemptions (0 = Unlimited)
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900"
                }`}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Set Expiration (Hours from now, 0 = No Expiry)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900"
                }`}
              />
            </div>

            {modalMode === "edit" && selectedVoucher?.expiresAt && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setClearExpiry(!clearExpiry)}
                  className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    clearExpiry
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : isDark
                        ? "bg-zinc-800/60 border-white/10 text-zinc-400 hover:text-zinc-200"
                        : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>Remove expiration date</span>
                  <span
                    className={`hidden min-[380px]:inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${
                      clearExpiry
                        ? "bg-rose-500 text-white"
                        : isDark
                          ? "bg-zinc-700 text-zinc-300"
                          : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {clearExpiry ? "Will Remove" : "Keep Date"}
                  </span>
                </button>
              </div>
            )}

            {modalError && (
              <div className="p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-3">
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
                disabled={modalLoading || !code.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? (
                  <Loading width={16} height={16} color="#000000" />
                ) : modalMode === "edit" ? (
                  "Save"
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu
        isOpen={modalMode === "delete"}
        onClose={closeModal}
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
                Delete Voucher
              </h2>
              <span className="text-xs text-rose-500 font-semibold">
                Irreversible Action
              </span>
            </div>
          </div>

          <p
            className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Are you sure you want to delete voucher code{" "}
            <strong
              className={`font-mono ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
            >
              {selectedVoucher?.code}
            </strong>
            ? Users will no longer be able to redeem this code.
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
                isDark
                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
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
              {modalLoading ? (
                <Loading width={16} height={16} color="#ffffff" />
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}
