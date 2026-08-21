"use client";

import { config } from "@/lib/main";

interface LoadingProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function Loading({
  width = 16,
  height = 16,
  color,
}: LoadingProps) {
  const activeColor = color || config.accentColor;
  const isDark = config.theme === "dark";

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width, height }}
    >
      <svg
        className="absolute inset-0 h-full w-full animate-spin"
        viewBox="0 0 100 100"
        style={{ animationDuration: "0.7s" }}
      >
        <defs>
          <linearGradient
            id={`spinner-grad-${width}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={activeColor} stopOpacity="1" />
            <stop offset="100%" stopColor={activeColor} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="10"
          className={isDark ? "stroke-zinc-800" : "stroke-zinc-200"}
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={`url(#spinner-grad-${width})`}
          strokeDasharray="140 180"
        />
      </svg>
    </div>
  );
}