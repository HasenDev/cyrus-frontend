"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import {
  PlayIcon,
  ArrowPathIcon,
  StopIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  WifiIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/solid";

interface OverviewProps {
  serverId: string;
  serverData: {
    id: string;
    name: string;
    description?: string;
    memory: number;
    disk: number;
    cpu: number;
    status: string;
    allocation?: string;
  };
  nodeOnline: boolean;
  accentColor?: string;
  status: string;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  stats: {
    cpu: number;
    memoryBytes: number;
    memoryLimitBytes: number;
    diskBytes: number;
    rxBytes: number;
    txBytes: number;
    uptimeSeconds: number;
  };
  overlayState: "connecting" | "refresh_page" | null;
  sendCommand: (cmd: string) => void;
  getConsoleHistory: () => string[];
  subscribeConsoleOutput: (callback: (text: string) => void) => () => void;
  userPermissions?: string[];
  isOwner?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "Offline";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const ERROR_BADGE = "\x1b[41;37;1m [Cyrus Daemon] \x1b[0m ";

export default function Overview({
  serverId,
  serverData,
  nodeOnline,
  accentColor = "#00f2fe",
  status,
  setStatus,
  stats,
  overlayState,
  sendCommand,
  getConsoleHistory,
  subscribeConsoleOutput,
  userPermissions = [],
  isOwner = false
}: OverviewProps) {
  const isDark = config.theme === "dark";
  const canPower = isOwner || userPermissions.includes("overview.power");
  const canConsole = isOwner || userPermissions.includes("overview.console");
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const resizeRafRef = useRef<number | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const getTerminalTheme = useCallback((dark: boolean, cursorColor: string) => {
    return dark
      ? {
          background: "#08090c",
          foreground: "#e2e8f0",
          cursor: cursorColor,
          selectionBackground: "rgba(0, 242, 254, 0.25)",
          black: "#1e293b",
          red: "#ef4444",
          green: "#10b981",
          yellow: "#f59e0b",
          blue: "#3b82f6",
          magenta: "#8b5cf6",
          cyan: "#06b6d4",
          white: "#f8fafc"
        }
      : {
          background: "#0f172a",
          foreground: "#f8fafc",
          cursor: cursorColor,
          selectionBackground: "rgba(0, 242, 254, 0.35)",
          black: "#020617",
          red: "#f87171",
          green: "#34d399",
          yellow: "#fbbf24",
          blue: "#60a5fa",
          magenta: "#a78bfa",
          cyan: "#22d3ee",
          white: "#ffffff"
        };
  }, []);

  const handlePowerAction = async (action: "start" | "stop" | "restart" | "kill") => {
    if (!nodeOnline || actionLoading || !canPower) return;
    setActionLoading(true);

    if (action === "start") setStatus("starting");
    if (action === "stop" || action === "kill") setStatus("stopping");

    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/power`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });

      if (!res.ok) {
        const errData = await res.json();
        xtermRef.current?.writeln(`\r\n${ERROR_BADGE}\x1b[31m${errData.error || "Power command failed"}\x1b[0m\r\n`);
      }
    } catch {
      xtermRef.current?.writeln(`\r\n${ERROR_BADGE}\x1b[31mFailed to contact API server.\x1b[0m\r\n`);
    } finally {
      setActionLoading(false);
    }
  };

  const fitTerminal = useCallback(() => {
    if (resizeRafRef.current) {
      cancelAnimationFrame(resizeRafRef.current);
    }

    resizeRafRef.current = requestAnimationFrame(() => {
      if (!terminalRef.current || !fitAddonRef.current || !xtermRef.current) return;

      const rect = terminalRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const widthDelta = Math.abs(rect.width - lastDimensionsRef.current.width);
      const heightDelta = Math.abs(rect.height - lastDimensionsRef.current.height);

      if (widthDelta > 4 || heightDelta > 4) {
        lastDimensionsRef.current = { width: rect.width, height: rect.height };
        try {
          fitAddonRef.current.fit();
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
      lineHeight: 1.2,
      letterSpacing: 0,
      convertEol: true,
      scrollback: 5000,
      theme: getTerminalTheme(isDark, accentColor),
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const history = getConsoleHistory();
    for (let i = 0; i < history.length; i++) {
      term.write(history[i]);
    }

    const initTimeout = setTimeout(() => {
      lastDimensionsRef.current = { width: 0, height: 0 };
      fitTerminal();
    }, 100);

    const targetToObserve = terminalContainerRef.current || terminalRef.current;
    const resizeObserver = new ResizeObserver(() => {
      fitTerminal();
    });
    resizeObserver.observe(targetToObserve);

    const unsubscribe = subscribeConsoleOutput((text: string) => {
      if (xtermRef.current) {
        xtermRef.current.write(text);
      }
    });

    return () => {
      clearTimeout(initTimeout);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      unsubscribe();
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = getTerminalTheme(isDark, accentColor);
    }
  }, [isDark, accentColor, getTerminalTheme]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || !nodeOnline || overlayState || !canConsole) return;

    sendCommand(commandInput);
    setCommandInput("");
  };

  const isRunning = status === "running";
  const isStarting = status === "starting";
  const isStopping = status === "stopping";
  const isOffline = status === "offline";

  return (
    <div className="space-y-6 font-sans">
      {!nodeOnline && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 shadow-sm ${
            isDark
              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">The node seems to be having some trouble. Power controls may be disabled.</span>
        </div>
      )}
      <div
        className={`p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full transition-colors ${
              isRunning
                ? "bg-emerald-400 animate-pulse"
                : isStarting
                ? "bg-amber-400 animate-pulse"
                : isStopping
                ? "bg-orange-400 animate-pulse"
                : isDark
                ? "bg-zinc-600"
                : "bg-zinc-400"
            }`}
          />
          <div>
            <h2 className={`text-sm font-bold capitalize ${isDark ? "text-white" : "text-zinc-900"}`}>
              {status}
            </h2>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Server Status</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handlePowerAction("start")}
            disabled={!nodeOnline || actionLoading || !isOffline || !canPower}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 flex items-center gap-1.5 border ${
              isDark
                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
            }`}
          >
            <PlayIcon className="w-3.5 h-3.5" />
            <span>{isStarting ? "Starting..." : "Start"}</span>
          </button>

          <button
            onClick={() => handlePowerAction("restart")}
            disabled={!nodeOnline || actionLoading || !isRunning || !canPower}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 flex items-center gap-1.5 border ${
              isDark
                ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20"
                : "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200"
            }`}
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>

          <button
            onClick={() => handlePowerAction("stop")}
            disabled={!nodeOnline || actionLoading || (!isRunning && !isStarting) || !canPower}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 flex items-center gap-1.5 border ${
              isDark
                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
            }`}
          >
            <StopIcon className="w-3.5 h-3.5" />
            <span>{isStopping ? "Stopping..." : "Stop"}</span>
          </button>

          <button
            onClick={() => handlePowerAction("kill")}
            disabled={!nodeOnline || actionLoading || isOffline || !canPower}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 border ${
              isDark
                ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-500/30"
                : "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
            }`}
            title="Force Kill"
          >
            <BoltIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div
          ref={terminalContainerRef}
          className={`lg:col-span-8 p-4 rounded-2xl border shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[520px] transition-colors ${
            isDark ? "border-white/[0.06] bg-[#08090c]" : "border-zinc-200 bg-[#0f172a]"
          }`}
        >
          {overlayState && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
              <Loading width={32} height={32} color={overlayState === "refresh_page" ? "#f97316" : "#f43f5e"} />

              {overlayState === "connecting" && (
                <div className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-2.5 shadow-lg">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>Connecting to daemon...</span>
                </div>
              )}

              {overlayState === "refresh_page" && (
                <div className="px-4 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/20 text-orange-300 text-xs font-bold flex items-center gap-2.5 shadow-lg">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>Connection lost. Please refresh the page.</span>
                </div>
              )}
            </div>
          )}

          <div ref={terminalRef} className="flex-1 w-full rounded-lg overflow-hidden min-h-[420px]" />

          <form onSubmit={handleSendCommand} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              disabled={!nodeOnline || !!overlayState || !canConsole}
              placeholder={
                !canConsole
                  ? "Console command execution disabled (missing permission)."
                  : nodeOnline
                  ? "Type a command..."
                  : "Daemon offline. Commands disabled."
              }
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-mono focus:border-cyan-500/50 transition-all disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!nodeOnline || !!overlayState || !commandInput.trim() || !canConsole}
              style={{ backgroundColor: accentColor }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-black transition-all hover:opacity-90 disabled:opacity-40 shrink-0 shadow-sm"
            >
              Send
            </button>
          </form>
        </div>
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 h-full">
          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              isDark ? "border-white/[0.06] bg-[#1a202c]/50" : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
              <WifiIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Address</p>
              <p className={`text-sm font-bold font-mono truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                {serverData.allocation || "0.0.0.0:25565"}
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              isDark ? "border-white/[0.06] bg-[#1a202c]/50" : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Uptime</p>
              <p className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-zinc-900"}`}>
                {formatUptime(stats.uptimeSeconds)}
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              isDark ? "border-white/[0.06] bg-[#1a202c]/50" : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
              <CpuChipIcon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>CPU Load</p>
              <p className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-zinc-900"}`}>
                {stats.cpu}% <span className={`text-xs font-normal ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>/ {serverData.cpu}%</span>
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              isDark ? "border-white/[0.06] bg-[#1a202c]/50" : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
              <CircleStackIcon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Memory</p>
              <p className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-zinc-900"}`}>
                {formatBytes(stats.memoryBytes)}{" "}
                <span className={`text-xs font-normal ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>/ {serverData.memory} MB</span>
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              isDark ? "border-white/[0.06] bg-[#1a202c]/50" : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
              <CircleStackIcon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Disk</p>
              <p className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-zinc-900"}`}>
                {formatBytes(stats.diskBytes)}{" "}
                <span className={`text-xs font-normal ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>/ {serverData.disk} MB</span>
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              isDark ? "border-white/[0.06] bg-[#1a202c]/50" : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <ArrowDownTrayIcon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Network (Inbound)</p>
              <p className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-zinc-900"}`}>{formatBytes(stats.rxBytes)}</p>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              isDark ? "border-white/[0.06] bg-[#1a202c]/50" : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? "bg-teal-500/10 text-teal-400" : "bg-teal-50 text-teal-600"}`}>
              <ArrowUpTrayIcon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Network (Outbound)</p>
              <p className={`text-sm font-bold font-mono ${isDark ? "text-white" : "text-zinc-900"}`}>{formatBytes(stats.txBytes)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}