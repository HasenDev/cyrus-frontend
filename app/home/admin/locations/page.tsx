"use client";

import React, { useState, useEffect, FormEvent, useMemo } from "react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
interface LocationItem {
  id: string;
  name: string;
  flag: string;
  createdAt?: string;
}
const getTwemojiUrl = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return "";
  const code = countryCode.toUpperCase();
  const c1 = (0x1f1e6 - 65 + code.charCodeAt(0)).toString(16);
  const c2 = (0x1f1e6 - 65 + code.charCodeAt(1)).toString(16);
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${c1}-${c2}.svg`;
};
const COUNTRY_FLAGS = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "MD", name: "Moldova" },
  { code: "MA", name: "Morocco" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
];

type ModalMode = "none" | "create" | "edit" | "delete";

export default function AdminLocationsPage() {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("none");
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formFlag, setFormFlag] = useState("US");
  const [flagSearch, setFlagSearch] = useState("");
  const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };
  const fetchLocations = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized: Authentication token missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/locations", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError("Access Denied: You do not have the ADMIN_LOCATIONS permission.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Failed to load locations from server.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setLocations(data.locations || []);
    } catch (err) {
      setError("Network error occurred while fetching locations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);
  const openCreateModal = () => {
    setFormName("");
    setFormFlag("US");
    setFlagSearch("");
    setIsFlagDropdownOpen(false);
    setModalError("");
    setModalMode("create");
  };

  const openEditModal = (loc: LocationItem) => {
    setSelectedLocation(loc);
    setFormName(loc.name);
    setFormFlag(loc.flag);
    setFlagSearch("");
    setIsFlagDropdownOpen(false);
    setModalError("");
    setModalMode("edit");
  };

  const openDeleteModal = (loc: LocationItem) => {
    setSelectedLocation(loc);
    setModalError("");
    setModalMode("delete");
  };

  const closeModal = () => {
    setModalMode("none");
    setSelectedLocation(null);
    setFormName("");
    setFormFlag("US");
    setModalError("");
    setModalLoading(false);
    setIsFlagDropdownOpen(false);
  };
  const filteredFlags = useMemo(() => {
    if (!flagSearch.trim()) return COUNTRY_FLAGS;
    const query = flagSearch.toLowerCase();
    return COUNTRY_FLAGS.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query)
    );
  }, [flagSearch]);

  const selectedCountryObj = COUNTRY_FLAGS.find((c) => c.code === formFlag) || {
    code: formFlag,
    name: formFlag,
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
      const endpoint = "api/v1/admin/locations";
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? { id: selectedLocation?.id, name: formName, flag: formFlag }
        : { name: formName, flag: formFlag };

      const res = await apiRequest(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to save location.");
        setModalLoading(false);
        return;
      }

      showToast(data.message || (isEdit ? "Location updated." : "Location created."));
      closeModal();
      fetchLocations();
    } catch (err) {
      setModalError("Network error occurred. Please try again.");
      setModalLoading(false);
    }
  };
  const handleDelete = async () => {
    if (!selectedLocation) return;
    setModalLoading(true);
    setModalError("");

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing.");
      setModalLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/locations", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: selectedLocation.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to delete location.");
        setModalLoading(false);
        return;
      }

      showToast("Location removed successfully.");
      closeModal();
      fetchLocations();
    } catch (err) {
      setModalError("Network error occurred.");
      setModalLoading(false);
    }
  };

  const ErrorIcon = () => (
    <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
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
            Locations
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Configure host server deployment regions and physical node locations.
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
            <span>Add Location</span>
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
          {locations.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                No locations configured
              </h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Add your first geographical location region to start grouping compute host nodes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"
                    }`}
                  >
                    <th className="pb-3 px-3 font-bold">Location</th>
                    <th className="pb-3 px-3 font-bold">Identifier</th>
                    <th className="pb-3 px-3 font-bold">Created Date</th>
                    <th className="pb-3 px-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                  {locations.map((loc) => (
                    <tr
                      key={loc.id}
                      className={`transition-colors ${
                        isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 shrink-0 rounded-lg p-1 flex items-center justify-center bg-zinc-500/10 border border-white/5">
                            <img
                              src={getTwemojiUrl(loc.flag)}
                              alt={loc.name}
                              className="h-5 w-5 object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                            {loc.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-mono border ${
                            isDark
                              ? "bg-[#07080a] border-white/5 text-zinc-400"
                              : "bg-zinc-100 border-zinc-200 text-zinc-600"
                          }`}
                        >
                          {loc.id}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        {loc.createdAt
                          ? new Date(loc.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(loc)}
                            className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
                              isDark
                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                : "bg-zinc-200/70 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
                            }`}
                            title="Edit Location"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(loc)}
                            className="p-2 rounded-lg transition-colors text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            title="Delete Location"
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
      <ModalMenu
        isOpen={modalMode === "create" || modalMode === "edit"}
        onClose={closeModal}
        desktopMaxWidth="460px"
      >
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            {modalMode === "edit" ? "Edit Location" : "Add New Location"}
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Configure geographical metadata and select the region country flag.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Location Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Frankfurt 1 or US East"
                  required
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none transition-all ${
                    isDark
                      ? "border-white/10 bg-[#07080a] text-white focus:border-white/30"
                      : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Country Flag
                </label>
                <button
                  type="button"
                  onClick={() => setIsFlagDropdownOpen(!isFlagDropdownOpen)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs transition-all ${
                    isDark
                      ? "border-white/10 bg-[#07080a] text-white hover:border-white/20"
                      : "border-zinc-300 bg-zinc-50 text-zinc-900 hover:border-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={getTwemojiUrl(formFlag)}
                      alt={formFlag}
                      className="h-4 w-4 object-contain"
                    />
                    <span className="font-semibold">{selectedCountryObj.name}</span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-zinc-400 transition-transform ${isFlagDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isFlagDropdownOpen && (
                  <div
                    className={`mt-2 rounded-xl border p-3 shadow-xl max-h-56 overflow-hidden flex flex-col ${
                      isDark ? "border-white/10 bg-[#14161d]" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={flagSearch}
                      onChange={(e) => setFlagSearch(e.target.value)}
                      placeholder="Search country..."
                      className={`w-full rounded-lg border px-3 py-1.5 text-xs mb-2 outline-none ${
                        isDark
                          ? "border-white/10 bg-black/40 text-white focus:border-white/20"
                          : "border-zinc-300 bg-zinc-50 text-zinc-900"
                      }`}
                    />
                    <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredFlags.length === 0 ? (
                        <div className="text-center py-4 text-xs text-zinc-500">No flags found</div>
                      ) : (
                        filteredFlags.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setFormFlag(country.code);
                              setIsFlagDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              formFlag === country.code
                                ? isDark
                                  ? "bg-white/10 font-bold text-white"
                                  : "bg-zinc-200 font-bold text-zinc-900"
                                : isDark
                                ? "hover:bg-white/5 text-zinc-300"
                                : "hover:bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            <img
                              src={getTwemojiUrl(country.code)}
                              alt={country.name}
                              className="h-4 w-4 shrink-0 object-contain"
                            />
                            <span className="truncate">{country.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading || !formName.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 transition-all flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : modalMode === "edit" ? "Save Changes" : "Create Location"}
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
                Delete Location
              </h2>
              <span className="text-xs text-rose-500 font-semibold">Irreversible Action</span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete{" "}
            <strong className={isDark ? "text-white" : "text-zinc-900"}>
              {selectedLocation?.name}
            </strong>
            ? This action cannot be undone.
          </p>

          {modalError && (
            <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
              <ErrorIcon />
              <span>{modalError}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={modalLoading}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center justify-center shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {modalLoading ? <Loading width={16} height={16} color="#ffffff" /> : "Delete Location"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}