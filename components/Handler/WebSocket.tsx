"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { apiRequest } from "@/lib/main";

export interface ServerStats {
  cpu: number;
  memoryBytes: number;
  memoryLimitBytes: number;
  diskBytes: number;
  rxBytes: number;
  txBytes: number;
  uptimeSeconds: number;
}

interface UseServerWebSocketOptions {
  serverId: string | null;
  serverMemory?: number;
  enabled?: boolean;
}

export function useServerWebSocket({
  serverId,
  serverMemory = 1024,
  enabled = true
}: UseServerWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const reconnectCountRef = useRef<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const consoleHistoryRef = useRef<string[]>([]);
  const consoleSubscribersRef = useRef<Set<(text: string) => void>>(new Set());

  const [status, setStatus] = useState<string>("offline");
  const [overlayState, setOverlayState] = useState<"connecting" | "refresh_page" | null>(null);
  const [stats, setStats] = useState<ServerStats>({
    cpu: 0,
    memoryBytes: 0,
    memoryLimitBytes: serverMemory * 1024 * 1024,
    diskBytes: 0,
    rxBytes: 0,
    txBytes: 0,
    uptimeSeconds: 0
  });

  const resetStats = useCallback((memoryMb: number) => {
    setStats({
      cpu: 0,
      memoryBytes: 0,
      memoryLimitBytes: memoryMb * 1024 * 1024,
      diskBytes: 0,
      rxBytes: 0,
      txBytes: 0,
      uptimeSeconds: 0
    });
  }, []);

  const getConsoleHistory = useCallback(() => {
    return consoleHistoryRef.current;
  }, []);

  const subscribeConsoleOutput = useCallback((callback: (text: string) => void) => {
    consoleSubscribersRef.current.add(callback);
    return () => {
      consoleSubscribersRef.current.delete(callback);
    };
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "send command", args: [cmd] }));
    }
  }, []);

  const closeWebSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(async (targetServerId: string, memMb: number) => {
    if (!targetServerId || isConnectingRef.current) return;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    closeWebSocket();
    isConnectingRef.current = true;

    let wsToken = "";
    let socketUrl = "";

    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${targetServerId}/ws-token`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to get websocket authorization token.");

      const data = await res.json();
      wsToken = data.token;
      socketUrl = data.socketUrl;
    } catch {
      isConnectingRef.current = false;
      reconnectCountRef.current += 1;
      if (reconnectCountRef.current >= 4) {
        setOverlayState("refresh_page");
      } else {
        setOverlayState("connecting");
        reconnectTimerRef.current = setTimeout(() => connect(targetServerId, memMb), 3500);
      }
      return;
    }

    try {
      const ws = new WebSocket(
        `${socketUrl}?token=${encodeURIComponent(wsToken)}&server=${encodeURIComponent(targetServerId)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        reconnectCountRef.current = 0;
        setOverlayState(null);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === "console output" && typeof msg.args?.[0] === "string") {
            const text = msg.args[0];
            consoleHistoryRef.current.push(text);
            if (consoleHistoryRef.current.length > 2500) {
              consoleHistoryRef.current.shift();
            }
            consoleSubscribersRef.current.forEach((cb) => cb(text));
          } else if (msg.event === "status" && msg.args?.[0]) {
            const newStatus = String(msg.args[0]);
            setStatus(newStatus);
            if (newStatus === "offline" || newStatus === "stopping") {
              resetStats(memMb);
            }
          } else if (msg.event === "stats" && msg.args?.[0]) {
            const parsed = typeof msg.args[0] === "string" ? JSON.parse(msg.args[0]) : msg.args[0];
            setStats({
              cpu: parsed.cpu_absolute || 0,
              memoryBytes: parsed.memory_bytes || 0,
              memoryLimitBytes: parsed.memory_limit_bytes || memMb * 1024 * 1024,
              diskBytes: parsed.disk_bytes || 0,
              rxBytes: parsed.network_rx_bytes || 0,
              txBytes: parsed.network_tx_bytes || 0,
              uptimeSeconds: parsed.uptime_seconds || 0
            });
          }
        } catch {}
      };

      ws.onclose = (e) => {
        isConnectingRef.current = false;
        wsRef.current = null;

        if (e.code === 4001) {
          window.location.reload();
          return;
        }

        reconnectCountRef.current += 1;
        if (reconnectCountRef.current >= 4) {
          setOverlayState("refresh_page");
        } else {
          setOverlayState("connecting");
          reconnectTimerRef.current = setTimeout(() => connect(targetServerId, memMb), 3500);
        }
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
      };
    } catch {
      isConnectingRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => connect(targetServerId, memMb), 3500);
    }
  }, [closeWebSocket, resetStats]);

  useEffect(() => {
    if (!serverId || !enabled) {
      closeWebSocket();
      return;
    }

    connect(serverId, serverMemory);

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: "ping" }));
      }
    }, 20000);

    return () => {
      clearInterval(pingInterval);
      closeWebSocket();
    };
  }, [serverId, enabled, connect, closeWebSocket, serverMemory]);

  return {
    status,
    setStatus,
    stats,
    overlayState,
    sendCommand,
    getConsoleHistory,
    subscribeConsoleOutput,
    resetStats
  };
}