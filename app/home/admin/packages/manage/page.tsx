"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import Selector from "@/components/Base/Selector";
import { config, apiRequest } from "@/lib/main";

interface PlanItem {
  id: string;
  name: string;
  ramMB: number;
  cpuPercent: number;
  diskMB: number;
  storageType: "NVMe" | "SSD" | "HDD";
  priceCredits: number;
  allocations: number;
}

interface LocationOption {
  id: string;
  name: string;
  flag: string;
}

interface EggOption {
  id: string;
  nestId: string;
  name: string;
}

interface NestOption {
  id: string;
  name: string;
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

type ModalMode = "none" | "plan" | "deletePkg" | "deletePlanConfirm";

function AdminManagePackageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package_id") || searchParams.get("id");
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [newBanner, setNewBanner] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);
  const [newIcon, setNewIcon] = useState<string | null>(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [savingContainer1, setSavingContainer1] = useState(false);
  const [selectedEggId, setSelectedEggId] = useState("");
  const [selectedNestId, setSelectedNestId] = useState("");
  const [savingContainer2, setSavingContainer2] = useState(false);
  const [enabledLocations, setEnabledLocations] = useState<string[]>([]);
  const [savingContainer3, setSavingContainer3] = useState(false);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [savingContainer4, setSavingContainer4] = useState(false);
  const [allLocations, setAllLocations] = useState<LocationOption[]>([]);
  const [allNests, setAllNests] = useState<NestOption[]>([]);
  const [allEggs, setAllEggs] = useState<EggOption[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>("none");
  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null);
  const [deletingPlanIndex, setDeletingPlanIndex] = useState<number | null>(null);
  const [planName, setPlanName] = useState("");
  const [planRam, setPlanRam] = useState(1024);
  const [planCpu, setPlanCpu] = useState(100);
  const [planDisk, setPlanDisk] = useState(5000);
  const [planStorage, setPlanStorage] = useState<"NVMe" | "SSD" | "HDD">("NVMe");
  const [planPrice, setPlanPrice] = useState(100);
  const [planAllocations, setPlanAllocations] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const showToast = (msg: string, isError = false) => {
    setToastMessage({ msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPackageData = async () => {
    if (!packageId) {
      setError("Missing Package ID parameter.");
      setLoading(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access token missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest(`api/v1/admin/packages?package_id=${packageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Failed to load package details.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const pkg = data.package;

      if (pkg) {
        setPkgName(pkg.name || "");
        setPkgDesc(pkg.description || "");
        setCurrentBanner(pkg.banner || null);
        setCurrentIcon(pkg.icon || null);
        setSelectedEggId(pkg.eggId || "");
        setSelectedNestId(pkg.nestId || "");
        setEnabledLocations(pkg.locations || []);
        setPlans(
          (pkg.plans || []).map((p: any) => ({
            ...p,
            allocations: Math.min(50, Math.max(1, parseInt(p.allocations, 10) || 1))
          }))
        );
      }

      setAllLocations(data.allLocations || []);
      setAllNests(data.allNests || []);
      setAllEggs(data.allEggs || []);
    } catch {
      setError("Network error fetching package configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackageData();
  }, [packageId]);

  const handleBannerFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewBanner(reader.result as string);
      setRemoveBanner(false);
    };
    reader.readAsDataURL(file);
  };

  const handleIconFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewIcon(reader.result as string);
      setRemoveIcon(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleLocation = (locId: string) => {
    if (enabledLocations.includes(locId)) {
      setEnabledLocations(enabledLocations.filter((id) => id !== locId));
    } else {
      setEnabledLocations([...enabledLocations, locId]);
    }
  };
  const savePlansToServer = async (updatedPlans: PlanItem[]) => {
    if (!packageId) return false;
    setSavingContainer4(true);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/packages", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: packageId,
          plans: updatedPlans,
        }),
      });

      if (!res.ok) {
        showToast("Failed to sync plans with server!", true);
        return false;
      }

      showToast("Plans saved successfully!");
      fetchPackageData();
      return true;
    } catch {
      showToast("Failed to sync plans with server!", true);
      return false;
    } finally {
      setSavingContainer4(false);
    }
  };
  const openAddPlanModal = () => {
    setEditingPlanIndex(null);
    setPlanName(`Tier ${plans.length + 1}`);
    setPlanRam(1024);
    setPlanCpu(100);
    setPlanDisk(5000);
    setPlanStorage("NVMe");
    setPlanPrice(200);
    setPlanAllocations(1);
    setModalMode("plan");
  };

  const openEditPlanModal = (index: number) => {
    const target = plans[index];
    if (!target) return;
    setEditingPlanIndex(index);
    setPlanName(target.name);
    setPlanRam(target.ramMB);
    setPlanCpu(target.cpuPercent);
    setPlanDisk(target.diskMB);
    setPlanStorage(target.storageType);
    setPlanPrice(target.priceCredits);
    setPlanAllocations(target.allocations || 1);
    setModalMode("plan");
  };

  const openDeletePlanConfirm = (index: number) => {
    setDeletingPlanIndex(index);
    setModalMode("deletePlanConfirm");
  };

  const handleSavePlanModal = async (e: FormEvent) => {
    e.preventDefault();
    const clampedAllocations = Math.min(50, Math.max(1, planAllocations || 1));
    const newPlanDoc: PlanItem = {
      id: editingPlanIndex !== null ? plans[editingPlanIndex].id : `plan_${Math.random().toString(36).substring(2, 9)}`,
      name: planName,
      ramMB: planRam,
      cpuPercent: planCpu,
      diskMB: planDisk,
      storageType: planStorage,
      priceCredits: planPrice,
      allocations: clampedAllocations,
    };

    let updated: PlanItem[];
    if (editingPlanIndex !== null) {
      updated = [...plans];
      updated[editingPlanIndex] = newPlanDoc;
    } else {
      updated = [...plans, newPlanDoc];
    }

    setPlans(updated);
    setModalMode("none");
    await savePlansToServer(updated);
  };

  const handleDeletePlan = async (index: number) => {
    const updated = plans.filter((_, idx) => idx !== index);
    setPlans(updated);
    await savePlansToServer(updated);
  };
  const handleSaveContainer1 = async (e: FormEvent) => {
    e.preventDefault();
    if (!packageId) return;

    setSavingContainer1(true);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/packages", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: packageId,
          name: pkgName,
          description: pkgDesc,
          banner: newBanner,
          removeBanner,
          icon: newIcon,
          removeIcon,
        }),
      });

      if (!res.ok) {
        showToast("Failed to save!", true);
        setSavingContainer1(false);
        return;
      }

      showToast("Saved changes!");
      setNewBanner(null);
      setNewIcon(null);
      setRemoveBanner(false);
      setRemoveIcon(false);
      fetchPackageData();
    } catch {
      showToast("Failed to save!", true);
    } finally {
      setSavingContainer1(false);
    }
  };

  const handleSaveContainer2 = async (e: FormEvent) => {
    e.preventDefault();
    if (!packageId) return;

    setSavingContainer2(true);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/packages", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: packageId,
          eggId: selectedEggId,
        }),
      });

      if (!res.ok) {
        showToast("Failed to save!", true);
        setSavingContainer2(false);
        return;
      }

      showToast("Saved changes!");
      fetchPackageData();
    } catch {
      showToast("Failed to save!", true);
    } finally {
      setSavingContainer2(false);
    }
  };

  const handleSaveContainer3 = async (e: FormEvent) => {
    e.preventDefault();
    if (!packageId) return;

    setSavingContainer3(true);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/packages", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: packageId,
          locations: enabledLocations,
        }),
      });

      if (!res.ok) {
        showToast("Failed to save!", true);
        setSavingContainer3(false);
        return;
      }

      showToast("Saved changes!");
      fetchPackageData();
    } catch {
      showToast("Failed to save!", true);
    } finally {
      setSavingContainer3(false);
    }
  };

  const handleSaveContainer4 = async (e: FormEvent) => {
    e.preventDefault();
    await savePlansToServer(plans);
  };

  const handleDeletePackage = async () => {
    if (!packageId) return;
    setDeleting(true);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/packages", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: packageId }),
      });

      if (res.ok) {
        router.push("/home/admin/packages");
      } else {
        showToast("Failed to delete package!", true);
        setDeleting(false);
      }
    } catch {
      showToast("Failed to delete package!", true);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  const activeBanner = newBanner || getMediaUrl(currentBanner);
  const activeIcon = newIcon || getMediaUrl(currentIcon);
  const filteredEggs = allEggs.filter((e) => e.nestId === selectedNestId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-1 sm:px-0 pb-12">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold backdrop-blur-md ${
              toastMessage.isError
                ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
            }`}
          >
            {toastMessage.isError ? (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{toastMessage.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div>
        <Link
          href="/home/admin/packages"
          className={`text-xs font-semibold flex items-center gap-1 mb-2 transition-colors ${
            isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Packages</span>
        </Link>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
          Manage Package: {pkgName}
        </h1>
        <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Configure hardware resource tiers, permitted deployment locations, graphics, and runtime template.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSaveContainer1}
        className={`rounded-2xl border p-5 sm:p-7 shadow-sm space-y-6 overflow-hidden ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <h2 className={`text-base font-extrabold tracking-tight pb-3 border-b ${isDark ? "border-white/5 text-white" : "border-zinc-100 text-zinc-900"}`}>
          1. Package Information & Media
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Package Name
            </label>
            <input
              type="text"
              required
              value={pkgName}
              onChange={(e) => setPkgName(e.target.value)}
              className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Description
            </label>
            <input
              type="text"
              value={pkgDesc}
              onChange={(e) => setPkgDesc(e.target.value)}
              placeholder="Brief summary..."
              className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
              }`}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2 w-full overflow-hidden">
          <div className="w-full sm:w-auto shrink-0 flex flex-col items-center sm:items-start">
            <label className={`block text-xs font-semibold mb-1.5 w-full text-center sm:text-left ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Icon Graphic
            </label>
            {activeIcon ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 h-36 w-36 aspect-square bg-zinc-900 flex items-center justify-center">
                <img src={activeIcon} alt="Icon" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setNewIcon(null);
                    setCurrentIcon(null);
                    setRemoveIcon(true);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-rose-500/80 text-white backdrop-blur-md hover:bg-rose-600 transition-colors"
                  title="Remove Icon"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-36 w-36 aspect-square rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
                isDark ? "border-white/10 bg-[#07080a] hover:bg-white/[0.02]" : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
              }`}>
                <span className="text-xs font-semibold text-zinc-400 text-center px-2">Upload Icon</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, WEBP</span>
                <input type="file" accept="image/*" onChange={handleIconFile} className="hidden" />
              </label>
            )}
          </div>
          <div className="w-full sm:flex-1 shrink-0 min-w-0">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Banner Graphic
            </label>
            {activeBanner ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 h-36 w-full bg-zinc-900">
                <img src={activeBanner} alt="Banner" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setNewBanner(null);
                    setCurrentBanner(null);
                    setRemoveBanner(true);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-rose-500/80 text-white backdrop-blur-md hover:bg-rose-600 transition-colors"
                  title="Remove Banner"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-36 w-full rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
                isDark ? "border-white/10 bg-[#07080a] hover:bg-white/[0.02]" : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
              }`}>
                <span className="text-xs font-semibold text-zinc-400">Upload Banner Image</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                <input type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
              </label>
            )}
          </div>
        </div>
        <div className="pt-2 flex justify-end border-t border-white/5">
          <button
            type="submit"
            disabled={savingContainer1}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {savingContainer1 ? <Loading width={16} height={16} color="#000000" /> : "Save Changes"}
          </button>
        </div>
      </form>
      <form
        onSubmit={handleSaveContainer2}
        className={`rounded-2xl border p-5 sm:p-7 shadow-sm space-y-6 ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <h2 className={`text-base font-extrabold tracking-tight pb-3 border-b ${isDark ? "border-white/5 text-white" : "border-zinc-100 text-zinc-900"}`}>
          2. Runtime Egg Environment
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Associated Nest
            </label>
            <Selector
              value={selectedNestId}
              options={allNests.map((n) => ({ value: n.id, label: n.name }))}
              onChange={(val) => {
                setSelectedNestId(String(val));
                const eggsInNest = allEggs.filter((e) => e.nestId === val);
                if (eggsInNest.length > 0) {
                  setSelectedEggId(eggsInNest[0].id);
                } else {
                  setSelectedEggId("");
                }
              }}
              placeholder="Select Nest..."
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Egg Template
            </label>
            <Selector
              value={selectedEggId}
              options={filteredEggs.map((e) => ({ value: e.id, label: e.name }))}
              onChange={(val) => setSelectedEggId(String(val))}
              placeholder="Select Egg Template..."
            />
          </div>
        </div>
        <div className="pt-2 flex justify-end border-t border-white/5">
          <button
            type="submit"
            disabled={savingContainer2 || !selectedEggId}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {savingContainer2 ? <Loading width={16} height={16} color="#000000" /> : "Save Changes"}
          </button>
        </div>
      </form>
      <form
        onSubmit={handleSaveContainer3}
        className={`rounded-2xl border p-5 sm:p-7 shadow-sm space-y-6 ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="pb-3 border-b border-white/5">
          <h2 className={`text-base font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            3. Allowed Deployment Locations
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Select which node deployment regions clients can choose when launching this package.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          {allLocations.map((loc) => {
            const isEnabled = enabledLocations.includes(loc.id);
            return (
              <div
                key={loc.id}
                onClick={() => toggleLocation(loc.id)}
                className={`cursor-pointer p-3.5 rounded-xl border flex flex-col min-[300px]:flex-row items-start min-[300px]:items-center justify-between gap-2 transition-all ${
                  isEnabled
                    ? "border-emerald-500 bg-emerald-500/10"
                    : isDark
                    ? "border-white/10 bg-[#07080a]"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={getTwemojiUrl(loc.flag)} alt="" className="h-5 w-5 object-contain shrink-0" />
                  <span className={`text-xs font-bold truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                    {loc.name}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 self-start min-[300px]:self-auto ${
                    isEnabled ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="pt-2 flex justify-end border-t border-white/5">
          <button
            type="submit"
            disabled={savingContainer3}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {savingContainer3 ? <Loading width={16} height={16} color="#000000" /> : "Save Changes"}
          </button>
        </div>
      </form>
      <form
        onSubmit={handleSaveContainer4}
        className={`rounded-2xl border p-5 sm:p-7 shadow-sm space-y-6 ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <h2 className={`text-base font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              4. Hardware Plan Options
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Specify RAM, CPU %, Disk size, Storage Type, Allocations (max 50), and monthly credit costs.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddPlanModal}
            style={{ backgroundColor: accentColor }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-black transition-all hover:opacity-90 flex items-center justify-center gap-1.5 shrink-0"
          >
            <svg className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Plan Tier</span>
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-500">
            No hardware plans added yet. Add at least 1 plan to make this package ready.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
                  <th className="pb-3 px-3 font-bold">Plan Name</th>
                  <th className="pb-3 px-3 font-bold">RAM</th>
                  <th className="pb-3 px-3 font-bold">CPU</th>
                  <th className="pb-3 px-3 font-bold">Disk</th>
                  <th className="pb-3 px-3 font-bold">Storage</th>
                  <th className="pb-3 px-3 font-bold">Allocations</th>
                  <th className="pb-3 px-3 font-bold">Price (Credits/mo)</th>
                  <th className="pb-3 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                {plans.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td className="py-3 px-3 font-bold text-xs">{p.name}</td>
                    <td className="py-3 px-3 text-xs font-mono">{p.ramMB} MB</td>
                    <td className="py-3 px-3 text-xs font-mono">{p.cpuPercent}% vCPU</td>
                    <td className="py-3 px-3 text-xs font-mono">{p.diskMB} MB</td>
                    <td className="py-3 px-3 text-xs">{p.storageType}</td>
                    <td className="py-3 px-3 text-xs font-mono">{p.allocations || 1}</td>
                    <td className="py-3 px-3 text-xs font-bold text-emerald-400">{p.priceCredits} Cr</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditPlanModal(idx)}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                          title="Edit Plan"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeletePlanConfirm(idx)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                          title="Delete Plan"
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
        <div className="pt-2 flex justify-end border-t border-white/5">
          <button
            type="submit"
            disabled={savingContainer4}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {savingContainer4 ? <Loading width={16} height={16} color="#000000" /> : "Save Changes"}
          </button>
        </div>
      </form>
      <div className="pt-4 flex justify-start">
        <button
          type="button"
          onClick={() => setModalMode("deletePkg")}
          className="px-5 py-3 rounded-xl font-bold text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
        >
          Delete Package
        </button>
      </div>
      <ModalMenu isOpen={modalMode === "plan"} onClose={() => setModalMode("none")} desktopMaxWidth="480px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            {editingPlanIndex !== null ? "Edit Plan Tier" : "Add Plan Tier"}
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Set hardware resource allocations, port allocations (max 50), and credit cost.
          </p>

          <form onSubmit={handleSavePlanModal}>
            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Plan Label
                </label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Starter 2GB"
                  className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                    isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                  }`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    RAM (MB)
                  </label>
                  <input
                    type="number"
                    required
                    min={128}
                    value={planRam}
                    onChange={(e) => setPlanRam(parseInt(e.target.value, 10) || 1024)}
                    className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    CPU (% vCPU)
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={planCpu}
                    onChange={(e) => setPlanCpu(parseInt(e.target.value, 10) || 100)}
                    className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Disk Space (MB)
                  </label>
                  <input
                    type="number"
                    required
                    min={512}
                    value={planDisk}
                    onChange={(e) => setPlanDisk(parseInt(e.target.value, 10) || 5000)}
                    className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Storage Type
                  </label>
                  <Selector
                    value={planStorage}
                    options={[
                      { value: "NVMe", label: "NVMe SSD" },
                      { value: "SSD", label: "SATA SSD" },
                      { value: "HDD", label: "HDD" },
                    ]}
                    onChange={(val) => setPlanStorage(val as any)}
                    placeholder="Select Storage..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Allocations (Ports, Max 50)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={planAllocations}
                    onChange={(e) => setPlanAllocations(Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                    className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Monthly Price (Credits)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={planPrice}
                    onChange={(e) => setPlanPrice(parseInt(e.target.value, 10) || 0)}
                    className={`w-full rounded-xl border px-4 py-3 text-[14px] font-medium outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingContainer4}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {savingContainer4 ? <Loading width={16} height={16} color="#000000" /> : "Save Plan"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={modalMode === "deletePlanConfirm"} onClose={() => setModalMode("none")} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Delete Hardware Plan Tier
              </h2>
              <span className="text-xs text-rose-500 font-semibold">Will immediately remove tier on server</span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete <strong className={isDark ? "text-white" : "text-zinc-900"}>{deletingPlanIndex !== null ? plans[deletingPlanIndex]?.name : "this plan tier"}</strong>?
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setModalMode("none");
                setDeletingPlanIndex(null);
              }}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingContainer4}
              onClick={async () => {
                if (deletingPlanIndex !== null) {
                  await handleDeletePlan(deletingPlanIndex);
                }
                setModalMode("none");
                setDeletingPlanIndex(null);
              }}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {savingContainer4 ? <Loading width={16} height={16} color="#ffffff" /> : "Remove Plan Tier"}
            </button>
          </div>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={modalMode === "deletePkg"} onClose={() => setModalMode("none")} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Delete Package
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete <strong className={isDark ? "text-white" : "text-zinc-900"}>{pkgName}</strong>?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setModalMode("none")}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeletePackage}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center disabled:opacity-50"
            >
              {deleting ? <Loading width={16} height={16} color="#ffffff" /> : "Delete"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}

export default function AdminManagePackagePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Loading width={32} height={32} /></div>}>
      <AdminManagePackageContent />
    </Suspense>
  );
}