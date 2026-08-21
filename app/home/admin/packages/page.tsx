"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import Selector from "@/components/Base/Selector";
import { config, apiRequest } from "@/lib/main";

interface CategoryItem {
  id: string;
  name: string;
  description: string;
  packageCount: number;
  createdAt?: string;
}

interface PackageItem {
  id: string;
  categoryId: string;
  nestId: string;
  eggId: string;
  name: string;
  description: string;
  banner?: string;
  icon?: string;
  locationsCount: number;
  plansCount: number;
  isConfigured: boolean;
  createdAt?: string;
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

type ModalType = "none" | "createCat" | "editCat" | "deleteCat" | "createPkg";

export default function AdminPackagesPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [nests, setNests] = useState<NestOption[]>([]);
  const [eggs, setEggs] = useState<EggOption[]>([]);
  const [modalType, setModalType] = useState<ModalType>("none");
  const [selectedCat, setSelectedCat] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [selectedNestId, setSelectedNestId] = useState("");
  const [selectedEggId, setSelectedEggId] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access token missing.");
      setLoading(false);
      return;
    }

    try {
      const [catRes, pkgRes, nestRes] = await Promise.all([
        apiRequest("api/v1/admin/packages/categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiRequest("api/v1/admin/packages", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiRequest("api/v1/admin/nests", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (catRes.status === 403) {
        setError("Access Denied: Requires ADMIN_PACKAGES permission.");
        setLoading(false);
        return;
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setPackages(pkgData.packages || []);
      }

      if (nestRes.ok) {
        const nestData = await nestRes.json();
        setNests(nestData.nests || []);
      }
    } catch (err) {
      setError("Network error occurred while fetching package store data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    if (!selectedNestId) {
      setEggs([]);
      setSelectedEggId("");
      return;
    }

    const fetchNestEggs = async () => {
      const token = Cookies.get("token");
      try {
        const res = await apiRequest(`api/v1/admin/nests/${selectedNestId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const loadedEggs = data.eggs || [];
          setEggs(loadedEggs);
          if (loadedEggs.length > 0) {
            setSelectedEggId(loadedEggs[0].id);
          } else {
            setSelectedEggId("");
          }
        }
      } catch (e) {
        setEggs([]);
        setSelectedEggId("");
      }
    };

    fetchNestEggs();
  }, [selectedNestId]);

  const openCreateCat = () => {
    setCatName("");
    setCatDesc("");
    setModalError("");
    setModalType("createCat");
  };

  const openEditCat = (cat: CategoryItem) => {
    setSelectedCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description);
    setModalError("");
    setModalType("editCat");
  };

  const openDeleteCat = (cat: CategoryItem) => {
    setSelectedCat(cat);
    setModalError("");
    setModalType("deleteCat");
  };

  const openCreatePkg = (cat: CategoryItem) => {
    setSelectedCat(cat);
    setPkgName("");
    setPkgDesc("");
    setModalError("");

    const initialNestId = nests.length > 0 ? nests[0].id : "";
    setSelectedNestId(initialNestId);
    setSelectedEggId("");
    setModalType("createPkg");
  };

  const closeModal = () => {
    setModalType("none");
    setSelectedCat(null);
    setCatName("");
    setCatDesc("");
    setPkgName("");
    setPkgDesc("");
    setModalError("");
    setModalLoading(false);
  };

  const handleCatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalLoading(true);

    const token = Cookies.get("token");
    const isEdit = modalType === "editCat";

    try {
      const res = await apiRequest("api/v1/admin/packages/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(
          isEdit
            ? { id: selectedCat?.id, name: catName, description: catDesc }
            : { name: catName, description: catDesc }
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to save category.");
        setModalLoading(false);
        return;
      }

      showToast(data.message || (isEdit ? "Category updated." : "Category created."));
      closeModal();
      fetchData();
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const handleCatDelete = async () => {
    if (!selectedCat) return;
    setModalLoading(true);
    setModalError("");

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/packages/categories", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: selectedCat.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to delete category.");
        setModalLoading(false);
        return;
      }

      showToast("Category and packages removed.");
      closeModal();
      fetchData();
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const handlePkgSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCat) return;

    if (!selectedEggId) {
      setModalError("Please select a valid Egg template.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/packages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          categoryId: selectedCat.id,
          name: pkgName,
          eggId: selectedEggId,
          description: pkgDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to create package.");
        setModalLoading(false);
        return;
      }

      showToast("Package created successfully! Configure plans & locations to enable it.");
      closeModal();
      fetchData();
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
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
    <div className="space-y-8 max-w-5xl mx-auto px-1 sm:px-0 pb-12">
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
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            Package Store Configuration
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Organize deployable server templates into categories and hardware tiers.
          </p>
        </div>

        {!error && (
          <button
            type="button"
            onClick={openCreateCat}
            disabled={categories.length >= 20}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            <svg className="h-4 w-4 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Category</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {!error && (
        <div className="space-y-8">
          {categories.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
              <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                No Store Categories Configured
              </h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Create your first category (e.g. Minecraft, Node.js, Databases) to start adding packages.
              </p>
            </div>
          ) : (
            categories.map((cat) => {
              const catPkgs = packages.filter((p) => p.categoryId === cat.id);

              return (
                <div
                  key={cat.id}
                  className={`rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors overflow-hidden ${
                    isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5 mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                        <h2 className={`text-lg font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>
                          {cat.name}
                        </h2>
                      </div>
                      {cat.description && (
                        <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button
                        type="button"
                        onClick={() => openCreatePkg(cat)}
                        disabled={catPkgs.length >= 20}
                        className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                          isDark
                            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                            : "border-zinc-300 bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                        } disabled:opacity-50`}
                      >
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Package</span>
                      </button>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => openEditCat(cat)}
                          className={`flex-1 sm:flex-none py-2 px-3 sm:p-2 rounded-xl transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 ${
                            isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          }`}
                          title="Edit Category"
                        >
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteCat(cat)}
                          className="flex-1 sm:flex-none py-2 px-3 sm:p-2 rounded-xl transition-colors text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center gap-1.5"
                          title="Delete"
                        >
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {catPkgs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      No packages in this category. Click "Add Package" to create one.
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      {catPkgs.map((pkg) => (
                        <div
                          key={pkg.id}
                          className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                            isDark ? "border-white/10 bg-[#07080a]" : "border-zinc-200 bg-zinc-50"
                          }`}
                        >
                          <div>
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <h3 className={`text-xs font-bold truncate max-w-[70%] ${isDark ? "text-white" : "text-zinc-900"}`}>
                                {pkg.name}
                              </h3>

                              {!pkg.isConfigured ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                  Unconfigured
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                                  Ready
                                </span>
                              )}
                            </div>

                            <p className={`text-[11px] line-clamp-2 leading-relaxed mb-3 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                              {pkg.description || "No description provided."}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-zinc-500 mb-4">
                              <span>{pkg.plansCount} Plans</span>
                              <span className="hidden min-[320px]:inline">•</span>
                              <span>{pkg.locationsCount} Locations</span>
                            </div>
                          </div>

                          <Link
                            href={`/home/admin/packages/manage?package_id=${pkg.id}`}
                            className={`w-full py-2 rounded-lg text-xs font-bold text-center transition-colors ${
                              isDark
                                ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                                : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300"
                            }`}
                          >
                            Manage
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {categories.length > 0 && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={openCreateCat}
                disabled={categories.length >= 20}
                className={`px-5 py-3 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 ${
                  isDark
                    ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                } disabled:opacity-50`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Another Category</span>
              </button>
            </div>
          )}
        </div>
      )}
      <ModalMenu
        isOpen={modalType === "createCat" || modalType === "editCat"}
        onClose={closeModal}
        desktopMaxWidth="460px"
      >
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            {modalType === "editCat" ? "Edit Category" : "Create Package Category"}
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Group templates into logical store sections (e.g., Minecraft, Languages, Databases).
          </p>

          <form onSubmit={handleCatSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Minecraft Game Servers"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${
                    isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Brief summary of packages in this category..."
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs outline-none ${
                    isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                  }`}
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/20 bg-red-500/10 text-red-500 text-xs rounded-lg font-medium">
                {modalError}
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
                disabled={modalLoading || !catName.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : modalType === "editCat" ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={modalType === "createPkg"} onClose={closeModal} desktopMaxWidth="480px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Add Package to "{selectedCat?.name}"
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Select a runtime Egg template and enter package details.
          </p>

          <form onSubmit={handlePkgSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Package Name
                </label>
                <input
                  type="text"
                  required
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="e.g. Paper Spigot Minecraft"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${
                    isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Select Nest
                </label>
                <Selector
                  value={selectedNestId}
                  options={nests.map((n) => ({ value: n.id, label: n.name }))}
                  onChange={(val) => setSelectedNestId(String(val))}
                  placeholder="Select Nest..."
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Select Egg Template
                </label>
                <Selector
                  value={selectedEggId}
                  options={eggs.map((e) => ({ value: e.id, label: e.name }))}
                  onChange={(val) => setSelectedEggId(String(val))}
                  placeholder={eggs.length === 0 ? "No eggs in this nest" : "Select Egg Template..."}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  placeholder="Brief description of this environment package..."
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs outline-none ${
                    isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                  }`}
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/20 bg-red-500/10 text-red-500 text-xs rounded-lg font-medium">
                {modalError}
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
                disabled={modalLoading || !pkgName.trim() || !selectedEggId}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? (
                  <Loading width={16} height={16} color="#000000" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Create Package</span>
                    <span className="sm:hidden">Create</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={modalType === "deleteCat"} onClose={closeModal} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Delete Category
              </h2>
              <span className="text-xs text-rose-500 font-semibold">Irreversible Action</span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete <strong className={isDark ? "text-white" : "text-zinc-900"}>{selectedCat?.name}</strong>? All packages inside this category will also be permanently deleted.
          </p>

          {modalError && (
            <div className="mb-4 p-3 border border-red-500/20 bg-red-500/10 text-red-500 text-xs rounded-lg font-medium">
              {modalError}
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
              onClick={handleCatDelete}
              disabled={modalLoading}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {modalLoading ? (
                <Loading width={16} height={16} color="#ffffff" />
              ) : (
                <>
                  <span className="hidden sm:inline">Delete Category</span>
                  <span className="sm:hidden">Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}