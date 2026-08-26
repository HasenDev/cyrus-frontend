"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";

interface PanelSettings {
  panelName: string;
  panelDescription: string;
  panelIcon: string;
  websiteUrl: string;
  discordUrl: string;
  accentColor: string;
  recaptchaPublicKey: string;
  recaptchaSecretKey: string;
  recaptchaEnabled: boolean;
  resendApiKey: string;
  resendEnabled: boolean;
}

const COLOR_PRESETS = [
  "#00f2fe",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

export default function AdminSettingsPage() {
  const isDark = config.theme === "dark";
  const activeAccent = config.accentColor;
  const [panelName, setPanelName] = useState("");
  const [panelDescription, setPanelDescription] = useState("");
  const [panelIcon, setPanelIcon] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#00f2fe");
  const [recaptchaPublicKey, setRecaptchaPublicKey] = useState("");
  const [recaptchaSecretKey, setRecaptchaSecretKey] = useState("");
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendEnabled, setResendEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    async function fetchSettings() {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized: Token missing.");
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest("api/v1/admin/settings", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 403) {
          setError("Access Denied: You do not have the ADMIN_SETTINGS permission.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError("Failed to load settings from server.");
          setLoading(false);
          return;
        }

        const data: PanelSettings = await res.json();
        setPanelName(data.panelName || "");
        setPanelDescription(data.panelDescription || "");
        setPanelIcon(data.panelIcon || "");
        setWebsiteUrl(data.websiteUrl || "");
        setDiscordUrl(data.discordUrl || "");
        setAccentColor(data.accentColor || "#00f2fe");

        setRecaptchaPublicKey(data.recaptchaPublicKey || "");
        setRecaptchaSecretKey(data.recaptchaSecretKey || "");
        setRecaptchaEnabled(!!data.recaptchaEnabled);

        setResendApiKey(data.resendApiKey || "");
        setResendEnabled(!!data.resendEnabled);
      } catch (err) {
        setError("Network error occurred while fetching settings.");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSaveSettings = async (
    e: FormEvent,
    sectionKey: string,
    payload: Partial<PanelSettings>
  ) => {
    e.preventDefault();
    setSavingSection(sectionKey);

    const token = Cookies.get("token");
    if (!token) {
      showToast("Error: Missing authentication token.");
      setSavingSection(null);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(`Error: ${data.error || "Failed to update settings."}`);
        setSavingSection(null);
        return;
      }

      showToast(data.message || "Settings saved successfully.");
    } catch (err) {
      showToast("Error: Network failure.");
    } finally {
      setSavingSection(null);
    }
  };

  const ToggleSwitch = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none ${
        enabled
          ? "bg-emerald-500"
          : isDark
          ? "bg-zinc-800 border border-white/10"
          : "bg-zinc-300 border border-zinc-300"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ${
          enabled ? "ml-5" : "ml-0"
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
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
      <div>
        <h1 className={`text-3xl font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
          Admin Settings
        </h1>
        <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Configure global system parameters, security verification, and email integrations.
        </p>
      </div>
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      <div
        className={`rounded-2xl border p-6 sm:p-7 shadow-sm transition-colors ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div
          className={`border-b pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            isDark ? "border-white/[0.06]" : "border-zinc-200"
          }`}
        >
          <div>
            <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Panel Information
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Branding metadata and accent color theme displayed across the application.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) =>
            handleSaveSettings(e, "panelInfo", {
              panelName,
              panelDescription,
              panelIcon,
              websiteUrl,
              discordUrl,
              accentColor,
            })
          }
        >
          <div className="space-y-5 mb-6">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Panel Name
              </label>
              <input
                type="text"
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                placeholder="e.g. Cyrus Panel"
                required
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Panel Description
              </label>
              <textarea
                value={panelDescription}
                onChange={(e) => setPanelDescription(e.target.value)}
                placeholder="Brief description of your service infrastructure..."
                rows={3}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Panel Icon URL
              </label>
              <input
                type="url"
                value={panelIcon}
                onChange={(e) => setPanelIcon(e.target.value)}
                placeholder="https://example.com/logo.png"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Discord Support Server URL
              </label>
              <input
                type="url"
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
                placeholder="https://discord.gg/yourserver"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                System Accent Color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/20 cursor-pointer shadow-sm">
                  <input
                    type="color"
                    value={accentColor.startsWith("#") ? accentColor : "#00f2fe"}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute -top-2 -left-2 h-14 w-14 cursor-pointer border-0 p-0"
                  />
                </div>
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#00f2fe"
                  className={`w-32 rounded-lg border px-3 py-2 text-xs font-mono font-bold uppercase outline-none transition-all ${
                    isDark
                      ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                      : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-1.5 pl-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      className={`h-6 w-6 rounded-full transition-transform border ${
                        accentColor.toLowerCase() === color.toLowerCase()
                          ? "scale-110 border-white ring-2 ring-white/30"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSection === "panelInfo"}
            style={{ backgroundColor: accentColor }}
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-black transition-all hover:opacity-90 disabled:opacity-50 shadow-sm flex items-center gap-2"
          >
            {savingSection === "panelInfo" ? (
              <>
                <Loading width={16} height={16} color="#000000" />
                <span>Saving Information...</span>
              </>
            ) : (
              "Save Panel Info"
            )}
          </button>
        </form>
      </div>
      <div
        className={`rounded-2xl border p-6 sm:p-7 shadow-sm transition-colors ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div
          className={`border-b pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? "border-white/[0.06]" : "border-zinc-200"
          }`}
        >
          <div>
            <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Verification Table
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              reCAPTCHA security keys to prevent automated bot registrations.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1 sm:pt-0">
            <span className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              {recaptchaEnabled ? "Enabled" : "Disabled"}
            </span>
            <ToggleSwitch enabled={recaptchaEnabled} onChange={setRecaptchaEnabled} />
          </div>
        </div>

        <form
          onSubmit={(e) =>
            handleSaveSettings(e, "verification", {
              recaptchaPublicKey,
              recaptchaSecretKey,
              recaptchaEnabled,
            })
          }
        >
          <div className="grid gap-5 sm:grid-cols-2 mb-6">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                reCAPTCHA Public Key
              </label>
              <input
                type="text"
                value={recaptchaPublicKey}
                onChange={(e) => setRecaptchaPublicKey(e.target.value)}
                placeholder="Site key (e.g. 6L...)"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                reCAPTCHA Secret Key
              </label>
              <input
                type="password"
                value={recaptchaSecretKey}
                onChange={(e) => setRecaptchaSecretKey(e.target.value)}
                placeholder="Secret key"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                  isDark
                    ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                    : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSection === "verification"}
            style={{ backgroundColor: accentColor }}
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-black transition-all hover:opacity-90 disabled:opacity-50 shadow-sm flex items-center gap-2"
          >
            {savingSection === "verification" ? (
              <>
                <Loading width={16} height={16} color="#000000" />
                <span>Saving Verification...</span>
              </>
            ) : (
              "Save Verification Settings"
            )}
          </button>
        </form>
      </div>
      <div
        className={`rounded-2xl border p-6 sm:p-7 shadow-sm transition-colors ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div
          className={`border-b pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? "border-white/[0.06]" : "border-zinc-200"
          }`}
        >
          <div>
            <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Email Verification
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Transactional email setup using the Resend email service platform.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1 sm:pt-0">
            <span className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              {resendEnabled ? "Enabled" : "Disabled"}
            </span>
            <ToggleSwitch enabled={resendEnabled} onChange={setResendEnabled} />
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border mb-6 flex items-start gap-3 text-xs ${
            isDark
              ? "bg-black/30 border-white/[0.04] text-zinc-300"
              : "bg-zinc-50 border-zinc-200 text-zinc-700"
          }`}
        >
          <svg className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className={`font-bold block mb-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>Free Emailing Integration</span>
            Email verification relies on <strong className="text-cyan-400">Resend</strong>. You can sign up for a free API key at{" "}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-cyan-400">
              resend.com
            </a>{" "}
            to enable transactional user verification emails.
          </div>
        </div>

        <form onSubmit={(e) => handleSaveSettings(e, "email", { resendApiKey, resendEnabled })}>
          <div className="mb-6">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Resend API Key
            </label>
            <input
              type="password"
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              placeholder="re_123456789..."
              className={`w-full rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                isDark
                  ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                  : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={savingSection === "email"}
            style={{ backgroundColor: accentColor }}
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-black transition-all hover:opacity-90 disabled:opacity-50 shadow-sm flex items-center gap-2"
          >
            {savingSection === "email" ? (
              <>
                <Loading width={16} height={16} color="#000000" />
                <span>Saving Email Settings...</span>
              </>
            ) : (
              "Save Email Settings"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
