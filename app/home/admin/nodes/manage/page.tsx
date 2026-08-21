"use client";

import React, { useState, useEffect, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import Selector from "@/components/Base/Selector";
import { config, apiRequest } from "@/lib/main";
import {
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  TrashIcon,
  ArrowLeftIcon,
  KeyIcon,
  ServerIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

interface NodeData {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  locationFlag: string;
  fqdn: string;
  scheme: string;
  daemonPort: number;
  uploadSize: number;
  maintenanceMode: boolean;
  daemonKey: string;
  isOnline: boolean;
  allocationCount: number;
  totalServers: number;
  createdAt: string;
}

interface Allocation {
  id: string;
  ip: string;
  port: number;
  assignedServerId: string | null;
  assignedServerName: string | null;
}

interface ServerItem {
  id: string;
  name: string;
  description: string;
  ownerUsername: string;
  nodeId: string;
  nodeName: string;
  allocation: string;
  memory: number;
  disk: number;
  cpu: number;
  priceCredits: number;
  createdAt: string;
}

interface Location {
  id: string;
  name: string;
  flag: string;
}

type TabType = "overview" | "settings" | "allocations" | "servers" | "danger";

function ManageNodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeId = searchParams.get("nodeId") || searchParams.get("id");
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [node, setNode] = useState<NodeData | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serverPage, setServerPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [serversLoading, setServersLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocPage, setAllocPage] = useState(1);
  const [allocTotalPages, setAllocTotalPages] = useState(1);
  const [allocTotal, setAllocTotal] = useState(0);
  const [allocLoadingList, setAllocLoadingList] = useState(false);
  const [selectedAllocIds, setSelectedAllocIds] = useState<string[]>([]);
  const [isMassDeleteModalOpen, setIsMassDeleteModalOpen] = useState(false);
  const [massDeleteLoading, setMassDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [editFqdn, setEditFqdn] = useState("");
  const [editPort, setEditPort] = useState("8080");
  const [editUpload, setEditUpload] = useState("100");
  const [editMaintenance, setEditMaintenance] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [allocIp, setAllocIp] = useState("");
  const [allocPorts, setAllocPorts] = useState("");
  const [allocLoading, setAllocLoading] = useState(false);
  const [deployCommand, setDeployCommand] = useState<string | null>(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setActionError(null);
  };

  const fetchNodeDetails = async (pageForServers = serverPage) => {
    if (!nodeId) {
      setError("No Node ID specified.");
      setLoading(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("Unauthorized access.");
      setLoading(false);
      return;
    }

    setServersLoading(true);
    try {
      const res = await apiRequest(`api/v1/admin/nodes/manage?nodeId=${nodeId}&serverPage=${pageForServers}&serverLimit=10`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load node information.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setNode(data.node);
      setLocations(data.locations || []);
      setServers(data.servers || []);

      if (data.serverPagination) {
        setServerPage(data.serverPagination.page);
        setServerTotalPages(data.serverPagination.totalPages);
        setServerTotal(data.serverPagination.total);
      }

      setEditName(data.node.name);
      setEditLocationId(data.node.locationId);
      setEditFqdn(data.node.fqdn);
      setEditPort(String(data.node.daemonPort));
      setEditUpload(String(data.node.uploadSize));
      setEditMaintenance(data.node.maintenanceMode);
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
      setServersLoading(false);
    }
  };

  const fetchAllocations = async (page = 1) => {
    if (!nodeId) return;
    const token = Cookies.get("token");
    if (!token) return;

    setAllocLoadingList(true);
    try {
      const res = await apiRequest(`api/v1/admin/nodes/manage/allocations?nodeId=${nodeId}&page=${page}&limit=25`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAllocations(data.allocations || []);
        setAllocPage(data.pagination.page);
        setAllocTotalPages(data.pagination.totalPages);
        setAllocTotal(data.pagination.total);
      }
    } catch {
    } finally {
      setAllocLoadingList(false);
    }
  };

  useEffect(() => {
    fetchNodeDetails(1);
  }, [nodeId]);

  useEffect(() => {
    if (activeTab === "allocations") {
      fetchAllocations(allocPage);
    }
  }, [activeTab, allocPage]);

  const handleServerPageChange = (newPage: number) => {
    setServerPage(newPage);
    fetchNodeDetails(newPage);
  };

  const handleUpdateSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!node) return;
    setSaveLoading(true);
    setActionError(null);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/nodes/manage", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: node.id,
          name: editName,
          locationId: editLocationId,
          fqdn: editFqdn,
          scheme: "https",
          daemonPort: parseInt(editPort, 10),
          uploadSize: parseInt(editUpload, 10),
          maintenanceMode: editMaintenance,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to update node settings.");
        setSaveLoading(false);
        return;
      }

      showToast("Node settings updated successfully.");
      await fetchNodeDetails(serverPage);
    } catch {
      setActionError("Network error occurred.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddAllocations = async (e: FormEvent) => {
    e.preventDefault();
    if (!node || !allocIp || !allocPorts) return;

    setAllocLoading(true);
    setActionError(null);
    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/nodes/manage/allocations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nodeId: node.id,
          ip: allocIp,
          ports: allocPorts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to add allocations.");
        setAllocLoading(false);
        return;
      }

      showToast(data.message || "Allocations created.");
      setAllocPorts("");
      await fetchAllocations(allocPage);
      await fetchNodeDetails(serverPage);
    } catch {
      setActionError("Network error creating allocations.");
    } finally {
      setAllocLoading(false);
    }
  };

  const toggleSelectAllocation = (id: string) => {
    if (selectedAllocIds.includes(id)) {
      setSelectedAllocIds(selectedAllocIds.filter((item) => item !== id));
    } else {
      setSelectedAllocIds([...selectedAllocIds, id]);
    }
  };

  const toggleSelectAllCurrentPage = () => {
    const pageIds = allocations.map((a) => a.id);
    const allSelected = pageIds.every((id) => selectedAllocIds.includes(id));
    if (allSelected) {
      setSelectedAllocIds(selectedAllocIds.filter((id) => !pageIds.includes(id)));
    } else {
      const combined = new Set([...selectedAllocIds, ...pageIds]);
      setSelectedAllocIds(Array.from(combined));
    }
  };

  const handleExecuteMassDelete = async () => {
    if (selectedAllocIds.length === 0) return;

    const assignedInSelection = allocations.filter(
      (a) => selectedAllocIds.includes(a.id) && a.assignedServerId !== null
    );

    if (assignedInSelection.length > 0) {
      setActionError(`Action blocked: Cannot delete ${assignedInSelection.length} allocation(s) bound to active servers.`);
      setIsMassDeleteModalOpen(false);
      return;
    }

    setMassDeleteLoading(true);
    setActionError(null);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/nodes/manage/allocations", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allocationIds: selectedAllocIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to delete selected allocations.");
        setMassDeleteLoading(false);
        setIsMassDeleteModalOpen(false);
        return;
      }

      showToast(data.message || "Selected allocations deleted successfully.");
      setSelectedAllocIds([]);
      setIsMassDeleteModalOpen(false);
      await fetchAllocations(allocPage);
      await fetchNodeDetails(serverPage);
    } catch {
      setActionError("Network error executing deletion.");
    } finally {
      setMassDeleteLoading(false);
    }
  };

  const handleGenerateAutoConfig = async () => {
    if (!node) return;
    const token = Cookies.get("token");
    if (!token) return;

    setDeployLoading(true);
    setDeployModalOpen(true);
    setActionError(null);

    try {
      const res = await apiRequest("api/v1/admin/nodes/manage/autoconfig", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nodeId: node.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to generate auto-config token.");
        setDeployModalOpen(false);
        return;
      }

      setDeployCommand(data.command);
    } catch {
      setActionError("Network error generating auto-config.");
      setDeployModalOpen(false);
    } finally {
      setDeployLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!node) return;
    setDeleteLoading(true);
    setActionError(null);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/nodes", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: node.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to delete node.");
        setDeleteLoading(false);
        setIsDeleteModalOpen(false);
        return;
      }

      router.push("/home/admin/nodes");
    } catch {
      setActionError("Network error deleting node.");
      setDeleteLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: `${loc.name} (${loc.flag})`,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link href="/home/admin/nodes" className="text-xs font-bold text-zinc-400 hover:text-white inline-flex items-center gap-1.5">
          <ArrowLeftIcon className="w-4 h-4 shrink-0" />
          <span>Return to Nodes</span>
        </Link>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
          {error || "Node not found."}
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "settings", label: "Settings" },
    { key: "allocations", label: "Allocations" },
    { key: "servers", label: "Servers" },
    { key: "danger", label: "Danger Zone" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-1 sm:px-0">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`p-6 rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"} shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Node: {node.name}
              </h1>

              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border flex items-center gap-1.5 ${
                node.isOnline
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}>
                {node.isOnline ? "Daemon Online" : "Daemon Offline"}
              </span>

              {node.maintenanceMode && (
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Maintenance
                </span>
              )}
            </div>

            <p className={`text-xs mt-1 font-mono break-all ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              https://{node.fqdn}:{node.daemonPort}
            </p>
          </div>

          <div className="flex flex-col xs:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleGenerateAutoConfig}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/20 flex items-center justify-center gap-1.5"
            >
              <KeyIcon className="w-4 h-4" />
              <span>Auto-Deploy Token</span>
            </button>

            <Link
              href="/home/admin/nodes"
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center gap-1.5 ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Return</span>
            </Link>
          </div>
        </div>
      </div>
      <div className={`flex flex-wrap items-center border-b ${isDark ? "border-white/10" : "border-zinc-200"}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-3 text-xs font-bold relative transition-colors ${
                isActive
                  ? isDark ? "text-white" : "text-zinc-900"
                  : isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  style={{ backgroundColor: accentColor }}
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className={`rounded-2xl border p-6 sm:p-8 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="border-b pb-4 border-white/10">
              <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                Node Summary
              </h2>
            </div>
            {actionError && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-rose-200 p-0.5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  Location Region
                </span>
                <p className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {node.locationName} ({node.locationFlag})
                </p>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  Total Allocations
                </span>
                <p className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {node.allocationCount} Ports
                </p>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  Active Servers
                </span>
                <p className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {node.totalServers || serverTotal} Deployed
                </p>
              </div>
            </div>
            <div>
              <div className="flex flex-col min-[455px]:flex-row min-[455px]:items-center justify-between gap-1.5 mb-1.5">
                <span className={`text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Daemon Secret Token
                </span>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className={`text-xs font-bold flex items-center gap-1.5 transition-colors self-start min-[455px]:self-auto ${
                    isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {showToken ? (
                    <>
                      <EyeSlashIcon className="w-4 h-4" />
                      <span>Hide Token</span>
                    </>
                  ) : (
                    <>
                      <EyeIcon className="w-4 h-4" />
                      <span>Show Token</span>
                    </>
                  )}
                </button>
              </div>

              <div className={`p-3.5 rounded-xl border font-mono text-xs break-all flex items-center justify-between ${
                isDark ? "border-white/10 bg-[#07080a] text-zinc-300" : "border-zinc-300 bg-zinc-50 text-zinc-800"
              }`}>
                <span>{showToken ? node.daemonKey : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}</span>
              </div>
            </div>
          </div>
        )}
        {activeTab === "settings" && (
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <div className="border-b pb-4 border-white/10">
              <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                Node Configuration
              </h2>
            </div>
            {actionError && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-rose-200 p-0.5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Location</label>
                  <Selector
                    value={editLocationId}
                    options={locationOptions}
                    onChange={(val) => setEditLocationId(val)}
                    placeholder="Select location..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>FQDN</label>
                  <input
                    type="text"
                    value={editFqdn}
                    onChange={(e) => setEditFqdn(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Daemon Port</label>
                  <input
                    type="number"
                    value={editPort}
                    onChange={(e) => setEditPort(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Max Upload Limit (MB)</label>
                <input
                  type="number"
                  value={editUpload}
                  onChange={(e) => setEditUpload(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                />
              </div>
              <div
                onClick={() => setEditMaintenance(!editMaintenance)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  editMaintenance
                    ? "border-amber-500/40 bg-amber-500/[0.06]"
                    : isDark
                    ? "border-white/10 bg-[#07080a] hover:border-white/20"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <div className="flex-1 pr-2">
                  <span className={`text-xs font-bold block ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>Maintenance Mode</span>
                  <span className={`text-[11px] leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Prevent assigning new servers to this node.</span>
                </div>

                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 self-end sm:self-auto ${
                  editMaintenance
                    ? "bg-amber-500 border-amber-500 text-slate-950"
                    : isDark ? "border-white/20 bg-white/5" : "border-zinc-300 bg-white"
                }`}>
                  {editMaintenance && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              style={{ backgroundColor: accentColor }}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saveLoading ? <Loading width={16} height={16} color="#000000" /> : "Save Changes"}
            </button>
          </form>
        )}
        {activeTab === "allocations" && (
          <div className="space-y-6">
            <div className="border-b pb-4 border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                  Node Allocations ({allocTotal})
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Maximum 100 port allocations created per batch.
                </p>
              </div>

              {selectedAllocIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsMassDeleteModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center gap-1.5 shadow-md self-start sm:self-auto"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete Selected ({selectedAllocIds.length})</span>
                </button>
              )}
            </div>
            {actionError && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-rose-200 p-0.5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleAddAllocations} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.1.1"
                    required
                    value={allocIp}
                    onChange={(e) => setAllocIp(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Ports (Max 100, e.g. 25565-25580)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="25565-25570"
                      required
                      value={allocPorts}
                      onChange={(e) => setAllocPorts(e.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                    />
                    <button
                      type="submit"
                      disabled={allocLoading}
                      style={{ backgroundColor: accentColor }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-black shrink-0 hover:opacity-90 disabled:opacity-50"
                    >
                      {allocLoading ? <Loading width={16} height={16} color="#000000" /> : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {allocLoadingList ? (
              <div className="py-12 flex justify-center">
                <Loading width={28} height={28} />
              </div>
            ) : allocations.length === 0 ? (
              <p className={`text-xs py-8 text-center ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                No allocations created yet.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
                        <th className="pb-3 px-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={toggleSelectAllCurrentPage}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              allocations.length > 0 && allocations.every(a => selectedAllocIds.includes(a.id))
                                ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                : isDark ? "border-white/20 bg-white/5" : "border-zinc-300 bg-white"
                            }`}
                          >
                            {allocations.length > 0 && allocations.every(a => selectedAllocIds.includes(a.id)) && (
                              <CheckIcon className="w-3 h-3 stroke-[3]" />
                            )}
                          </button>
                        </th>
                        <th className="pb-3 px-3 font-bold">IP Address</th>
                        <th className="pb-3 px-3 font-bold">Port</th>
                        <th className="pb-3 px-3 font-bold">Assigned Server</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                      {allocations.map((alloc) => {
                        const isSelected = selectedAllocIds.includes(alloc.id);
                        return (
                          <tr key={alloc.id} className={`transition-colors ${isSelected ? (isDark ? "bg-emerald-500/5" : "bg-emerald-50") : ""}`}>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleSelectAllocation(alloc.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                    : isDark ? "border-white/20 bg-white/5" : "border-zinc-300 bg-white"
                                }`}
                              >
                                {isSelected && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                              </button>
                            </td>
                            <td className={`py-3 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{alloc.ip}</td>
                            <td className={`py-3 px-3 text-xs font-mono font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{alloc.port}</td>
                            <td className="py-3 px-3 text-xs">
                              {alloc.assignedServerName ? (
                                <span className="text-cyan-400 font-semibold">{alloc.assignedServerName}</span>
                              ) : (
                                <span className="text-zinc-500">Unassigned</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <span className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Page <strong>{allocPage}</strong> of <strong>{allocTotalPages}</strong>
                  </span>

                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      disabled={allocPage <= 1}
                      onClick={() => setAllocPage(allocPage - 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex-1 sm:flex-none text-center ${
                        isDark ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={allocPage >= allocTotalPages}
                      onClick={() => setAllocPage(allocPage + 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex-1 sm:flex-none text-center ${
                        isDark ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "servers" && (
          <div className="space-y-4">
            <div className="border-b pb-4 border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                  Attached Servers ({serverTotal})
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Server containers currently assigned to node <strong>{node.name}</strong>.
                </p>
              </div>
            </div>
            {actionError && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-rose-200 p-0.5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {serversLoading ? (
              <div className="py-12 flex justify-center">
                <Loading width={28} height={28} />
              </div>
            ) : servers.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-2xl bg-zinc-500/10 mb-3 text-zinc-400">
                  <ServerIcon className="h-8 w-8 stroke-[1.5]" />
                </div>
                <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>No servers deployed</h3>
                <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  No active server containers are assigned to this node.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[550px]">
                    <thead>
                      <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
                        <th className="pb-3 px-3 font-bold">Server Name</th>
                        <th className="pb-3 px-3 font-bold">Allocation</th>
                        <th className="pb-3 px-3 font-bold">Owner</th>
                        <th className="pb-3 px-3 font-bold">Specs</th>
                        <th className="pb-3 px-3 font-bold">Price</th>
                        <th className="pb-3 px-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
                      {servers.map((srv) => (
                        <tr key={srv.id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50/80"}`}>
                          <td className="py-3.5 px-3">
                            <Link href={`/home/admin/servers/manage?serverId=${srv.id}`} className={`text-xs font-bold hover:underline block ${isDark ? "text-white" : "text-zinc-900"}`}>
                              {srv.name}
                            </Link>
                            <span className="text-[10px] text-zinc-500 font-mono">{srv.id}</span>
                          </td>

                          <td className="py-3.5 px-3 text-xs font-mono">
                            <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>{srv.allocation}</span>
                          </td>

                          <td className={`py-3.5 px-3 text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            {srv.ownerUsername}
                          </td>

                          <td className={`py-3.5 px-3 text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            {srv.memory}MB / {srv.disk}MB / {srv.cpu}%
                          </td>

                          <td className={`py-3.5 px-3 text-xs font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                            {srv.priceCredits === 0 ? "Free" : `${srv.priceCredits} Cr/mo`}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <Link
                              href={`/home/admin/servers/manage?serverId=${srv.id}`}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-block ${
                                isDark ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                              }`}
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <span className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Page <strong>{serverPage}</strong> of <strong>{serverTotalPages}</strong> ({serverTotal} Total)
                  </span>

                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      disabled={serverPage <= 1}
                      onClick={() => handleServerPageChange(serverPage - 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex-1 sm:flex-none text-center ${
                        isDark ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={serverPage >= serverTotalPages}
                      onClick={() => handleServerPageChange(serverPage + 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex-1 sm:flex-none text-center ${
                        isDark ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "danger" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rose-500">Delete Host Node</h3>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Permanently remove this daemon host node and all unassigned IP port allocations.
            </p>
            {actionError && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-rose-200 p-0.5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md"
            >
              Delete Node
            </button>
          </div>
        )}
      </div>
      <ModalMenu isOpen={isMassDeleteModalOpen} onClose={() => setIsMassDeleteModalOpen(false)} desktopMaxWidth="420px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Delete Allocations
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete <strong className={isDark ? "text-white" : "text-zinc-900"}>{selectedAllocIds.length}</strong> selected allocation(s)? Allocations bound to active servers will be protected.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsMassDeleteModalOpen(false)}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteMassDelete}
              disabled={massDeleteLoading}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {massDeleteLoading ? <Loading width={16} height={16} color="#ffffff" /> : "Confirm Delete"}
            </button>
          </div>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={deployModalOpen} onClose={() => setDeployModalOpen(false)} desktopMaxWidth="520px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Daemon Auto-Configuration Command
          </h2>
          <p className={`text-xs mb-4 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Token expires in 2 hours and can only be consumed once.
          </p>

          {deployLoading ? (
            <div className="py-8 flex justify-center">
              <Loading width={28} height={28} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-3.5 rounded-xl border font-mono text-xs text-emerald-400 break-all select-all ${isDark ? "border-white/10 bg-black/60" : "border-zinc-300 bg-zinc-900"}`}>
                {deployCommand}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (deployCommand) navigator.clipboard.writeText(deployCommand);
                  showToast("Command copied!");
                }}
                style={{ backgroundColor: accentColor }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 hover:opacity-90 transition-all"
              >
                Copy Command
              </button>
            </div>
          )}
        </div>
      </ModalMenu>
      <ModalMenu isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} desktopMaxWidth="420px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Confirm Node Deletion
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete <strong className={isDark ? "text-white" : "text-zinc-900"}>{node.name}</strong>?
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteNode}
              disabled={deleteLoading}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center transition-all disabled:opacity-50"
            >
              {deleteLoading ? <Loading width={16} height={16} color="#ffffff" /> : "Confirm Delete"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}

export default function ManageNodePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loading width={32} height={32} /></div>}>
      <ManageNodeContent />
    </Suspense>
  );
}