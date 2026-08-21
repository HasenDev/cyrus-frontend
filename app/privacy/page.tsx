"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMainInfoStore } from "@/components/Layout/ClientProviders";
import MDHandler from "@/components/Design/MDHandler";
import { config } from "@/lib/main";

export default function PrivacyPolicy() {
  const { mainInfoStore } = useMainInfoStore();

  const accentColor = mainInfoStore?.accentColor || config.accentColor || "#00f2fe";
  const panelName = mainInfoStore?.name || "Control Panel";

  const rawInfo = mainInfoStore as any;
  const hasCustomPrivacy = Boolean(
    rawInfo?.customLegal &&
      typeof rawInfo?.privacy === "string" &&
      rawInfo.privacy.trim().length > 0
  );

  const customContent: string = rawInfo?.privacy || "";
  const updatedAtRaw = rawInfo?.privacyUpdatedAt;

  const formatLastUpdated = (dateVal?: string | number | null) => {
    if (!dateVal) return "August 2026";
    try {
      const parsedDate = new Date(dateVal);
      if (isNaN(parsedDate.getTime())) return String(dateVal);
      return parsedDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "August 2026";
    }
  };

  const lastUpdated = formatLastUpdated(updatedAtRaw);

  return (
    <div className="relative min-h-screen w-full bg-[#050608] font-sans text-zinc-300 py-16 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0)`,
            backgroundSize: "14px 14px",
          }}
        />
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full filter blur-[150px] opacity-[0.06]"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="mb-12 flex justify-between items-center border-b border-white/[0.06] pb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors duration-150 group"
          >
            <svg
              className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform duration-150"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to panel</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#0F1014] border border-white/[0.06] rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8"
        >
          <div>
            <h1
              className="text-3xl font-black tracking-tight bg-clip-text text-transparent mb-2"
              style={{
                backgroundImage: `linear-gradient(to right, ${accentColor}, #4facfe)`,
              }}
            >
              Privacy Policy
            </h1>
            <p className="text-xs text-zinc-500">
              Last Updated: {lastUpdated}
            </p>
          </div>

          {hasCustomPrivacy ? (
            <div className="text-sm leading-relaxed text-zinc-300">
              <MDHandler content={customContent} />
            </div>
          ) : (
            <div className="space-y-6 text-sm leading-relaxed text-zinc-400">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">1. Information We Collect</h2>
                <p>
                  To provide administration and execution functions, this {panelName} instance collects specific data, which may include:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Account Credentials:</strong> Email address, username, cryptographically hashed passwords, and 2FA secrets.</li>
                  <li><strong>Network Identifiers:</strong> IP addresses utilized during account authentication and system API operations.</li>
                  <li><strong>System Logs:</strong> Server commands, container execution status, and resource consumption details linked to your profile.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">2. How Information is Used</h2>
                <p>
                  The gathered data is strictly used for platform operation, security validation, and instance analytics:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>To authenticate user sessions and secure API endpoints.</li>
                  <li>To allocate system resources and monitor hardware health constraints.</li>
                  <li>To compile activity logs to help troubleshoot container deployments and connection issues.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">3. Data Retention and Ownership</h2>
                <p>
                  Because this Panel is self-hosted and host-agnostic, your data is retained locally within the databases managed by your independent host operator. The developers of the core Panel source code have no access to, storage of, or ownership over your system configurations, user profiles, or raw data streams.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">4. Cookies and Storage</h2>
                <p>
                  This Panel utilizes standard browser localStorage, sessionStorage, and security cookies to persist session tokens, user-interface state preferences, and defensive authentication states. Disabling these options may prevent the dashboard from rendering or functioning correctly.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">5. Information Disclosure</h2>
                <p>
                  Instance operators do not sell, trade, or transfer your identifying credentials or telemetry data to third parties. Data is only disclosed when required by law or to defend against security attacks on the underlying infrastructure node networks.
                </p>
              </section>
            </div>
          )}

          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:justify-between gap-4 text-xs">
            <span className="text-zinc-500">
              For deletion requests, contact your specific hosting system administrator.
            </span>
            <Link
              href="/terms"
              style={{ color: accentColor }}
              className="font-bold hover:underline"
            >
              Read Terms of Service
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}