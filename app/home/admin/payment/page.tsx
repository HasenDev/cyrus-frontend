"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "@/components/Base/Loading";
import SaveBar from "@/components/Base/SaveBar";
import { config, apiRequest } from "@/lib/main";
import {
  CreditCardIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ServerIcon,
  CommandLineIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

interface PaymentSettings {
  paymentsEnabled: boolean;
  providerOxapayEnabled: boolean;
  oxaPayApiKey: string;
  providerApiCallbackEnabled: boolean;
  apiCallbackKey: string;
  externalCreditsStoreUrl?: string;
  creditsPricePer10: string;
  defaultMaxDeployments: string;
}

export default function AdminPaymentPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const [initialSettings, setInitialSettings] = useState<PaymentSettings | null>(null);

  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [providerOxapayEnabled, setProviderOxapayEnabled] = useState(false);
  const [oxaPayApiKey, setOxaPayApiKey] = useState("");
  const [providerApiCallbackEnabled, setProviderApiCallbackEnabled] = useState(false);
  const [apiCallbackKey, setApiCallbackKey] = useState("");
  const [externalCreditsStoreUrl, setExternalCreditsStoreUrl] = useState("");
  const [creditsPricePer10, setCreditsPricePer10] = useState("0.20");
  const [defaultMaxDeployments, setDefaultMaxDeployments] = useState("10");

  const [showOxaPayKey, setShowOxaPayKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [oxaPayHasError, setOxaPayHasError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showSuccessToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const generateRandomKey = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "pk_live_";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    async function fetchPaymentSettings() {
      const token = Cookies.get("token");
      if (!token) {
        setFormError("Unauthorized: Token missing.");
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest("api/v1/admin/payment", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 403) {
          setFormError("Access Denied: Requires ADMIN_PAYMENT permission.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setFormError("Failed to load payment settings.");
          setLoading(false);
          return;
        }

        const data: PaymentSettings = await res.json();
        const loadedSettings: PaymentSettings = {
          paymentsEnabled: !!data.paymentsEnabled,
          providerOxapayEnabled: !!data.providerOxapayEnabled,
          oxaPayApiKey: data.oxaPayApiKey || "",
          providerApiCallbackEnabled: !!data.providerApiCallbackEnabled,
          apiCallbackKey: data.apiCallbackKey || generateRandomKey(),
          externalCreditsStoreUrl: data.externalCreditsStoreUrl || "",
          creditsPricePer10: data.creditsPricePer10 || "0.20",
          defaultMaxDeployments: data.defaultMaxDeployments || "10",
        };

        setInitialSettings(loadedSettings);
        setPaymentsEnabled(loadedSettings.paymentsEnabled);
        setProviderOxapayEnabled(loadedSettings.providerOxapayEnabled);
        setOxaPayApiKey(loadedSettings.oxaPayApiKey);
        setProviderApiCallbackEnabled(loadedSettings.providerApiCallbackEnabled);
        setApiCallbackKey(loadedSettings.apiCallbackKey);
        setExternalCreditsStoreUrl(loadedSettings.externalCreditsStoreUrl || "");
        setCreditsPricePer10(loadedSettings.creditsPricePer10);
        setDefaultMaxDeployments(loadedSettings.defaultMaxDeployments);
      } catch {
        setFormError("Network error occurred while fetching payment settings.");
      } finally {
        setLoading(false);
      }
    }

    fetchPaymentSettings();
  }, []);

  const handleToggleApiCallback = (enabled: boolean) => {
    setProviderApiCallbackEnabled(enabled);
    if (enabled && !apiCallbackKey) {
      setApiCallbackKey(generateRandomKey());
    }
  };

  const handleRegenerateApiKey = () => {
    setApiCallbackKey(generateRandomKey());
  };

  const handleReset = () => {
    if (!initialSettings) return;
    setPaymentsEnabled(initialSettings.paymentsEnabled);
    setProviderOxapayEnabled(initialSettings.providerOxapayEnabled);
    setOxaPayApiKey(initialSettings.oxaPayApiKey);
    setProviderApiCallbackEnabled(initialSettings.providerApiCallbackEnabled);
    setApiCallbackKey(initialSettings.apiCallbackKey);
    setExternalCreditsStoreUrl(initialSettings.externalCreditsStoreUrl || "");
    setCreditsPricePer10(initialSettings.creditsPricePer10);
    setDefaultMaxDeployments(initialSettings.defaultMaxDeployments);
    setFormError(null);
    setOxaPayHasError(false);
  };

  const handleSaveSettings = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFormError(null);
    setOxaPayHasError(false);

    if (providerOxapayEnabled && !oxaPayApiKey.trim()) {
      setOxaPayHasError(true);
      setFormError("An OxaPay Merchant API key is required when OxaPay is enabled.");
      setSaving(false);
      return;
    }

    if (providerApiCallbackEnabled && !apiCallbackKey.trim()) {
      setFormError("An API Key is required when API Callback is enabled.");
      setSaving(false);
      return;
    }

    if (externalCreditsStoreUrl.trim()) {
      try {
        const parsed = new URL(externalCreditsStoreUrl.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          setFormError("External Credits Store URL must start with http:// or https://");
          setSaving(false);
          return;
        }
      } catch {
        setFormError("Please enter a valid External Credits Store URL.");
        setSaving(false);
        return;
      }
    }

    const token = Cookies.get("token");
    if (!token) {
      setFormError("Authentication token missing.");
      setSaving(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/payment", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          paymentsEnabled,
          providerOxapayEnabled,
          oxaPayApiKey,
          providerApiCallbackEnabled,
          apiCallbackKey,
          externalCreditsStoreUrl: externalCreditsStoreUrl.trim(),
          creditsPricePer10: parseFloat(creditsPricePer10),
          defaultMaxDeployments: parseInt(defaultMaxDeployments, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.toLowerCase().includes("oxapay")) {
          setOxaPayHasError(true);
        }
        setFormError(data.error || "Failed to save settings.");
        setSaving(false);
        return;
      }

      setInitialSettings({
        paymentsEnabled,
        providerOxapayEnabled,
        oxaPayApiKey,
        providerApiCallbackEnabled,
        apiCallbackKey,
        externalCreditsStoreUrl: externalCreditsStoreUrl.trim(),
        creditsPricePer10,
        defaultMaxDeployments,
      });

      showSuccessToast("Saved changes!");
    } catch {
      setFormError("Network failure occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges =
    initialSettings !== null &&
    (paymentsEnabled !== initialSettings.paymentsEnabled ||
      providerOxapayEnabled !== initialSettings.providerOxapayEnabled ||
      oxaPayApiKey !== initialSettings.oxaPayApiKey ||
      providerApiCallbackEnabled !== initialSettings.providerApiCallbackEnabled ||
      apiCallbackKey !== initialSettings.apiCallbackKey ||
      externalCreditsStoreUrl !== (initialSettings.externalCreditsStoreUrl || "") ||
      creditsPricePer10 !== initialSettings.creditsPricePer10 ||
      defaultMaxDeployments !== initialSettings.defaultMaxDeployments);

  const apiBaseFormatted = config.apiBaseUrl.endsWith("/")
    ? config.apiBaseUrl
    : `${config.apiBaseUrl}/`;
  const fullEndpointUrl = `${apiBaseFormatted}api/v1/payment/add-credits`;

  const curlSnippet = `curl -X POST "${fullEndpointUrl}" \\
  -H "Authorization: Bearer ${apiCallbackKey || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "identifier": "(email/username/userID)",
    "amount": 20
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
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

  const parsedRate = parseFloat(creditsPricePer10) || 0.20;
  const creditsPerDollar = Math.floor(10 / parsedRate);

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-1 sm:px-0">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold backdrop-blur-md bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          >
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className={`text-3xl font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
          Payment & Deployment Settings
        </h1>
        <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Manage automated payment gateways, custom API callbacks, credit pricing, and deployment limits.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        <div
          className={`rounded-2xl border p-6 sm:p-7 shadow-sm transition-colors ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Global Payment System
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Enable or disable credit top-ups and automated checkout systems across the panel.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
              <span className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                {paymentsEnabled ? "Enabled" : "Disabled"}
              </span>
              <ToggleSwitch enabled={paymentsEnabled} onChange={setPaymentsEnabled} />
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-6 sm:p-7 shadow-sm transition-colors ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          <div className={`border-b pb-4 mb-6 ${isDark ? "border-white/[0.06]" : "border-zinc-200"}`}>
            <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Default Server Deployments Limit
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Configure the default maximum number of active server instances each user account can deploy.
            </p>
          </div>

          <div className="space-y-3">
            <label className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Max Deployments Per User
            </label>

            <div className="relative flex items-center max-w-xs">
              <ServerIcon className="w-5 h-5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                type="number"
                min="1"
                max="500"
                required
                value={defaultMaxDeployments}
                onChange={(e) => setDefaultMaxDeployments(e.target.value)}
                placeholder="10"
                className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs font-mono outline-none ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Each standard user will be allowed up to <strong className="text-cyan-400">{parseInt(defaultMaxDeployments, 10) || 10} active servers</strong> by default.
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-6 sm:p-7 shadow-sm transition-colors ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          <div className={`border-b pb-4 mb-6 ${isDark ? "border-white/[0.06]" : "border-zinc-200"}`}>
            <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Credit Pricing Rate
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Define the price per 10 credits in USD to calculate credit yields on checkout.
            </p>
          </div>

          <div className="space-y-3">
            <label className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Price per 10 Credits (USD)
            </label>

            <div className="relative flex items-center max-w-xs">
              <CurrencyDollarIcon className="w-5 h-5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={creditsPricePer10}
                onChange={(e) => setCreditsPricePer10(e.target.value)}
                placeholder="0.20"
                className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs font-mono outline-none ${
                  isDark
                    ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                    : "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-400"
                }`}
              />
            </div>

            <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Yield Rate: <strong className="text-emerald-400">${parsedRate.toFixed(2)} USD = 10 Credits</strong> (or <strong style={{ color: accentColor }}>${1.00.toFixed(2)} USD = {creditsPerDollar} Credits</strong>).
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-6 sm:p-7 shadow-sm transition-colors ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          <div className={`border-b pb-4 mb-6 ${isDark ? "border-white/[0.06]" : "border-zinc-200"}`}>
            <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Payment Providers & Integrations
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Configure automated cryptocurrency gateways and direct REST API callbacks.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border mb-6 flex flex-col min-[321px]:flex-row items-start gap-3 text-xs ${
              isDark ? "bg-black/30 border-white/[0.04] text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"
            }`}
          >
            <InformationCircleIcon className="h-5 w-5 shrink-0 text-cyan-400 min-[321px]:mt-0.5" />
            <div className="space-y-1">
              <span className={`font-bold block ${isDark ? "text-white" : "text-zinc-900"}`}>
                Supported Gateways & Custom Integrations
              </span>
              <p className="leading-relaxed">
                You can utilize built-in automated gateways like <strong className="text-cyan-400">OxaPay</strong> or enable the <strong className="text-cyan-400">API Callback</strong> system to add credits programmatically from your own bots, custom webhooks, or custom e-commerce checkouts.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`p-5 rounded-2xl border space-y-5 ${isDark ? "border-white/10 bg-black/40" : "border-zinc-200 bg-zinc-50/50"}`}>
              <div className="flex flex-col min-[490px]:flex-row min-[490px]:items-center justify-between gap-4">
                <div className="flex flex-col min-[490px]:flex-row items-start min-[490px]:items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                    <CreditCardIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                      OxaPay Crypto Gateway
                    </h3>
                    <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Accept Bitcoin, USDT, Ethereum, and 15+ popular cryptocurrencies automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start min-[490px]:self-auto pt-1 min-[490px]:pt-0">
                  <ToggleSwitch enabled={providerOxapayEnabled} onChange={setProviderOxapayEnabled} />
                </div>
              </div>

              {providerOxapayEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 pt-2 border-t border-white/5"
                >
                  <label className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    OxaPay Merchant API Key
                  </label>

                  <div className="relative">
                    <input
                      type={showOxaPayKey ? "text" : "password"}
                      required={providerOxapayEnabled}
                      value={oxaPayApiKey}
                      onChange={(e) => {
                        setOxaPayApiKey(e.target.value);
                        if (oxaPayHasError) setOxaPayHasError(false);
                      }}
                      placeholder="Enter your OxaPay Merchant API Key..."
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none pr-10 ${
                        oxaPayHasError
                          ? "border-rose-500 bg-rose-500/5 text-rose-300"
                          : isDark
                          ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                          : "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOxaPayKey(!showOxaPayKey)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showOxaPayKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <div className={`p-5 rounded-2xl border space-y-5 ${isDark ? "border-white/10 bg-black/40" : "border-zinc-200 bg-zinc-50/50"}`}>
              <div className="flex flex-col min-[490px]:flex-row min-[490px]:items-center justify-between gap-4">
                <div className="flex flex-col min-[490px]:flex-row items-start min-[490px]:items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                    <CommandLineIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                      API Callback
                    </h3>
                    <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Add credits programmatically via authenticated external webhooks and scripts.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start min-[490px]:self-auto pt-1 min-[490px]:pt-0">
                  <ToggleSwitch enabled={providerApiCallbackEnabled} onChange={handleToggleApiCallback} />
                </div>
              </div>

              {providerApiCallbackEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-2 border-t border-white/5"
                >
                  <div className="space-y-2">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      API Callback Secret Key
                    </label>

                    <div className="flex flex-col min-[480px]:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? "text" : "password"}
                          required={providerApiCallbackEnabled}
                          value={apiCallbackKey}
                          onChange={(e) => setApiCallbackKey(e.target.value)}
                          placeholder="API Callback Key..."
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none pr-10 ${
                            isDark
                              ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                              : "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-400"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showApiKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleRegenerateApiKey}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors shrink-0 ${
                          isDark
                            ? "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white"
                            : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        <ArrowPathIcon className="w-4 h-4 shrink-0" />
                        <span>Re-gen</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      External Credits Store URL <span className="text-zinc-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={externalCreditsStoreUrl}
                      onChange={(e) => setExternalCreditsStoreUrl(e.target.value)}
                      placeholder="https://store.yourdomain.com/credits"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${
                        isDark
                          ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                          : "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-400"
                      }`}
                    />
                    <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                      Redirect users to your external billing site or store when they want to top up credits.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      cURL Request Example
                    </label>

                    <div
                      className={`p-3.5 rounded-xl border font-mono text-xs break-all whitespace-pre-wrap ${
                        isDark
                          ? "border-white/10 bg-[#07080a] text-emerald-400"
                          : "border-zinc-300 bg-zinc-900 text-emerald-400"
                      }`}
                    >
                      {curlSnippet}
                    </div>

                    <div className="pt-1 flex justify-start">
                      <button
                        type="button"
                        onClick={handleCopyCurl}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          copiedCurl
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : isDark
                            ? "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                            : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        {copiedCurl ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            <span>Copy cURL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {formError && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}
      </form>

      <SaveBar
        isOpen={hasUnsavedChanges}
        onReset={handleReset}
        onSave={() => handleSaveSettings()}
        isSaving={saving}
        pendingAccentColor={accentColor}
      />
    </div>
  );
}
