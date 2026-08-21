"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { useAppStore } from "@/app/home/layout";
import { config, apiRequest } from "@/lib/main";
import { parseCredits } from "@/lib/misc/creditsParser";

interface Transaction {
  id: string;
  date: string;
  credits: number;
  amountUSD: number;
  status: "Completed" | "Paid" | "Pending" | "Failed" | "Timed out" | string;
}

const PRESET_DOLLARS = [1, 5, 10, 50];
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export default function CreditsPage() {
  const { user, setUser } = useAppStore();
  const accentColor = config.accentColor || "#00f2fe";
  const isDark = config.theme === "dark";
  const [currentCredits, setCurrentCredits] = useState<number>(user?.metrics?.credits ?? 0);
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean>(true);
  const [providerOxapayEnabled, setProviderOxapayEnabled] = useState<boolean>(true);
  const [creditsPerDollar, setCreditsPerDollar] = useState<number>(50);
  const [amountUSD, setAmountUSD] = useState<number>(10);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [generatingLink, setGeneratingLink] = useState<boolean>(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<string>("");
  const [voucherLoading, setVoucherLoading] = useState<boolean>(false);
  const [voucherStatus, setVoucherStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const getEffectiveStatus = (txn: Transaction): string => {
    let rawStatus = txn.status || "Pending";
    if (rawStatus.toLowerCase() === "pending" && txn.id.startsWith("OXA-")) {
      const parts = txn.id.split("-");
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1], 10);
        if (!isNaN(timestamp) && Date.now() - timestamp > TWELVE_HOURS_MS) {
          rawStatus = "Timed out";
        }
      }
    }
    return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  };

  const fetchCreditsData = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setDataLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/credits", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentCredits(data.credits ?? 0);
        setPaymentsEnabled(!!data.paymentsEnabled);
        setProviderOxapayEnabled(!!data.providerOxapayEnabled);
        setCreditsPerDollar(data.creditsPerDollar || 50);
        setTransactions(data.transactions || []);
      }
    } catch {
      console.error("Failed to load credits data.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditsData();
  }, []);

  const handleVoucherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    }
    setVoucher(formatted);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) {
      setAmountUSD(0);
      return;
    }
    setAmountUSD(Math.max(0, val));
  };

  const handleOpenPaymentModal = () => {
    if (amountUSD <= 0 || !paymentsEnabled) return;
    setPayUrl(null);
    setCheckoutError(null);
    setIsPaymentModalOpen(true);
  };

  const handleOxaPaySelect = async () => {
    setGeneratingLink(true);
    setCheckoutError(null);

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/credits/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountUSD }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Failed to generate payment link.");
        setGeneratingLink(false);
        return;
      }

      setPayUrl(data.payUrl);
      fetchCreditsData();
    } catch {
      setCheckoutError("Network error occurred generating checkout link.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (voucher.length !== 9) {
      setVoucherStatus({
        type: "error",
        message: "Code must be in XXXX-XXXX format.",
      });
      return;
    }

    setVoucherLoading(true);
    setVoucherStatus({ type: null, message: "" });

    const token = Cookies.get("token");
    try {
      const res = await apiRequest("api/v1/credits/redeem-voucher", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: voucher }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVoucherStatus({
          type: "error",
          message: data.error || "Failed to redeem voucher.",
        });
        setVoucherLoading(false);
        return;
      }

      setVoucherStatus({
        type: "success",
        message: data.message || "Voucher redeemed successfully!",
      });

      setCurrentCredits(data.newBalance);
      if (user && setUser) {
        setUser({
          ...user,
          metrics: {
            ...user.metrics,
            credits: data.newBalance,
          },
        });
      }

      if (data.transaction) {
        setTransactions((prev) => [data.transaction, ...prev]);
      }

      setVoucher("");
    } catch {
      setVoucherStatus({
        type: "error",
        message: "Network error occurred while redeeming voucher.",
      });
    } finally {
      setVoucherLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1 sm:px-0">
      <div>
        <h1 className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
          Credits
        </h1>
      </div>

      <div
        className={`rounded-xl border p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div>
          <span className={`block text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            Available Credits Balance
          </span>
          <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Use credits to fund server deployments.
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black ${isDark ? "text-white" : "text-zinc-900"}`}>
            {parseCredits(currentCredits)}
          </span>
          <span className="text-sm font-bold" style={{ color: accentColor }}>
            Cr
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className={`rounded-xl border p-6 shadow-md flex flex-col justify-between space-y-6 transition-colors ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          <div className="space-y-4">
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Buy Credits
            </h2>

            <div className="grid grid-cols-1 min-[320px]:grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_DOLLARS.map((val) => {
                const isSelected = amountUSD === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountUSD(val)}
                    className="py-2.5 rounded-lg text-xs font-bold transition-all border w-full"
                    style={{
                      borderColor: isSelected
                        ? accentColor
                        : isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.1)",
                      backgroundColor: isSelected
                        ? `${accentColor}15`
                        : isDark
                        ? "rgba(255, 255, 255, 0.02)"
                        : "rgba(0, 0, 0, 0.02)",
                      color: isSelected ? accentColor : isDark ? "#ffffff" : "#18181b",
                    }}
                  >
                    ${val}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className={`block text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                Custom Dollar Amount
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amountUSD === 0 ? "" : amountUSD}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className={`w-full rounded-lg border px-4 py-3 text-lg font-bold outline-none transition-colors pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    isDark
                      ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                      : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400"
                  }`}
                />
                <div className="absolute right-3.5 pointer-events-none text-zinc-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Calculated Credits:{" "}
                <span className={`font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {parseCredits(amountUSD * creditsPerDollar)} Cr
                </span>
              </p>
            </div>
          </div>

          <button
            disabled={!paymentsEnabled || amountUSD <= 0}
            onClick={handleOpenPaymentModal}
            className="w-full py-3 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-black shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor }}
          >
            {paymentsEnabled ? "Pay" : "Payments Disabled"}
          </button>
        </div>

        <div
          className={`rounded-xl border p-6 shadow-md flex flex-col justify-between space-y-6 transition-colors ${
            isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
          }`}
        >
          <div className="space-y-4">
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              Claim Coupon
            </h2>

            <form onSubmit={handleRedeemVoucher} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`block text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                  Enter 8-Char Voucher Key
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={voucher}
                  onChange={handleVoucherChange}
                  placeholder="XXXX-XXXX"
                  className={`w-full rounded-lg border px-4 py-3 text-center text-xl font-mono font-bold tracking-widest outline-none transition-colors uppercase ${
                    isDark
                      ? "border-white/10 bg-black/40 text-white focus:border-white/30 placeholder:text-zinc-700"
                      : "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-zinc-400 placeholder:text-zinc-300"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={voucherLoading || voucher.length !== 9}
                className={`w-full py-3 px-4 rounded-lg text-xs font-bold transition-all border uppercase tracking-wider disabled:opacity-50 flex items-center justify-center ${
                  isDark
                    ? "bg-zinc-800 text-white border-white/10 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-zinc-200"
                }`}
              >
                {voucherLoading ? <Loading width={16} height={16} /> : "REDEEM"}
              </button>
            </form>

            {voucherStatus.type && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border ${
                  voucherStatus.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {voucherStatus.message}
              </div>
            )}
          </div>

          <div className={`rounded-lg p-3.5 border ${isDark ? "bg-black/30 border-white/[0.04]" : "bg-zinc-50 border-zinc-200"}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              Voucher Format
            </span>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Vouchers automatically format with a hyphen separator (e.g.{" "}
              <code className="font-mono font-bold" style={{ color: accentColor }}>
                SAVE-2025
              </code>
              ).
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-6 shadow-md space-y-4 transition-colors ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
        <div>
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Transaction History
          </h3>
          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Recent credit top-ups and billing records.
          </p>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className={`text-[10px] font-bold uppercase tracking-wider border-y ${
              isDark ? "bg-white/[0.02] text-zinc-500 border-white/[0.04]" : "bg-zinc-50 text-zinc-400 border-zinc-200"
            }`}>
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-white/[0.04]" : "divide-zinc-200"}`}>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-8 text-center text-xs font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const status = getEffectiveStatus(txn);
                  const normalizedStatus = status.toLowerCase();
                  const isSuccess = normalizedStatus === "completed" || normalizedStatus === "paid";
                  const isPending = normalizedStatus === "pending";
                  const isTimedOut = normalizedStatus === "timed out" || normalizedStatus === "expired";

                  return (
                    <tr key={txn.id} className={`transition-colors ${isDark ? "hover:bg-white/[0.01]" : "hover:bg-zinc-50"}`}>
                      <td className={`py-3.5 px-4 font-mono font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>
                        {txn.id}
                      </td>
                      <td className={`py-3.5 px-4 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        {txn.date}
                      </td>
                      <td className={`py-3.5 px-4 font-bold ${txn.credits >= 0 ? (isDark ? "text-emerald-400" : "text-emerald-600") : "text-rose-400"}`}>
                        {txn.credits >= 0 ? `+${parseCredits(txn.credits)}` : `${parseCredits(txn.credits)}`} Cr
                      </td>
                      <td className={`py-3.5 px-4 font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        ${txn.amountUSD.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isSuccess
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : isPending
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : isTimedOut
                            ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isSuccess 
                              ? "bg-emerald-500" 
                              : isPending 
                              ? "bg-amber-500 animate-pulse" 
                              : isTimedOut
                              ? "bg-zinc-400"
                              : "bg-rose-500"
                          }`} />
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalMenu isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Select Payment Provider
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Checkout <strong className={isDark ? "text-white" : "text-zinc-900"}>${amountUSD.toFixed(2)} USD</strong> for{" "}
            <strong style={{ color: accentColor }}>{parseCredits(amountUSD * creditsPerDollar)} Credits</strong>.
          </p>

          {checkoutError && (
            <div className="mb-4 p-3 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl font-medium">
              {checkoutError}
            </div>
          )}

          {!payUrl ? (
            <div className="space-y-3">
              {providerOxapayEnabled ? (
                <button
                  type="button"
                  disabled={generatingLink}
                  onClick={handleOxaPaySelect}
                  className={`w-full p-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-between gap-3 ${
                    isDark
                      ? "border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white"
                      : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="/assets/oxapay.png"
                      alt="OxaPay"
                      className={`h-5 w-auto object-contain transition-all ${
                        isDark ? "brightness-0 invert" : "brightness-0"
                      }`}
                    />
                  </div>

                  {generatingLink ? (
                    <Loading width={18} height={18} />
                  ) : (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Select</span>
                  )}
                </button>
              ) : (
                <div className={`p-4 rounded-xl text-center text-xs ${isDark ? "text-zinc-500 bg-white/[0.01]" : "text-zinc-400 bg-zinc-50"}`}>
                  No active payment gateways configured by admin.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-2 text-center">
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: accentColor }}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 inline-flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                Proceed to OxaPay Checkout
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(false)}
            className={`w-full mt-4 py-2.5 rounded-xl text-xs font-semibold ${
              isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Cancel
          </button>
        </div>
      </ModalMenu>
    </div>
  );
}