"use client";

import React, { useState, useEffect, useRef, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";

interface EggItem {
  id: string;
  name: string;
  author: string;
  description: string;
  dockerImagesCount: number;
  variablesCount: number;
  createdAt?: string;
  rawJson?: any;
}

interface NestData {
  id: string;
  name: string;
}

type ModalMode = "none" | "import" | "edit" | "view" | "delete";
type EditTab = "basic" | "advanced";

function AdminNestEggsContent() {
  const searchParams = useSearchParams();
  const nestId = searchParams.get("id");
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;
  const [nest, setNest] = useState<NestData | null>(null);
  const [eggs, setEggs] = useState<EggItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("none");
  const [selectedEgg, setSelectedEgg] = useState<EggItem | null>(null);
  const [editTab, setEditTab] = useState<EditTab>("basic");
  const [jsonInput, setJsonInput] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isJsonLoaded, setIsJsonLoaded] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartup, setEditStartup] = useState("");
  const [editStopCommand, setEditStopCommand] = useState("");
  const [editDockerImages, setEditDockerImages] = useState("");
  const [editRawJson, setEditRawJson] = useState("");

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchNestDetails = async () => {
    if (!nestId) {
      setError("No nest ID provided in URL parameters.");
      setLoading(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized: Token missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest(`api/v1/admin/nests/${nestId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError("Access Denied: You do not have the ADMIN_NESTS permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to load nest details.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setNest(data.nest);
      setEggs(data.eggs || []);

      if (data.nest?.name) {
        sessionStorage.setItem(`nest_name_${nestId}`, data.nest.name);
        window.dispatchEvent(
          new CustomEvent("nest-selected", {
            detail: { id: nestId, name: data.nest.name },
          })
        );
      }
    } catch (err) {
      setError("Network error occurred while fetching nest data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNestDetails();
  }, [nestId]);

  const openImportModal = () => {
    setJsonInput("");
    setCustomName("");
    setCustomDescription("");
    setSelectedFile(null);
    setIsJsonLoaded(false);
    setModalError("");
    setModalMode("import");
  };

  const openEditModal = (egg: EggItem) => {
    setSelectedEgg(egg);
    const raw = egg.rawJson || {};
    setEditName(egg.name || raw.name || "");
    setEditAuthor(egg.author || raw.author || "");
    setEditDescription(egg.description || raw.description || "");
    setEditStartup(raw.startup || "");
    setEditStopCommand(raw.config?.stop || "");
    setEditDockerImages(
      raw.docker_images ? JSON.stringify(raw.docker_images, null, 2) : ""
    );
    setEditRawJson(JSON.stringify(raw, null, 2));
    setEditTab("basic");
    setModalError("");
    setModalMode("edit");
  };

  const openViewModal = (egg: EggItem) => {
    setSelectedEgg(egg);
    setModalMode("view");
  };

  const openDeleteModal = (egg: EggItem) => {
    setSelectedEgg(egg);
    setModalError("");
    setModalMode("delete");
  };

  const closeModal = () => {
    setModalMode("none");
    setSelectedEgg(null);
    setJsonInput("");
    setCustomName("");
    setCustomDescription("");
    setSelectedFile(null);
    setIsJsonLoaded(false);
    setModalError("");
    setModalLoading(false);
  };

  const processJsonContent = (text: string) => {
    setJsonInput(text);
    if (!text.trim()) {
      setIsJsonLoaded(false);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        if (parsed.name && typeof parsed.name === "string")
          setCustomName(parsed.name);
        if (parsed.description && typeof parsed.description === "string")
          setCustomDescription(parsed.description);
        setIsJsonLoaded(true);
        setModalError("");
      }
    } catch (e) {
      setIsJsonLoaded(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      setModalError("File exceeds the maximum allowed size limit of 100KB.");
      setSelectedFile(null);
      return;
    }

    setModalError("");
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      processJsonContent(result);
    };
    reader.readAsText(file);
  };

  const resetImportFile = () => {
    setJsonInput("");
    setCustomName("");
    setCustomDescription("");
    setSelectedFile(null);
    setIsJsonLoaded(false);
    setModalError("");
  };
  const buildRawJsonFromBasic = () => {
    const base = selectedEgg?.rawJson ? { ...selectedEgg.rawJson } : {};
    base.name = editName;
    base.author = editAuthor;
    base.description = editDescription;
    base.startup = editStartup;

    if (!base.config) base.config = {};
    base.config.stop = editStopCommand;

    if (editDockerImages.trim()) {
      try {
        base.docker_images = JSON.parse(editDockerImages);
      } catch (e) {
        const imgObj: Record<string, string> = {};
        editDockerImages.split("\n").forEach((line) => {
          const idx = line.indexOf(":");
          if (idx !== -1) {
            const k = line.substring(0, idx).trim();
            const v = line.substring(idx + 1).trim();
            if (k && v) imgObj[k] = v;
          }
        });
        if (Object.keys(imgObj).length > 0) {
          base.docker_images = imgObj;
        }
      }
    }

    return base;
  };

  const handleTabSwitch = (targetTab: EditTab) => {
    if (editTab === targetTab) return;

    if (targetTab === "advanced") {
      const updatedObj = buildRawJsonFromBasic();
      setEditRawJson(JSON.stringify(updatedObj, null, 2));
    } else {
      try {
        const parsed = JSON.parse(editRawJson);
        setEditName(parsed.name || editName);
        setEditAuthor(parsed.author || editAuthor);
        setEditDescription(parsed.description || editDescription);
        setEditStartup(parsed.startup || editStartup);
        setEditStopCommand(parsed.config?.stop || editStopCommand);
        if (parsed.docker_images) {
          setEditDockerImages(
            typeof parsed.docker_images === "object"
              ? JSON.stringify(parsed.docker_images, null, 2)
              : String(parsed.docker_images)
          );
        }
      } catch (e) {
      }
    }
    setEditTab(targetTab);
  };

  const handleImportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nestId) return;
    setModalError("");
    setModalLoading(true);

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing.");
      setModalLoading(false);
      return;
    }

    if (!jsonInput.trim()) {
      setModalError("Please upload an Egg JSON file or paste the JSON content.");
      setModalLoading(false);
      return;
    }

    try {
      const res = await apiRequest(`api/v1/admin/nests/${nestId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eggJson: jsonInput,
          name: customName,
          description: customDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to import Egg.");
        setModalLoading(false);
        return;
      }

      showToast(data.message || "Egg imported successfully.");
      closeModal();
      fetchNestDetails();
    } catch (err) {
      setModalError("Network error occurred while importing Egg.");
      setModalLoading(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEgg || !nestId) return;
    setModalError("");
    setModalLoading(true);

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing.");
      setModalLoading(false);
      return;
    }

    let finalRawJsonString = editRawJson;
    let finalName = editName;
    let finalDescription = editDescription;

    if (editTab === "basic") {
      const updatedObj = buildRawJsonFromBasic();
      finalRawJsonString = JSON.stringify(updatedObj, null, 2);
      finalName = editName;
      finalDescription = editDescription;
    } else {
      try {
        const parsed = JSON.parse(editRawJson);
        finalName = parsed.name || selectedEgg.name;
        finalDescription = parsed.description || selectedEgg.description;
      } catch (err) {
        setModalError("Invalid JSON syntax in JSON Mode editor.");
        setModalLoading(false);
        return;
      }
    }

    try {
      const res = await apiRequest(`api/v1/admin/nests/${nestId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eggId: selectedEgg.id,
          name: finalName,
          description: finalDescription,
          eggJson: finalRawJsonString,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to update egg.");
        setModalLoading(false);
        return;
      }

      showToast("Egg updated successfully.");
      closeModal();
      fetchNestDetails();
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const handleDeleteEgg = async () => {
    if (!selectedEgg || !nestId) return;
    setModalLoading(true);
    setModalError("");

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing.");
      setModalLoading(false);
      return;
    }

    try {
      const res = await apiRequest(`api/v1/admin/nests/${nestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eggId: selectedEgg.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to delete egg.");
        setModalLoading(false);
        return;
      }

      showToast("Egg deleted successfully.");
      closeModal();
      fetchNestDetails();
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
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/home/admin/nests"
              className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Nests</span>
            </Link>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            Nest: {nest?.name || "Manage Eggs"}
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Import Pterodactyl-compatible JSON eggs to define container runtime environments.
          </p>
        </div>

        {!error && (
          <button
            type="button"
            onClick={openImportModal}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            <svg className="h-4 w-4 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Egg</span>
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
          {eggs.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                No eggs in this nest
              </h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Click "Import Egg" to upload a Pterodactyl egg JSON file (max 100KB).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[340px]">
                <thead>
                  <tr
                    className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"
                    }`}
                  >
                    <th className="pb-3 px-3 font-bold">Egg Name</th>
                    <th className="pb-3 px-3 font-bold">Author</th>
                    <th className="pb-3 px-3 font-bold">Docker Images</th>
                    <th className="pb-3 px-3 font-bold">Variables</th>
                    <th className="pb-3 px-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                  {eggs.map((egg) => (
                    <tr
                      key={egg.id}
                      className={`transition-colors ${
                        isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <div>
                          <span className={`text-xs font-bold block ${isDark ? "text-white" : "text-zinc-900"}`}>
                            {egg.name}
                          </span>
                          {egg.description && (
                            <span className={`text-[11px] truncate max-w-xs block ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                              {egg.description}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={`py-3.5 px-3 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        {egg.author}
                      </td>

                      <td className={`py-3.5 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        {egg.dockerImagesCount} images
                      </td>

                      <td className={`py-3.5 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        {egg.variablesCount} vars
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(egg)}
                            className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
                              isDark
                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                : "bg-zinc-200/70 text-zinc-700 hover:bg-zinc-200"
                            }`}
                            title="Edit Egg"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => openViewModal(egg)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isDark
                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
                            }`}
                          >
                            Inspect
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(egg)}
                            className="p-2 rounded-lg transition-colors text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            title="Delete Egg"
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
      <ModalMenu isOpen={modalMode === "import"} onClose={closeModal} desktopMaxWidth="560px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Import Egg Configuration
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            {isJsonLoaded
              ? "Review and customize the imported Egg properties and raw JSON specification below."
              : "Upload a valid Pterodactyl Egg JSON file or paste the JSON configuration."}
          </p>

          <form onSubmit={handleImportSubmit}>
            <div className="space-y-4 mb-6">
              {!isJsonLoaded ? (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      isDark
                        ? "border-white/10 hover:border-white/30 bg-[#07080a]"
                        : "border-zinc-300 hover:border-zinc-400 bg-zinc-50"
                    }`}
                  >
                    <svg className="h-8 w-8 text-zinc-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-semibold text-zinc-400 text-center px-2">
                      {selectedFile ? selectedFile.name : "Click to select .json Egg file"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Max allowed limit: 100KB</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Or Paste JSON Specification
                    </label>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => processJsonContent(e.target.value)}
                      placeholder='{"name": "Python Generic", ...}'
                      rows={5}
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none ${
                        isDark
                          ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                          : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                      }`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                      isDark
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-emerald-500/30 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold truncate">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="truncate">Egg JSON Parsed & Verified</span>
                    </div>
                    <button
                      type="button"
                      onClick={resetImportFile}
                      className="text-[11px] font-bold underline shrink-0 hover:opacity-80"
                    >
                      Change File
                    </button>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Egg Display Name
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Python Generic"
                      required
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none ${
                        isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Description
                    </label>
                    <textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Brief description of this Egg..."
                      rows={2}
                      className={`w-full rounded-lg border px-3.5 py-2 text-xs outline-none ${
                        isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Egg JSON File Editor
                    </label>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => processJsonContent(e.target.value)}
                      rows={7}
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none ${
                        isDark
                          ? "border-white/10 bg-black/60 text-emerald-400 focus:border-white/30"
                          : "border-zinc-300 bg-zinc-900 text-emerald-400"
                      }`}
                    />
                  </div>
                </>
              )}
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
                disabled={modalLoading || !jsonInput.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : "Verify & Import"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={modalMode === "edit"} onClose={closeModal} desktopMaxWidth="580px">
        <div className={`p-5 sm:p-7 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className={`flex flex-col gap-3 mb-5 pb-3 border-b ${isDark ? "border-white/10" : "border-zinc-200"}`}>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Edit Egg Configuration
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Modify egg parameters or switch to JSON Mode for full control.
              </p>
            </div>

            <div
              className={`flex items-center gap-1 p-1 rounded-xl self-start w-full sm:w-auto ${
                isDark ? "bg-zinc-800/80 border border-white/5" : "bg-zinc-100"
              }`}
            >
              <button
                type="button"
                onClick={() => handleTabSwitch("basic")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all text-center ${
                  editTab === "basic"
                    ? isDark
                      ? "bg-white text-black shadow-sm"
                      : "bg-zinc-900 text-white shadow-sm"
                    : isDark
                    ? "text-zinc-400 hover:text-white"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("advanced")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all text-center ${
                  editTab === "advanced"
                    ? isDark
                      ? "bg-white text-black shadow-sm"
                      : "bg-zinc-900 text-white shadow-sm"
                    : isDark
                    ? "text-zinc-400 hover:text-white"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                <span className="hidden sm:inline">Advanced (Raw JSON)</span>
                <span className="sm:hidden">JSON Mode</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleEditSubmit}>
            {editTab === "basic" ? (
              <div className="space-y-4 mb-6 max-h-[58vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Egg Display Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                        isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Author
                    </label>
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      placeholder="e.g. author@domain.com"
                      className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                        isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Startup Command (`startup`)
                  </label>
                  <textarea
                    value={editStartup}
                    onChange={(e) => setEditStartup(e.target.value)}
                    rows={3}
                    placeholder="e.g. python3 /home/container/{{PY_FILE}}"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Stop Command Signal (`config.stop`)
                  </label>
                  <input
                    type="text"
                    value={editStopCommand}
                    onChange={(e) => setEditStopCommand(e.target.value)}
                    placeholder="e.g. ^C or stop"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Docker Images (JSON object or image mapping)
                  </label>
                  <textarea
                    value={editDockerImages}
                    onChange={(e) => setEditDockerImages(e.target.value)}
                    rows={4}
                    placeholder='{"Python 3.12": "ghcr.io/parkervcp/yolks:python_3.12"}'
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none ${
                      isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Raw Pterodactyl Egg JSON Specification
                </label>
                <textarea
                  value={editRawJson}
                  onChange={(e) => setEditRawJson(e.target.value)}
                  rows={11}
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none ${
                    isDark
                      ? "border-white/10 bg-black/50 text-emerald-400 focus:border-white/30"
                      : "border-zinc-300 bg-zinc-900 text-emerald-400"
                  }`}
                />
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
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
                disabled={modalLoading}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={modalMode === "view"} onClose={closeModal} desktopMaxWidth="560px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div className="min-w-0 pr-2">
              <h2 className={`text-lg font-bold tracking-tight truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                {selectedEgg?.name}
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Author: {selectedEgg?.author || "N/A"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => selectedEgg && openEditModal(selectedEgg)}
              className={`w-full sm:w-auto text-xs font-bold px-3 py-2 rounded-lg shrink-0 transition-colors flex items-center justify-center gap-1.5 ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                  : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Egg</span>
            </button>
          </div>

          {selectedEgg?.description && (
            <div className={`p-3 rounded-lg mb-4 text-xs leading-relaxed ${isDark ? "bg-white/[0.03] text-zinc-300" : "bg-zinc-50 text-zinc-600"}`}>
              {selectedEgg.description}
            </div>
          )}
          <div
            className={`max-h-80 overflow-y-auto mb-6 p-3.5 rounded-xl border font-mono text-[11px] text-emerald-400 whitespace-pre-wrap break-all ${
              isDark ? "border-white/10 bg-black/60" : "border-zinc-300 bg-zinc-900"
            }`}
          >
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(selectedEgg?.rawJson, null, 2)}</pre>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold ${
              isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Close
          </button>
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
                Delete Egg
              </h2>
              <span className="text-xs text-rose-500 font-semibold">Irreversible Action</span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete{" "}
            <strong className={isDark ? "text-white" : "text-zinc-900"}>
              {selectedEgg?.name}
            </strong>
            ?
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
              onClick={handleDeleteEgg}
              disabled={modalLoading}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all active:scale-[0.98] shadow-md disabled:opacity-50"
            >
              {modalLoading ? <Loading width={16} height={16} color="#ffffff" /> : "Delete Egg"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}

export default function AdminNestEggsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loading width={32} height={32} />
        </div>
      }
    >
      <AdminNestEggsContent />
    </Suspense>
  );
}