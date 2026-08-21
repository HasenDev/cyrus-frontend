"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/components/Base/Loading";
import ModalMenu from "@/components/Base/ModalMenu";
import { config, apiRequest } from "@/lib/main";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MegaphoneIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";

interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  image: string | null;
  createdAt: string;
}

function getBannerUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }
  const baseUrl = config.apiBaseUrl.endsWith("/")
    ? config.apiBaseUrl.slice(0, -1)
    : config.apiBaseUrl;
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
}

export default function AdminAnnouncementsListingPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalAnn, setDeleteModalAnn] = useState<AnnouncementItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchAnnouncements = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/announcements", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError("Access Denied: Requires ADMIN_ANNOUNCEMENTS permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to load announcements.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleDelete = async () => {
    if (!deleteModalAnn) return;

    setDeletingId(deleteModalAnn.id);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/announcements", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: deleteModalAnn.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to delete announcement.");
        return;
      }

      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteModalAnn.id));
      showToast("Announcement deleted successfully.");
      setDeleteModalAnn(null);
    } catch {
      showToast("Network error occurred while deleting.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-1 sm:px-0">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs font-bold backdrop-blur-md"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <ModalMenu isOpen={!!deleteModalAnn} onClose={() => setDeleteModalAnn(null)} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
              <TrashIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Delete Announcement
              </h2>
              <span className="text-xs text-rose-500 font-semibold">Irreversible Action</span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete{" "}
            <strong className={isDark ? "text-white" : "text-zinc-900"}>
              "{deleteModalAnn?.title}"
            </strong>? This broadcast notice will be permanently removed.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalAnn(null)}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingId === deleteModalAnn?.id}
              onClick={handleDelete}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all active:scale-[0.98] shadow-md disabled:opacity-50"
            >
              {deletingId === deleteModalAnn?.id ? (
                <Loading width={16} height={16} color="#ffffff" />
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </ModalMenu>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Announcements
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Create and broadcast system news, alerts, and feature updates to all users.
          </p>
        </div>

        {!error && (
          <Link
            href="/home/admin/announcements/add"
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <PlusIcon className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span>Create Announcement</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {!error && (
        <>
          {announcements.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
              <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 mb-3 text-cyan-400">
                <MegaphoneIcon className="h-8 w-8" />
              </div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>No publishes yet.</h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Broadcast system notifications, news, or updates to keep your users informed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((ann) => {
                const bannerUrl = getBannerUrl(ann.image);
                return (
                  <div
                    key={ann.id}
                    className={`flex flex-col justify-between rounded-2xl border overflow-hidden shadow-sm transition-all hover:border-white/20 ${
                      isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div>
                      {bannerUrl ? (
                        <div className="relative h-40 w-full overflow-hidden bg-zinc-900 border-b border-white/5">
                          <img
                            src={bannerUrl}
                            alt={ann.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`h-40 w-full flex items-center justify-center border-b ${isDark ? "bg-zinc-900/50 border-white/5 text-zinc-700" : "bg-zinc-100 border-zinc-200 text-zinc-300"}`}>
                          <PhotoIcon className="h-8 w-8" />
                        </div>
                      )}

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: accentColor }}>
                            System Notice
                          </span>
                          <span className={`text-[10px] font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                            {new Date(ann.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className={`text-base font-bold line-clamp-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
                          {ann.title}
                        </h3>
                      </div>
                    </div>
                    <div className={`p-4 border-t flex items-center justify-between gap-2 ${isDark ? "border-white/5 bg-white/[0.01]" : "border-zinc-100 bg-zinc-50/50"}`}>
                      <Link
                        href={`/home/admin/announcements/manage?ann_id=${ann.id}`}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isDark ? "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200" : "bg-zinc-200 hover:bg-zinc-300 text-zinc-800"
                        }`}
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setDeleteModalAnn(ann)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                        title="Delete Announcement"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}