"use client";

import React, { useState, useEffect, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import Selector from "@/components/Base/Selector";
import UserSelector from "@/components/Base/UserSelector";
import { config, apiRequest } from "@/lib/main";
import {
  ArrowLeftIcon,
  StarIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

interface ServerData {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerUsername: string;
  nodeId: string;
  allocationId: string;
  additionalAllocationIds?: string[];
  nestId: string;
  eggId: string;
  dockerImage: string;
  startup: string;
  env: Record<string, string>;
  memory: number;
  disk: number;
  cpu: number;
  priceCredits: number;
  maxAllocations: number;
  installing: boolean;
  status: string;
  createdAt: string;
}

interface Allocation {
  id: string;
  ip: string;
  port: number;
  assignedServerId: string | null;
}

type TabType = "overview" | "edit" | "allocations" | "other";

const formatStatus = (status: string) => {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

function ManageServerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serverId = searchParams.get("serverId") || searchParams.get("id");
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [tabError, setTabError] = useState<string | null>(null);
  const [server, setServer] = useState<ServerData | null>(null);
  const [nodeName, setNodeName] = useState("");
  const [nestName, setNestName] = useState("");
  const [eggName, setEggName] = useState("");
  const [nodeAllocations, setNodeAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUltraSmall, setIsUltraSmall] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOwnerId, setEditOwnerId] = useState<string | null>(null);
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editAllocationId, setEditAllocationId] = useState("");
  const [editAdditionalAllocs, setEditAdditionalAllocs] = useState<string[]>([]);
  const [editDockerImage, setEditDockerImage] = useState("");
  const [editStartup, setEditStartup] = useState("");
  const [editMemory, setEditMemory] = useState("1024");
  const [editDisk, setEditDisk] = useState("5000");
  const [editCpu, setEditCpu] = useState("100");
  const [editPriceCredits, setEditPriceCredits] = useState("0");
  const [editMaxAllocations, setEditMaxAllocations] = useState("0");
  const [saveLoading, setSaveLoading] = useState(false);
  const [isAddAllocModalOpen, setIsAddAllocModalOpen] = useState(false);
  const [selectedAllocToAdd, setSelectedAllocToAdd] = useState("");
  const [allocToDelete, setAllocToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isForceDelete, setIsForceDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsUltraSmall(window.innerWidth < 311);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchServerDetails = async () => {
    if (!serverId) {
      setError("No Server ID specified.");
      setLoading(false);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      setError("Missing auth token.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest(
        `api/v1/admin/servers/manage?serverId=${serverId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        setError("Failed to load server details.");
        return;
      }

      const data = await res.json();
      setServer(data.server);
      setNodeName(data.nodeName);
      setNestName(data.nestName);
      setEggName(data.eggName);
      setNodeAllocations(data.allocations || []);

      setEditName(data.server.name);
      setEditDescription(data.server.description || "");
      setEditOwnerId(data.server.ownerId);
      setEditOwnerName(data.server.ownerUsername);
      setEditAllocationId(data.server.allocationId);
      setEditAdditionalAllocs(data.server.additionalAllocationIds || []);
      setEditDockerImage(data.server.dockerImage);
      setEditStartup(data.server.startup);
      setEditMemory(String(data.server.memory));
      setEditDisk(String(data.server.disk));
      setEditCpu(String(data.server.cpu));
      setEditPriceCredits(String(data.server.priceCredits || 0));
      setEditMaxAllocations(String(data.server.maxAllocations ?? 0));
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerDetails();
  }, [serverId]);

  const handleUpdateServer = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!server || !editOwnerId) return;

    setTabError(null);

    if (server.installing) {
      setTabError("Cannot update configuration while installation is running.");
      return;
    }

    setSaveLoading(true);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/servers/manage", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: server.id,
          name: editName,
          description: editDescription,
          ownerId: editOwnerId,
          allocationId: editAllocationId,
          additionalAllocationIds: editAdditionalAllocs,
          dockerImage: editDockerImage,
          startup: editStartup,
          memory: parseInt(editMemory, 10),
          disk: parseInt(editDisk, 10),
          cpu: parseInt(editCpu, 10),
          priceCredits: parseInt(editPriceCredits, 10),
          maxAllocations: Math.min(50, Math.max(0, parseInt(editMaxAllocations, 10) || 0)),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTabError(data.error || "Failed to update server.");
        return;
      }

      showToast("Changes saved!");
      await fetchServerDetails();
    } catch {
      setTabError("Network error.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConfirmAddAllocation = () => {
    if (!selectedAllocToAdd) return;
    if (
      !editAdditionalAllocs.includes(selectedAllocToAdd) &&
      selectedAllocToAdd !== editAllocationId
    ) {
      setEditAdditionalAllocs([...editAdditionalAllocs, selectedAllocToAdd]);
    }
    setIsAddAllocModalOpen(false);
    setSelectedAllocToAdd("");
  };

  const handleRemoveAdditionalAllocation = (allocId: string) => {
    setEditAdditionalAllocs(editAdditionalAllocs.filter((id) => id !== allocId));
    setAllocToDelete(null);
  };

  const handleSetPrimaryAllocation = (allocId: string) => {
    const oldPrimary = editAllocationId;
    setEditAllocationId(allocId);

    const updatedAdditionals = editAdditionalAllocs.filter((id) => id !== allocId);
    if (oldPrimary && !updatedAdditionals.includes(oldPrimary)) {
      updatedAdditionals.push(oldPrimary);
    }
    setEditAdditionalAllocs(updatedAdditionals);
  };

  const handleDeleteServer = async () => {
    if (!server) return;
    setDeleteLoading(true);
    setTabError(null);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/servers/manage", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: server.id, force: isForceDelete }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTabError(data.error || "Failed to delete server.");
        setIsDeleteModalOpen(false);
        return;
      }

      router.push("/home/admin/servers");
    } catch {
      setTabError("Network error deleting server.");
      setIsDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <Loading width={32} height={32} color={accentColor} />
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="p-6">
        <Link href="/home/admin/servers" className="inline-flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftIcon className="w-4 h-4" />
          Return to Servers
        </Link>
        <div className="mt-6 text-sm text-rose-500">{error || "Server not found."}</div>
      </div>
    );
  }

  const isInstalling = server.installing || server.status === "installing";

  const originalPrimary = server.allocationId;
  const originalAdditionals = [...(server.additionalAllocationIds || [])].sort();
  const currentPrimary = editAllocationId;
  const currentAdditionals = [...editAdditionalAllocs].sort();

  const hasAllocationChanges =
    originalPrimary !== currentPrimary ||
    JSON.stringify(originalAdditionals) !== JSON.stringify(currentAdditionals);

  const assignedAllocIds = [editAllocationId, ...editAdditionalAllocs];
  const assignedAllocations = nodeAllocations.filter((a) => assignedAllocIds.includes(a.id));
  const unassignedNodeAllocations = nodeAllocations.filter(
    (a) => (!a.assignedServerId || a.assignedServerId === server.id) && !assignedAllocIds.includes(a.id)
  );

  const tabs: { key: TabType; label: string; disabled?: boolean }[] = [
    { key: "overview", label: "Overview" },
    { key: "edit", label: "Edit Configuration", disabled: isInstalling },
    { key: "allocations", label: "Port Allocations", disabled: isInstalling },
    { key: "other", label: "Other & Danger Zone" },
  ];

  const StatusBadge = () =>
    isInstalling ? (
      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full border inline-flex items-center gap-1.5 shrink-0 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
        <Loading width={12} height={12} color="#22d3ee" />
        Installing Container...
      </span>
    ) : (
      <span
        className={`px-2.5 py-1 text-[10px] font-bold rounded-full border inline-flex items-center gap-1.5 shrink-0 ${
          server.status === "running"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            server.status === "running" ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
          }`}
        />
        {formatStatus(server.status)}
      </span>
    );

  return (
    <div className="space-y-6">
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
        >
          {toastMessage}
        </motion.div>
      )}

      <div className={`p-6 rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"} shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                {server.name}
              </h1>
              <div className="hidden sm:inline-flex items-center">
                <StatusBadge />
              </div>
            </div>

            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {server.description ? server.description : "No description provided."}
            </p>

            <div className="pt-1 block sm:hidden">
              <StatusBadge />
            </div>

            <p className={`text-[11px] font-mono pt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              Owner: {server.ownerUsername} | Node: {nodeName}
            </p>
          </div>

          <Link
            href="/home/admin/servers"
            className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border text-center flex items-center justify-center gap-1.5 shrink-0 ${
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

      <div className={`flex flex-wrap items-center border-b ${isDark ? "border-white/10" : "border-zinc-200"}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          if (tab.disabled) return null;

          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setTabError(null);
              }}
              className={`px-4 py-3 text-xs font-bold relative transition-colors ${
                isActive
                  ? isDark
                    ? "text-white"
                    : "text-zinc-900"
                  : isDark
                    ? "text-zinc-500 hover:text-zinc-300"
                    : "text-zinc-400 hover:text-zinc-600"
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
        {tabError && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 shrink-0" />
            <span>{tabError}</span>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            {isInstalling && (
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs font-semibold flex items-center gap-2.5">
                <Loading width={16} height={16} color="#22d3ee" />
                <span>The node daemon is currently building the container volume and running the egg installation script.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Service Nest & Egg</span>
                <p className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-zinc-900"}`}>{nestName} / {eggName}</p>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Resource Specs</span>
                <p className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {server.memory} MB RAM / {server.disk} MB Disk / {server.cpu}% CPU / Max {server.maxAllocations ?? 0} Extra Ports
                </p>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? "border-white/5 bg-[#07080a]" : "border-zinc-100 bg-zinc-50"}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Monthly Price</span>
                <p className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {server.priceCredits === 0 ? "Free (0 Cr)" : `${server.priceCredits} Credits/mo`}
                </p>
              </div>
            </div>

            <div>
              <span className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Startup Command</span>
              <div className={`p-3.5 rounded-xl border font-mono text-xs break-all whitespace-pre-wrap leading-relaxed ${
                isDark ? "border-white/10 bg-[#07080a] text-zinc-300" : "border-zinc-300 bg-zinc-50 text-zinc-800"
              }`}>
                {server.startup}
              </div>
            </div>
          </div>
        )}

        {activeTab === "edit" && !isInstalling && (
          <form onSubmit={handleUpdateServer} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Server Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Change Server Owner</label>
                  <UserSelector
                    value={editOwnerName}
                    onChange={(id, uname) => {
                      setEditOwnerId(id);
                      setEditOwnerName(uname);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Memory (RAM MB)</label>
                  <input
                    type="number"
                    value={editMemory}
                    onChange={(e) => setEditMemory(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Disk (MB)</label>
                  <input
                    type="number"
                    value={editDisk}
                    onChange={(e) => setEditDisk(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>CPU (%)</label>
                  <input
                    type="number"
                    value={editCpu}
                    onChange={(e) => setEditCpu(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Price (Credits/mo)</label>
                  <input
                    type="number"
                    value={editPriceCredits}
                    onChange={(e) => setEditPriceCredits(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Max Additional Allocations (0-50)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={editMaxAllocations}
                    onChange={(e) => setEditMaxAllocations(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                  />
                  <p className={`text-[10px] mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    This is the maximum number of additional port allocations the user can create by themselves for this server.
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Startup Command</label>
                <input
                  type="text"
                  value={editStartup}
                  onChange={(e) => setEditStartup(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              style={{ backgroundColor: accentColor }}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saveLoading ? <Loading width={16} height={16} color="#000000" /> : "Save Configuration"}
            </button>
          </form>
        )}

        {activeTab === "allocations" && !isInstalling && (
          <div className="space-y-6">
            <div className="border-b pb-4 border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                  Assigned Port Allocations
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Manage network ports bound to this server container.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddAllocModalOpen(true)}
                style={{ backgroundColor: accentColor }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-black transition-all flex items-center justify-center gap-1.5 shadow-md self-start sm:self-auto"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                <span>Add Allocation</span>
              </button>
            </div>

            {hasAllocationChanges && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold flex items-center gap-2">
                <span>You have unsaved changes! Use the "Save Allocation Changes" button to apply them!</span>
              </div>
            )}

            <div className="space-y-3">
              {assignedAllocations.map((alloc) => {
                const isPrimary = alloc.id === editAllocationId;

                return (
                  <div
                    key={alloc.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isPrimary
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : isDark
                          ? "border-white/10 bg-[#07080a]"
                          : "border-zinc-200 bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className={`font-mono text-xs font-bold block ${isDark ? "text-white" : "text-zinc-900"}`}>
                          {alloc.ip}:{alloc.port}
                        </span>
                        {isPrimary ? (
                          <span className="text-[10px] font-bold text-emerald-400">Primary Allocation</span>
                        ) : (
                          <span className="text-[10px] font-bold text-cyan-400">Secondary Allocation</span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 ${isUltraSmall ? "flex-col w-full pt-1" : "self-end sm:self-auto"}`}>
                      {!isPrimary && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryAllocation(alloc.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-all flex items-center justify-center gap-1 ${isUltraSmall ? "w-full" : ""}`}
                          >
                            {!isUltraSmall && <StarIcon className="w-3.5 h-3.5" />}
                            <span>Make Primary</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAllocToDelete(alloc.id)}
                            className={`p-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center justify-center ${isUltraSmall ? "w-full py-2" : ""}`}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleUpdateServer()}
              disabled={saveLoading}
              style={{ backgroundColor: accentColor }}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saveLoading ? (
                <Loading width={16} height={16} color="#000000" />
              ) : isUltraSmall ? (
                "Save"
              ) : (
                "Save Allocation Changes"
              )}
            </button>
          </div>
        )}

        {activeTab === "other" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-rose-500">Delete Server</h3>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Notifies node daemon to stop container, delete volume, and unassign ports.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsForceDelete(false);
                  setIsDeleteModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md"
              >
                Delete Server
              </button>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-rose-500">Force Delete Server</h3>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Bypasses daemon error responses and forcibly purges the server from the database.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsForceDelete(true);
                  setIsDeleteModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-600 transition-all shadow-md"
              >
                Force Delete Server
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalMenu isOpen={isAddAllocModalOpen} onClose={() => setIsAddAllocModalOpen(false)} desktopMaxWidth="450px">
        <div className={`p-6 text-left font-sans space-y-4 overflow-visible relative z-50 ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div>
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              Assign Secondary Allocation
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Select an available unassigned port allocation from node <strong>{nodeName}</strong>.
            </p>
          </div>

          <div className="overflow-visible relative z-50">
            <Selector
              value={selectedAllocToAdd}
              options={unassignedNodeAllocations.map((a) => ({
                value: a.id,
                label: `${a.ip}:${a.port}`,
              }))}
              onChange={(val) => setSelectedAllocToAdd(val)}
              placeholder={unassignedNodeAllocations.length === 0 ? "No free allocations on node" : "Select port..."}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddAllocModalOpen(false)}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedAllocToAdd}
              onClick={handleConfirmAddAllocation}
              style={{ backgroundColor: accentColor }}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-black transition-all disabled:opacity-40"
            >
              Assign Port
            </button>
          </div>
        </div>
      </ModalMenu>

      <ModalMenu isOpen={Boolean(allocToDelete)} onClose={() => setAllocToDelete(null)} desktopMaxWidth="420px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Remove Allocation
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to remove this secondary allocation from the server?
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAllocToDelete(null)}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => allocToDelete && handleRemoveAdditionalAllocation(allocToDelete)}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all"
            >
              Confirm Remove
            </button>
          </div>
        </div>
      </ModalMenu>

      <ModalMenu isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} desktopMaxWidth="420px">
        <div className={`p-6 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            {isForceDelete ? "Confirm Force Delete" : "Confirm Delete"}
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to delete <strong className={isDark ? "text-white" : "text-zinc-900"}>{server.name}</strong>?
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
              onClick={handleDeleteServer}
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

export default function ManageServerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] w-full">
          <Loading width={32} height={32} color="#00f2fe" />
        </div>
      }
    >
      <ManageServerContent />
    </Suspense>
  );
}