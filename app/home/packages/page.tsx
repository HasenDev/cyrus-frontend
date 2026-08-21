"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/app/home/layout";
import { config, apiRequest } from "@/lib/main";
import { parseCredits } from "@/lib/misc/creditsParser";
import Loading from "@/components/Base/Loading";

interface LocationItem {
  id: string;
  name: string;
  flag: string;
}

interface PlanOption {
  id: string;
  name: string;
  ramMB: number;
  cpuPercent: number;
  diskMB: number;
  storageType: "NVMe" | "SSD" | "HDD";
  priceCredits: number;
  maxAllocations?: number;
  allocations?: number;
}

interface EggVariable {
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  userEditable: boolean;
  rules: string;
}

interface EggInfo {
  id: string;
  name: string;
  dockerImages?: Record<string, string>;
  variables?: EggVariable[];
}

interface PackageItem {
  id: string;
  name: string;
  description: string;
  banner?: string;
  icon?: string;
  eggId?: string;
  nestId?: string;
  egg?: EggInfo | null;
  locations: LocationItem[];
  plans: PlanOption[];
}

interface CategoryGroup {
  id: string;
  name: string;
  description: string;
  packages: PackageItem[];
}

const getTwemojiUrl = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return "";
  const code = countryCode.toUpperCase();
  const c1 = (0x1f1e6 - 65 + code.charCodeAt(0)).toString(16);
  const c2 = (0x1f1e6 - 65 + code.charCodeAt(1)).toString(16);
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${c1}-${c2}.svg`;
};

const getMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const baseUrl = config.apiBaseUrl.endsWith("/")
    ? config.apiBaseUrl.slice(0, -1)
    : config.apiBaseUrl;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${path}`;
};

