"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Loading from "@/components/Base/Loading";
import Selector from "@/components/Base/Selector";
import { config, apiRequest } from "@/lib/main";
import { ArrowLeftIcon, ShieldCheckIcon, CheckIcon } from "@heroicons/react/24/outline";

interface LocationOption {
  id: string;
  name: string;
  flag: string;
}

export default function CreateNodePage() {
  const router = useRouter();
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor;
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [fqdn, setFqdn] = useState("");
  const [daemonPort, setDaemonPort] = useState("8080");
  const [uploadSize, setUploadSize] = useState("100");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      const token = Cookies.get("token");
      if (!token) return;

      try {
        const res = await apiRequest("api/v1/admin/locations", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setLocations(data.locations || []);
          if (data.locations?.[0]) {
            setLocationId(data.locations[0].id);
          }
        }
      } catch (err) {
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const token = Cookies.get("token");
    if (!token) {
      setError("Authentication token missing.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/admin/nodes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          locationId,
          fqdn,
          scheme: "https",
          daemonPort: parseInt(daemonPort, 10) || 8080,
          uploadSize: parseInt(uploadSize, 10) || 100,
          maintenanceMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create node.");
        setSubmitting(false);
        return;
      }

      router.push(`/home/admin/nodes/manage?nodeId=${data.nodeId}`);
    } catch (err) {
      setError("Network error occurred while creating node.");
      setSubmitting(false);
    }
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: `${loc.name} (${loc.flag})`,
  }));

  if (loadingLocations) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-1 sm:px-0">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/home/admin/nodes" className={`text-xs font-semibold flex items-center gap-1 ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
          <ArrowLeftIcon className="h-4 w-4 stroke-[2]" />
          <span>Back to Nodes</span>
        </Link>
      </div>

      <div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
          Create Host Node
        </h1>
        <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Configure a new physical daemon server host instance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`p-6 sm:p-8 rounded-2xl border space-y-6 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Node Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Node-US-01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Location Region
              </label>
              <Selector
                value={locationId}
                options={locationOptions}
                onChange={(val) => setLocationId(val)}
                placeholder="Select location..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                FQDN (Domain / Hostname)
              </label>
              <input
                type="text"
                required
                placeholder="node1.yourdomain.com"
                value={fqdn}
                onChange={(e) => setFqdn(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Daemon Port
              </label>
              <input
                type="number"
                required
                placeholder="8080"
                value={daemonPort}
                onChange={(e) => setDaemonPort(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 shrink-0" />
            <span>SSL/HTTPS scheme is strictly enforced for node daemon security.</span>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Max Upload Limit (MB)
            </label>
            <input
              type="number"
              required
              value={uploadSize}
              onChange={(e) => setUploadSize(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"}`}
            />
          </div>
          <div
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              maintenanceMode
                ? "border-amber-500/40 bg-amber-500/[0.06]"
                : isDark
                ? "border-white/10 bg-[#07080a] hover:border-white/20"
                : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
            }`}
          >
            <div className="flex-1 pr-2">
              <span className={`text-xs font-bold block ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>Maintenance Mode</span>
              <span className={`text-[11px] leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Block new server allocations from targeting this node.</span>
            </div>

            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 self-end sm:self-auto ${
              maintenanceMode
                ? "bg-amber-500 border-amber-500 text-slate-950"
                : isDark ? "border-white/20 bg-white/5" : "border-zinc-300 bg-white"
            }`}>
              {maintenanceMode && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: accentColor }}
          className="w-full py-3 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
        >
          {submitting ? <Loading width={16} height={16} color="#000000" /> : "Create Node & Continue"}
        </button>
      </form>
    </div>
  );
}