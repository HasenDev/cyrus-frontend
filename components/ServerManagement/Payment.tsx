"use client";

import React, { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { config, apiRequest } from "@/lib/main";
import { parseCredits } from "@/lib/misc/creditsParser";
import { ServerDetails } from "@/app/home/server/page";
import Selector from "@/components/Base/Selector";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import {
  CreditCardIcon,
  ClockIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowUpCircleIcon,
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

interface PaymentProps {
  serverId: string;
  serverData: ServerDetails;
  accentColor?: string;
  onRefreshServer?: () => Promise<void> | void;
  userPermissions?: string[];
  isOwner?: boolean;
}

interface PlanOption {
  id: string;
  name: string;
  ramMB: number;
  cpuPercent: number;
  diskMB: number;
  priceCredits: number;
  maxAllocations: number;
}

interface TransactionItem {
  id: string;
  amount: number;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface PaymentData {
  packageId?: string;
  packageName: string;
  planId?: string;
  planName: string;
  priceCredits: number;
  isLifetime: boolean;
  userCredits: number;
  canAffordCount: number;
  nextPaymentDate: string;
  timeLeftMs: number;
  suspended: boolean;
  canManage?: boolean;
  availablePlans: PlanOption[];
  transactions: TransactionItem[];
}

export default function Payment({
  serverId,
  serverData,
  accentColor = "#00f2fe",
  onRefreshServer,
  userPermissions = [],
  isOwner = true
}: PaymentProps) {
  const isDark = config.theme === "dark";
  const canManage = isOwner || userPermissions.includes("payment.manage");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaymentData | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchingPlan, setSwitchingPlan] = useState(false);

  const fetchPaymentDetails = useCallback(async () => {
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/payment`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to load payment details.");

      setData(resData);

      const otherPlans = (resData.availablePlans || []).filter((p: PlanOption) => p.id !== resData.planId);
      if (otherPlans.length > 0) {
        setSelectedPlanId(otherPlans[0].id);
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to communicate with billing system.");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchPaymentDetails();
  }, [fetchPaymentDetails]);
  const formatTimeLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "Due now";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };
  const handleManualReactivation = async () => {
    if (!canManage) return;
    setActionError(null);
    setActionSuccess(null);
    setReactivating(true);

    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "reactivate" })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to reactivate server.");

      setActionSuccess(resData.message || "Server renewed and reactivated!");
      await fetchPaymentDetails();
      onRefreshServer?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to process payment.");
    } finally {
      setReactivating(false);
    }
  };
  const handleConfirmPlanSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setActionError(null);
    setActionSuccess(null);
    setSwitchingPlan(true);

    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "change_plan",
          newPlanId: selectedPlanId
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to switch plan.");

      setShowSwitchModal(false);
      setActionSuccess(resData.message || "Plan updated successfully!");
      await fetchPaymentDetails();
      onRefreshServer?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to switch plan.");
    } finally {
      setSwitchingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] w-full">
        <Loading width={32} height={32} color={accentColor} />
      </div>
    );
  }

  const isLifetime = data?.isLifetime || data?.priceCredits === 0;
  const selectableOtherPlans = (data?.availablePlans || []).filter((p) => p.id !== data?.planId);
  const targetPlanObj = selectableOtherPlans.find((p) => p.id === selectedPlanId) || selectableOtherPlans[0];
  const canSwitchPlans = selectableOtherPlans.length > 0;

  const planSelectorOptions = selectableOtherPlans.map((p) => ({
    value: p.id,
    label: `${p.name} — ${p.ramMB}MB RAM, ${p.cpuPercent}% CPU, ${p.diskMB}MB Disk (${p.priceCredits} Cr/mo)`
  }));

  const isSuspended = Boolean(data?.suspended);

  return (
    <div className="space-y-6 select-none w-full max-w-full">
      <div
        className={`p-5 sm:p-6 rounded-2xl border ${
          isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        } shadow-sm space-y-4`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-base font-bold break-words [overflow-wrap:anywhere] ${isDark ? "text-white" : "text-zinc-900"}`}>
                {data?.planName || "Custom Tier"}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 border ${
                  data?.suspended
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : isLifetime
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {data?.suspended ? "SUSPENDED" : isLifetime ? "LIFETIME" : "ACTIVE"}
              </span>
            </div>

            <p className={`text-xs break-words [overflow-wrap:anywhere] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Package: <strong className={isDark ? "text-zinc-200" : "text-zinc-800"}>{data?.packageName || "Custom Package"}</strong>
              {" • "}
              Rate: <strong className={isDark ? "text-zinc-200" : "text-zinc-800"}>
                {isLifetime ? "Free (Lifetime)" : `${data?.priceCredits || 0} Credits / mo`}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {data?.suspended ? (
              <button
                type="button"
                onClick={handleManualReactivation}
                disabled={reactivating || !canManage}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  !canManage
                    ? isDark
                      ? "bg-zinc-900/60 text-zinc-600 border border-white/5 cursor-not-allowed opacity-40"
                      : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-40"
                    : "bg-rose-600 hover:bg-rose-500 text-white active:scale-95 disabled:opacity-50"
                }`}
                title={!canManage ? "Requires payment.manage permission" : undefined}
              >
                {reactivating ? <Loading width={14} height={14} color="#fff" /> : <ArrowPathIcon className="w-4 h-4" />}
                <span>{reactivating ? "Renewing..." : "Pay & Unsuspend"}</span>
              </button>
            ) : (
              canSwitchPlans && (
                <button
                  type="button"
                  onClick={() => {
                    if (!canManage) return;
                    setActionError(null);
                    setShowSwitchModal(true);
                  }}
                  disabled={!canManage}
                  style={
                    canManage
                      ? { backgroundColor: accentColor, color: "#000" }
                      : undefined
                  }
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                    !canManage
                      ? isDark
                        ? "bg-zinc-900/60 text-zinc-600 border border-white/5 cursor-not-allowed opacity-40"
                        : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-40"
                      : "hover:opacity-90 active:scale-95"
                  }`}
                  title={!canManage ? "Requires payment.manage permission" : undefined}
                >
                  <ArrowUpCircleIcon className="w-4 h-4 stroke-2" />
                  <span>Switch Plan</span>
                </button>
              )
            )}
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
            <CheckIcon className="w-4 h-4 stroke-[3]" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>
      {!isLifetime ? (
        <div className={`grid grid-cols-1 ${isSuspended ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-4`}>
          <div className={`p-4 rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"}`}>
            <div className="flex items-center gap-2 text-zinc-400">
              <CreditCardIcon className="w-4 h-4" />
              <p className="text-xs font-medium">Available Balance</p>
            </div>
            <p className={`text-xl font-black mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
              {parseCredits(data?.userCredits)} <span className="text-xs font-semibold text-zinc-500">Credits</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Usable for renewals & upgrades</p>
          </div>
          {!isSuspended && (
            <div className={`p-4 rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"}`}>
              <div className="flex items-center gap-2 text-zinc-400">
                <ClockIcon className="w-4 h-4" />
                <p className="text-xs font-medium">Next Renewal</p>
              </div>
              <p className={`text-xl font-black mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
                {data?.nextPaymentDate ? formatTimeLeft(data.nextPaymentDate) : "N/A"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {data?.nextPaymentDate ? new Date(data.nextPaymentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "Automated renewal"}
              </p>
            </div>
          )}

          <div className={`p-4 rounded-2xl border ${isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"}`}>
            <div className="flex items-center gap-2 text-zinc-400">
              <CircleStackIcon className="w-4 h-4" />
              <p className="text-xs font-medium">Months Covered</p>
            </div>
            <p className={`text-xl font-black mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
              {parseCredits(data?.canAffordCount)} <span className="text-xs font-semibold text-zinc-500">months</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Calculated at current rate</p>
          </div>
        </div>
      ) : (
        <div className={`p-4 rounded-2xl border flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-3 ${
          isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Lifetime Server Instance
            </h3>
            <p className={`text-[11px] mt-0.5 break-words [overflow-wrap:anywhere] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              This server does not require monthly renewals and will stay online indefinitely without credit deductions.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-3 ${
          isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
            <ServerIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Memory Allocation</p>
            <p className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{serverData.memory} MB</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-3 ${
          isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
            <CpuChipIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>CPU Allocation</p>
            <p className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{serverData.cpu}%</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-3 ${
          isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <CircleStackIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Disk Storage</p>
            <p className={`text-base font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{serverData.disk} MB</p>
          </div>
        </div>
      </div>
      <div
        className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? "border-white/[0.08] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className={`p-4 border-b ${isDark ? "border-white/[0.06] bg-[#111218]" : "border-zinc-200 bg-zinc-50"}`}>
          <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Recent Transactions
          </h2>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[500px]">
            <thead>
              <tr className={`border-b font-medium select-none ${
                isDark ? "border-white/[0.06] bg-[#111218] text-zinc-400" : "border-zinc-200 bg-zinc-50 text-zinc-600"
              }`}>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-white/[0.04]" : "divide-zinc-100"}`}>
              {(!data?.transactions || data.transactions.length === 0) ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No transactions recorded for this server yet.
                  </td>
                </tr>
              ) : (
                data.transactions.map((txn) => (
                  <tr key={txn.id} className={isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50"}>
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-300">{txn.id}</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : "Recently"}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-medium truncate max-w-[200px]">
                      {txn.description || txn.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {txn.amount} <span className="text-[10px] text-zinc-500 font-normal">Credits</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        txn.status.toLowerCase() === "completed" || txn.status.toLowerCase() === "paid"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {txn.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ModalMenu isOpen={showSwitchModal} onClose={() => setShowSwitchModal(false)}>
        <form onSubmit={handleConfirmPlanSwitch} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
              <ArrowUpCircleIcon className="w-5 h-5 stroke-2" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                Switch Plan Tier
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Select a new resource tier for this server instance.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className={`block text-xs font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Target Plan Tier
            </label>
            <Selector
              value={selectedPlanId}
              options={planSelectorOptions}
              onChange={(val) => setSelectedPlanId(val)}
              placeholder="Choose a target plan..."
            />
          </div>

          {targetPlanObj && (
            <div className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
              isDark ? "bg-[#111218] border-white/10 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"
            }`}>
              <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1 break-words [overflow-wrap:anywhere]">
                <span className="text-zinc-400">New Memory Limit:</span>
                <strong className="text-white font-mono">{targetPlanObj.ramMB} MB</strong>
              </div>

              <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1 break-words [overflow-wrap:anywhere]">
                <span className="text-zinc-400">New CPU Capacity:</span>
                <strong className="text-white font-mono">{targetPlanObj.cpuPercent}%</strong>
              </div>

              <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1 break-words [overflow-wrap:anywhere]">
                <span className="text-zinc-400">New NVMe Storage:</span>
                <strong className="text-white font-mono">{targetPlanObj.diskMB} MB</strong>
              </div>

              <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1 border-t pt-2 border-white/10 break-words [overflow-wrap:anywhere]">
                <span className="text-zinc-400">Initial Deduction:</span>
                <strong className="text-amber-400 font-mono">{targetPlanObj.priceCredits} Credits</strong>
              </div>
            </div>
          )}

          {actionError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSwitchModal(false)}
              disabled={switchingPlan}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={switchingPlan || !selectedPlanId || selectedPlanId === data?.planId || !canManage}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {switchingPlan && <Loading width={14} height={14} color="#000" />}
              <span>{switchingPlan ? "Updating..." : "Confirm & Pay"}</span>
            </button>
          </div>
        </form>
      </ModalMenu>
    </div>
  );
}