export default function PackagesPage() {
  const { user } = useAppStore();
  const accentColor = config.accentColor || "#00f2fe";
  const isDark = config.theme === "dark";
  const currentCredits = user?.metrics?.credits ?? user?.credits ?? 0;
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [instanceName, setInstanceName] = useState<string>("");
  const [instanceDescription, setInstanceDescription] = useState<string>("");
  const [envVariables, setEnvVariables] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);

  const fetchStorePackages = async () => {
    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/client/packages", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Failed to fetch available store packages.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      setError("Network error loading store packages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorePackages();
  }, []);

  useEffect(() => {
    if (deployError && modalBodyRef.current) {
      requestAnimationFrame(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTo({
            top: modalBodyRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  }, [deployError]);

  const handleOpenModal = (pkg: PackageItem) => {
    setSelectedPackage(pkg);
    setSelectedPlan(pkg.plans[0] || null);
    setSelectedLocationId(pkg.locations[0]?.id || "");
    setInstanceName(`My ${pkg.name}`);
    setInstanceDescription("");

    const initialEnv: Record<string, string> = {};
    if (pkg.egg?.variables && Array.isArray(pkg.egg.variables)) {
      pkg.egg.variables.forEach((v) => {
        initialEnv[v.envVariable] = v.defaultValue ?? "";
      });
    }
    setEnvVariables(initialEnv);

    setDeployError(null);
    setDeploySuccess(null);
  };

  const handleCloseModal = () => {
    setSelectedPackage(null);
    setSelectedPlan(null);
    setSelectedLocationId("");
    setEnvVariables({});
    setDeployError(null);
    setDeploySuccess(null);
  };

  const handleEnvChange = (envKey: string, value: string) => {
    setEnvVariables((prev) => ({
      ...prev,
      [envKey]: value,
    }));
  };

  const handleDeploy = async () => {
    if (!selectedPackage || !selectedPlan || !selectedLocationId || !instanceName.trim()) return;

    setIsDeploying(true);
    setDeployError(null);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/client/packages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          planId: selectedPlan.id,
          locationId: selectedLocationId,
          serverName: instanceName.trim(),
          serverDescription: instanceDescription.trim(),
          environment: envVariables,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeployError(data.error || "Failed to deploy server instance.");
        setIsDeploying(false);
        return;
      }

      setDeploySuccess("Server deployed successfully! Redirecting...");
      setTimeout(() => {
        window.location.href = "/home/services";
      }, 1500);
    } catch {
      setDeployError("Network error deploying server instance.");
      setIsDeploying(false);
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
    <div className="space-y-10 max-w-6xl mx-auto px-1 sm:px-0">
      <div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
          Store Packages
        </h1>
        <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Deploy pre-configured compute nodes instantly using your credit balance.
        </p>
      </div>

      <div
        className={`w-full rounded-xl border p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div>
          <span
            className={`block text-[10px] font-bold uppercase tracking-widest ${
              isDark ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            Available Balance
          </span>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 mt-0.5">
            <span
              className={`text-xl sm:text-2xl font-black ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              {parseCredits(currentCredits)}
            </span>

            <span
              className="text-sm font-bold whitespace-nowrap"
              style={{ color: accentColor }}
            >
              Credits
            </span>
          </div>
        </div>

        <Link
          href="/home/credits"
          className="rounded-lg border px-4 py-2 text-xs font-bold transition-all hover:opacity-90 shadow-sm"
          style={{
            borderColor: `${accentColor}40`,
            backgroundColor: `${accentColor}10`,
            color: accentColor,
          }}
        >
          Add Credits
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {!error && categories.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            No packages available for deployment right now.
          </h3>
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat.id} className="space-y-4">
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                <h2 className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {cat.name}
                </h2>
              </div>
              {cat.description && (
                <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{cat.description}</p>
              )}
              <div className={`h-[1px] w-full mt-3 ${isDark ? "bg-white/[0.06]" : "bg-zinc-200"}`} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {cat.packages.map((pkg) => {
                const bannerUrl = getMediaUrl(pkg.banner);
                const iconUrl = getMediaUrl(pkg.icon);

                const lowestPrice = pkg.plans.length > 0
                  ? Math.min(...pkg.plans.map((p) => p.priceCredits))
                  : 0;

                return (
                  <div
                    key={pkg.id}
                    className={`group relative rounded-xl border overflow-hidden flex flex-col justify-between shadow-md transition-all hover:border-white/20 ${
                      isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div>
                      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-zinc-800 to-zinc-900">
                        {bannerUrl ? (
                          <img
                            src={bannerUrl}
                            alt={pkg.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className="h-full w-full opacity-20"
                            style={{
                              backgroundImage: `radial-gradient(${accentColor} 1px, transparent 1px)`,
                              backgroundSize: "16px 16px",
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex items-center gap-2.5">
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt=""
                              className="h-10 w-10 rounded-xl border border-white/20 object-cover shadow-lg bg-black/40"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white font-black shadow-lg">
                              {pkg.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs font-bold text-white drop-shadow-md">{pkg.name}</span>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          {pkg.description || "No description."}
                        </p>

                        <div className={`p-3 rounded-xl border space-y-2.5 ${isDark ? "border-white/5 bg-black/30" : "border-zinc-200 bg-zinc-50"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                            <span className={`text-[11px] font-semibold shrink-0 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                              Starting from
                            </span>
                            <span className="text-xs font-black shrink-0" style={{ color: accentColor }}>
                              {parseCredits(lowestPrice)} Cr / mo
                            </span>
                          </div>

                          {pkg.locations.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1.5 border-t border-white/5">
                              <span className={`text-[11px] font-semibold shrink-0 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                                Locations:
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {pkg.locations.slice(0, 5).map((loc) => (
                                  <img
                                    key={loc.id}
                                    src={getTwemojiUrl(loc.flag)}
                                    alt={loc.name}
                                    title={loc.name}
                                    className="h-4 w-4 object-contain inline-block shrink-0"
                                  />
                                ))}
                                {pkg.locations.length > 5 && (
                                  <span className="text-[10px] text-zinc-500 font-bold shrink-0">
                                    +{pkg.locations.length - 5}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <button
                        onClick={() => handleOpenModal(pkg)}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all border ${
                          isDark
                            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                            : "border-zinc-300 bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                        }`}
                      >
                        Get Package
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      <AnimatePresence>
        {selectedPackage && selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-3xl h-[92dvh] sm:h-auto sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
                isDark ? "border-white/10 bg-[#0F1014] text-white" : "border-zinc-300 bg-white text-zinc-900"
              }`}
            >
              <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b shrink-0 min-w-0 ${isDark ? "border-white/10" : "border-zinc-200"}`}>
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {selectedPackage.icon && (
                    <img src={getMediaUrl(selectedPackage.icon) || ""} alt="" className="h-6 w-6 sm:h-7 sm:w-7 rounded-md object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black tracking-tight truncate">{selectedPackage.name}</h3>
                    <p className={`text-[10px] sm:text-[11px] truncate ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Configure your instance settings and deployment environment
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className={`rounded-lg p-1.5 transition-colors shrink-0 ml-2 ${
                    isDark
                      ? "text-zinc-400 hover:text-white hover:bg-white/5"
                      : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div
                ref={modalBodyRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6"
              >
                <div className="space-y-3 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Server Instance Details</h4>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
                    <div className="min-w-0">
                      <label className="block text-xs font-medium mb-1">Server Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Production Server"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                        className={`w-full min-w-0 rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-colors ${
                          isDark ? "border-white/10 bg-black/40 text-white focus:border-white/20" : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs font-medium mb-1">Description (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Primary instance for game node"
                        value={instanceDescription}
                        onChange={(e) => setInstanceDescription(e.target.value)}
                        className={`w-full min-w-0 rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-colors ${
                          isDark ? "border-white/10 bg-black/40 text-white focus:border-white/20" : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                        }`}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Geographical Region</h4>
                  <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
                    {selectedPackage.locations.map((loc) => {
                      const isSelected = selectedLocationId === loc.id;
                      return (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedLocationId(loc.id)}
                          style={
                            isSelected
                              ? {
                                  borderColor: accentColor,
                                  backgroundColor: `${accentColor}15`,
                                }
                              : {}
                          }
                          className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition-all min-w-0 ${
                            isSelected
                              ? "shadow-sm"
                              : isDark
                              ? "border-white/10 bg-black/20 hover:border-white/20"
                              : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={getTwemojiUrl(loc.flag)} alt="" className="h-5 w-5 object-contain shrink-0" />
                            <span className="text-xs font-bold truncate">{loc.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Hardware Resource Tier</h4>
                  <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
                    {selectedPackage.plans.map((plan) => {
                      const isSelected = selectedPlan.id === plan.id;
                      const maxAlloc = plan.maxAllocations ?? plan.allocations ?? 0;

                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan)}
                          style={
                            isSelected
                              ? {
                                  borderColor: accentColor,
                                  backgroundColor: `${accentColor}15`,
                                }
                              : {}
                          }
                          className={`cursor-pointer rounded-xl border p-3.5 sm:p-4 transition-all flex flex-col justify-between space-y-2 min-w-0 ${
                            isSelected
                              ? "shadow-sm"
                              : isDark
                              ? "border-white/10 bg-black/20 hover:border-white/20"
                              : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-xs font-bold truncate">{plan.name}</span>
                            <span
                              className="text-xs font-extrabold shrink-0"
                              style={isSelected ? { color: accentColor } : {}}
                            >
                              {parseCredits(plan.priceCredits)} Cr / mo
                            </span>
                          </div>
                          <div className="text-[11px] opacity-75 space-y-0.5 min-w-0">
                            <div className="truncate">{plan.ramMB} MB RAM • {plan.cpuPercent}% vCPU</div>
                            <div className="truncate">
                              {plan.diskMB} MB {plan.storageType} Storage
                              {maxAlloc > 0 && <span> • Up to {maxAlloc} Ports</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selectedPackage.egg?.variables && selectedPackage.egg.variables.length > 0 && (
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 min-w-0">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Environment Variables
                      </h4>
                      <span className={`text-[10px] truncate ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                        Docker container runtime settings
                      </span>
                    </div>

                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
                      {selectedPackage.egg.variables.map((variable) => {
                        const isEditable = variable.userEditable !== false;
                        const currentValue = envVariables[variable.envVariable] ?? variable.defaultValue ?? "";

                        return (
                          <div
                            key={variable.envVariable}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 min-w-0 overflow-hidden ${
                              isDark ? "border-white/5 bg-black/20" : "border-zinc-200 bg-zinc-50/50"
                            }`}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <label className="text-xs font-bold truncate block min-w-0" title={variable.name || variable.envVariable}>
                                  {variable.name || variable.envVariable}
                                </label>
                              </div>

                              {variable.description && (
                                <p
                                  className={`text-[11px] leading-relaxed break-words line-clamp-2 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                                  title={variable.description}
                                >
                                  {variable.description}
                                </p>
                              )}
                            </div>

                            <div className="relative min-w-0 mt-0.5">
                              <input
                                type="text"
                                disabled={!isEditable}
                                value={currentValue}
                                placeholder={variable.defaultValue || "No default value"}
                                onChange={(e) => handleEnvChange(variable.envVariable, e.target.value)}
                                className={`w-full min-w-0 rounded-lg border px-3 py-2 text-xs outline-none transition-colors truncate ${
                                  !isEditable
                                    ? isDark
                                      ? "border-white/5 bg-white/[0.02] text-zinc-500 cursor-not-allowed pr-14"
                                      : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed pr-14"
                                    : isDark
                                    ? "border-white/10 bg-black/40 text-white focus:border-white/20"
                                    : "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-400"
                                }`}
                              />
                              {!isEditable && (
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider select-none pointer-events-none">
                                  Locked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {deployError && (
                  <div className="p-3.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl font-semibold break-words shadow-sm">
                    {deployError}
                  </div>
                )}
                {deploySuccess && (
                  <div className="p-3.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs rounded-xl font-semibold break-words shadow-sm">
                    {deploySuccess}
                  </div>
                )}
              </div>
              <div className={`p-4 sm:px-6 border-t shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 min-w-0 ${isDark ? "border-white/10 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
                <div className="flex items-baseline justify-between sm:justify-start gap-2 min-w-0">
                  <span className="text-xs text-zinc-400 font-semibold">Total Due:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black">
                      {parseCredits(selectedPlan.priceCredits)}{" "}
                    </span>
                    <span className="text-xs font-semibold text-zinc-500">/mo</span>
                  </div>
                </div>

                <button
                  disabled={isDeploying || !instanceName.trim()}
                  onClick={handleDeploy}
                  style={{ backgroundColor: accentColor }}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 transition-all flex items-center justify-center shrink-0 hover:opacity-90 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeploying ? (
                    <Loading width={16} height={16} color="#000000" />
                  ) : (
                    <span>Deploy Package</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}