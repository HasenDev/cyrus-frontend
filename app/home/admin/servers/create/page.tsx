"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Loading from "@/components/Base/Loading";
import Selector from "@/components/Base/Selector";
import UserSelector from "@/components/Base/UserSelector";
import { config, apiRequest } from "@/lib/main";
import {
  ArrowLeftIcon,
  ServerIcon,
  UserIcon,
  CpuChipIcon,
  CommandLineIcon
} from "@heroicons/react/24/outline";

interface Nest {
  id: string;
  name: string;
}

interface EggVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  user_viewable: boolean;
  user_editable: boolean;
}

interface Egg {
  id: string;
  nestId: string;
  name: string;
  docker_images: Record<string, string>;
  startup: string;
  variables: EggVariable[];
}

interface NodeItem {
  id: string;
  name: string;
  fqdn: string;
  maintenanceMode: boolean;
}

interface AllocationItem {
  id: string;
  nodeId: string;
  ip: string;
  port: number;
}

export default function CreateServerPage() {
  const router = useRouter();
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nests, setNests] = useState<Nest[]>([]);
  const [allEggs, setAllEggs] = useState<Egg[]>([]);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [allAllocations, setAllAllocations] = useState<AllocationItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [allocationId, setAllocationId] = useState("");
  const [additionalAllocationIds] = useState<string[]>([]);
  const [nestId, setNestId] = useState("");
  const [eggId, setEggId] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [startup, setStartup] = useState("");
  const [environment, setEnvironment] = useState<Record<string, string>>({});
  const [memory, setMemory] = useState("1024");
  const [disk, setDisk] = useState("5000");
  const [cpu, setCpu] = useState("100");
  const [priceCredits, setPriceCredits] = useState("0");
  const [maxAllocations, setMaxAllocations] = useState("0");

  useEffect(() => {
    const fetchCreateInfo = async () => {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized access.");
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest("api/v1/admin/servers/create-info", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setError("Failed to load server creation metadata.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setNests(data.nests || []);
        setAllEggs(data.eggs || []);
        setNodes(data.nodes || []);
        setAllAllocations(data.allocations || []);

        if (data.nests?.[0]) setNestId(data.nests[0].id);
        if (data.nodes?.[0]) setNodeId(data.nodes[0].id);
      } catch {
        setError("Network error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchCreateInfo();
  }, []);

  const availableEggs = allEggs.filter((e) => e.nestId === nestId);
  useEffect(() => {
    if (availableEggs.length > 0) {
      setEggId(availableEggs[0].id);
    } else {
      setEggId("");
    }
  }, [nestId]);

  const selectedEgg = availableEggs.find((e) => e.id === eggId);
  useEffect(() => {
    if (selectedEgg) {
      const images = Object.values(selectedEgg.docker_images || {});
      setDockerImage(images[0] || "");
      setStartup(selectedEgg.startup || "");

      const envDefaults: Record<string, string> = {};
      if (Array.isArray(selectedEgg.variables)) {
        selectedEgg.variables.forEach((v) => {
          envDefaults[v.env_variable] = v.default_value || "";
        });
      }
      setEnvironment(envDefaults);
    }
  }, [eggId]);

  const nodeAllocations = allAllocations.filter((a) => a.nodeId === nodeId);
  useEffect(() => {
    if (nodeAllocations.length > 0) {
      setAllocationId(nodeAllocations[0].id);
    } else {
      setAllocationId("");
    }
  }, [nodeId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ownerId) {
      setError("Please select a valid server owner.");
      return;
    }

    if (!allocationId) {
      setError("Target node has no free port allocations available.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/admin/servers", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          description,
          ownerId,
          nodeId,
          allocationId,
          additionalAllocationIds,
          nestId,
          eggId,
          dockerImage,
          startup,
          environment,
          memory: parseInt(memory, 10),
          disk: parseInt(disk, 10),
          cpu: parseInt(cpu, 10),
          priceCredits: parseInt(priceCredits, 10),
          maxAllocations: Math.min(50, Math.max(0, parseInt(maxAllocations, 10) || 0)),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create server.");
        setSubmitting(false);
        return;
      }
      router.push(`/home/admin/servers/manage?serverId=${data.serverId}`);
    } catch {
      setError("Network error occurred creating server.");
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-1 sm:px-0">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/home/admin/servers" className={`text-xs font-semibold flex items-center gap-1 ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
          <ArrowLeftIcon className="h-4 w-4 stroke-[2]" />
          <span>Back to Servers</span>
        </Link>
      </div>

      <div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
          Deploy New Server
        </h1>
        <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Provision a containerized application instance tied to a node daemon allocation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`p-6 sm:p-7 rounded-2xl border space-y-4 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div className="flex flex-col min-[340px]:flex-row items-start min-[340px]:items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
              1. Core Identity & Owner
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Server Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Production Minecraft"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Server Owner</label>
              <UserSelector value={ownerName} onChange={(id, uname) => { setOwnerId(id); setOwnerName(uname); }} />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Description (Optional)</label>
            <input
              type="text"
              placeholder="Primary app instance..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
            />
          </div>
        </div>
        <div className={`p-6 sm:p-7 rounded-2xl border space-y-4 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div className="flex flex-col min-[340px]:flex-row items-start min-[340px]:items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <ServerIcon className="w-4 h-4" />
            </div>
            <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
              2. Host Node & Allocation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Host Node Target</label>
              <Selector
                value={nodeId}
                options={nodes.map((n) => ({ value: n.id, label: `${n.name} (${n.fqdn})` }))}
                onChange={(val) => setNodeId(val)}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Primary Allocation Port</label>
              <Selector
                value={allocationId}
                options={nodeAllocations.map((a) => ({ value: a.id, label: `${a.ip}:${a.port}` }))}
                onChange={(val) => setAllocationId(val)}
                placeholder={nodeAllocations.length === 0 ? "No free allocations on node" : "Select port..."}
              />
            </div>
          </div>
        </div>
        <div className={`p-6 sm:p-7 rounded-2xl border space-y-4 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div className="flex flex-col min-[340px]:flex-row items-start min-[340px]:items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <CommandLineIcon className="w-4 h-4" />
            </div>
            <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
              3. Service Template (Nest & Egg)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Service Nest</label>
              <Selector
                value={nestId}
                options={nests.map((n) => ({ value: n.id, label: n.name }))}
                onChange={(val) => setNestId(val)}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Egg Template</label>
              <Selector
                value={eggId}
                options={availableEggs.map((e) => ({ value: e.id, label: e.name }))}
                onChange={(val) => setEggId(val)}
              />
            </div>
          </div>

          {selectedEgg && (
            <div className="space-y-4 pt-2">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Docker Container Image</label>
                <Selector
                  value={dockerImage}
                  options={Object.entries(selectedEgg.docker_images || {}).map(([lbl, img]) => ({ value: img, label: `${lbl} (${img})` }))}
                  onChange={(val) => setDockerImage(val)}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Startup Command</label>
                <input
                  type="text"
                  value={startup}
                  onChange={(e) => setStartup(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                />
              </div>
              {selectedEgg.variables?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className={`block text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                    Egg Environment Variables
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedEgg.variables.map((v) => (
                      <div key={v.env_variable}>
                        <label className={`block text-[11px] font-semibold mb-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{v.name}</label>
                        <input
                          type="text"
                          value={environment[v.env_variable] || ""}
                          onChange={(e) => setEnvironment({ ...environment, [v.env_variable]: e.target.value })}
                          className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={`p-6 sm:p-7 rounded-2xl border space-y-4 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div className="flex flex-col min-[340px]:flex-row items-start min-[340px]:items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <CpuChipIcon className="w-4 h-4" />
            </div>
            <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
              4. Hardware Limits & Monthly Credits
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Memory (RAM MB)</label>
              <input
                type="number"
                required
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Disk (Storage MB)</label>
              <input
                type="number"
                required
                value={disk}
                onChange={(e) => setDisk(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>CPU Limit (%)</label>
              <input
                type="number"
                required
                value={cpu}
                onChange={(e) => setCpu(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Price (Credits/Mo)</label>
              <input
                type="number"
                required
                placeholder="0 = Free"
                value={priceCredits}
                onChange={(e) => setPriceCredits(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Max Additional Allocations (0-50)
              </label>
              <input
                type="number"
                required
                min={0}
                max={50}
                value={maxAllocations}
                onChange={(e) => setMaxAllocations(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
              <p className={`text-[10px] mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                This is the maximum number of additional port allocations the user can create by themselves for this server.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: accentColor }}
          className="w-full py-3 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
        >
          {submitting ? <Loading width={16} height={16} color="#000000" /> : "Deploy Server"}
        </button>
      </form>
    </div>
  );
}