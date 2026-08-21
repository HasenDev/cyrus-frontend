"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Loading from "@/components/Base/Loading";
import MDHandler from "@/components/Design/MDHandler";
import ModalMenu from "@/components/Base/ModalMenu";
import { config, apiRequest } from "@/lib/main";
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function AdminLegalPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [customEnabled, setCustomEnabled] = useState(false);
  const [tos, setTos] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [initialTos, setInitialTos] = useState("");
  const [initialPrivacy, setInitialPrivacy] = useState("");
  const [tosUpdatedAt, setTosUpdatedAt] = useState<number | null>(null);
  const [privacyUpdatedAt, setPrivacyUpdatedAt] = useState<number | null>(null);

  const [showTosPreview, setShowTosPreview] = useState(false);
  const [showPrivacyPreview, setShowPrivacyPreview] = useState(false);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"tos" | "privacy" | "toggle" | null>(null);

  const fetchLegalSettings = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/legal", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load legal page settings.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setCustomEnabled(Boolean(data.enabled));
      setTos(data.tos || "");
      setPrivacy(data.privacy || "");
      setInitialTos(data.tos || "");
      setInitialPrivacy(data.privacy || "");
      setTosUpdatedAt(data.tosUpdatedAt || null);
      setPrivacyUpdatedAt(data.privacyUpdatedAt || null);
    } catch {
      setError("Network error occurred while loading legal settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalSettings();
  }, []);

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Never updated";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const openConfirmation = (action: "tos" | "privacy" | "toggle") => {
    setError(null);
    setSuccessMessage(null);
    setPendingAction(action);
    setConfirmModalOpen(true);
  };

  const handleExecuteSave = async () => {
    const token = Cookies.get("token");
    if (!token || !pendingAction) return;

    setSubmitting(true);
    setError(null);

    const payload: {
      enabled?: boolean;
      tos?: string;
      privacy?: string;
    } = {};

    if (pendingAction === "toggle") {
      payload.enabled = !customEnabled;
    } else if (pendingAction === "tos") {
      payload.tos = tos;
    } else if (pendingAction === "privacy") {
      payload.privacy = privacy;
    }

    try {
      const res = await apiRequest("api/v1/admin/legal", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update legal settings.");
        setSubmitting(false);
        setConfirmModalOpen(false);
        return;
      }

      setCustomEnabled(Boolean(data.enabled));
      setTos(data.tos || "");
      setPrivacy(data.privacy || "");
      setInitialTos(data.tos || "");
      setInitialPrivacy(data.privacy || "");
      setTosUpdatedAt(data.tosUpdatedAt || null);
      setPrivacyUpdatedAt(data.privacyUpdatedAt || null);

      if (pendingAction === "toggle") {
        setSuccessMessage(`Legal customization has been ${!customEnabled ? "enabled" : "disabled"} successfully.`);
      } else if (pendingAction === "tos") {
        setSuccessMessage("Terms of Service updated successfully.");
      } else if (pendingAction === "privacy") {
        setSuccessMessage("Privacy Policy updated successfully.");
      }

      setConfirmModalOpen(false);
      setPendingAction(null);
    } catch {
      setError("Network error occurred while saving changes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  const isTosChanged = tos !== initialTos;
  const isPrivacyChanged = privacy !== initialPrivacy;

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-1 sm:px-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            Legal Customization
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Customize Terms of Service and Privacy Policy markdown documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 pt-0.5 sm:pt-0">
          <button
            type="button"
            onClick={() => openConfirmation("toggle")}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
              customEnabled ? "bg-emerald-500" : isDark ? "bg-zinc-800" : "bg-zinc-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                customEnabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs rounded-xl font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {!customEnabled && (
        <div className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
          isDark ? "bg-amber-500/[0.04] border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <ShieldCheckIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div className="space-y-1 text-xs">
            <p className="font-bold">Default Legal Pages Active</p>
            <p className="opacity-90 leading-relaxed">
              Legal customization is currently turned off. The panel will automatically fallback to using its standard built-in Terms of Service and Privacy Policy pages. Toggle the switch above to activate custom markdown configurations.
            </p>
          </div>
        </div>
      )}

      <div className={`space-y-6 transition-opacity ${!customEnabled ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
        <div className={`p-6 rounded-2xl border space-y-5 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/10">
            <div>
              <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Terms of Service
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>Last updated: {formatDate(tosUpdatedAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTosPreview(!showTosPreview)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                }`}
              >
                {showTosPreview ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                <span>{showTosPreview ? "Editor Mode" : "Live Preview"}</span>
              </button>
            </div>
          </div>

          <div>
            {!showTosPreview ? (
              <textarea
                rows={12}
                placeholder="Write your custom Terms of Service in Markdown format..."
                value={tos}
                onChange={(e) => setTos(e.target.value)}
                className={`w-full font-mono text-xs rounded-xl border p-4 outline-none leading-relaxed resize-y ${
                  isDark ? "border-white/10 bg-[#07080a] text-zinc-200 focus:border-white/20" : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            ) : (
              <div className={`p-5 rounded-2xl border min-h-[280px] ${isDark ? "border-white/10 bg-[#07080a]" : "border-zinc-300 bg-zinc-50"}`}>
                {tos.trim() ? (
                  <MDHandler content={tos} />
                ) : (
                  <span className="text-xs text-zinc-500 italic">No Terms of Service markdown typed yet.</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col min-[470px]:flex-row min-[470px]:items-center justify-between gap-3 pt-2">
            <span className={`text-[11px] ${isTosChanged ? "text-amber-400 font-semibold" : "text-zinc-500"}`}>
              {isTosChanged ? "Unsaved changes detected" : "Document synchronized"}
            </span>

            <button
              type="button"
              disabled={submitting || !isTosChanged}
              onClick={() => openConfirmation("tos")}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full min-[470px]:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span>Save</span>
            </button>
          </div>
        </div>

        <div className={`p-6 rounded-2xl border space-y-5 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/10">
            <div>
              <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Privacy Policy
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>Last updated: {formatDate(privacyUpdatedAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrivacyPreview(!showPrivacyPreview)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                }`}
              >
                {showPrivacyPreview ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                <span>{showPrivacyPreview ? "Editor Mode" : "Live Preview"}</span>
              </button>
            </div>
          </div>

          <div>
            {!showPrivacyPreview ? (
              <textarea
                rows={12}
                placeholder="Write your custom Privacy Policy in Markdown format..."
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className={`w-full font-mono text-xs rounded-xl border p-4 outline-none leading-relaxed resize-y ${
                  isDark ? "border-white/10 bg-[#07080a] text-zinc-200 focus:border-white/20" : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            ) : (
              <div className={`p-5 rounded-2xl border min-h-[280px] ${isDark ? "border-white/10 bg-[#07080a]" : "border-zinc-300 bg-zinc-50"}`}>
                {privacy.trim() ? (
                  <MDHandler content={privacy} />
                ) : (
                  <span className="text-xs text-zinc-500 italic">No Privacy Policy markdown typed yet.</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col min-[470px]:flex-row min-[470px]:items-center justify-between gap-3 pt-2">
            <span className={`text-[11px] ${isPrivacyChanged ? "text-amber-400 font-semibold" : "text-zinc-500"}`}>
              {isPrivacyChanged ? "Unsaved changes detected" : "Document synchronized"}
            </span>

            <button
              type="button"
              disabled={submitting || !isPrivacyChanged}
              onClick={() => openConfirmation("privacy")}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full min-[470px]:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      <ModalMenu isOpen={confirmModalOpen} onClose={() => !submitting && setConfirmModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-500">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <ExclamationTriangleIcon className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Confirm Legal Document Update
              </h3>
              <p className="text-xs text-zinc-500">
                Action requires attention to user agreement obligations.
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
            isDark ? "bg-amber-500/[0.04] border-amber-500/20 text-zinc-300" : "bg-amber-50 border-amber-200 text-zinc-700"
          }`}>
            {pendingAction === "toggle" ? (
              <p>
                Are you sure you want to <strong>{customEnabled ? "disable" : "enable"}</strong> custom legal documents?
                {!customEnabled && " When enabled, the custom markdown will take effect for all registered and new users."}
              </p>
            ) : (
              <p>
                Are you sure you want to perform this action? If the content of any legal document is modified, <strong>all registered users will be required to review and agree to the updated legal terms</strong> upon their next activity before accessing their dashboard.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setConfirmModalOpen(false)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleExecuteSave}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm flex items-center justify-center"
            >
              {submitting ? <Loading width={16} height={16} color="#000000" /> : "Confirm & Save"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}