"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMainInfoStore } from "@/components/Layout/ClientProviders";
import MDHandler from "@/components/Design/MDHandler";
import { config } from "@/lib/main";

export default function TermsOfService() {
  const { mainInfoStore } = useMainInfoStore();

  const accentColor = mainInfoStore?.accentColor || config.accentColor || "#00f2fe";
  const panelName = mainInfoStore?.name || "Control Panel";

  const rawInfo = mainInfoStore as any;
  const hasCustomTos = Boolean(
    rawInfo?.customLegal &&
      typeof rawInfo?.tos === "string" &&
      rawInfo.tos.trim().length > 0
  );

  const customContent: string = rawInfo?.tos || "";
  const updatedAtRaw = rawInfo?.tosUpdatedAt;

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
              Terms of Service
            </h1>
            <p className="text-xs text-zinc-500">
              Last Updated: {lastUpdated}
            </p>
          </div>

          {hasCustomTos ? (
            <div className="text-sm leading-relaxed text-zinc-300">
              <MDHandler content={customContent} />
            </div>
          ) : (
            <div className="space-y-6 text-sm leading-relaxed text-zinc-400">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">1. Acceptance of Terms</h2>
                <p>
                  By creating an account, accessing, or utilizing this server management platform (the &quot;{panelName}&quot;), you agree to comply with and be bound by these Terms of Service. This software is host-agnostic and may be deployed independently by third-party hosting providers. Your agreement is between you and the specific operator deploying this instance.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">2. User Account Security</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your credentials, including passwords and such. Any activity occurring under your account is your sole responsibility. If you suspect unauthorized access, notify your system administrator immediately.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">3. Acceptable Use</h2>
                <p>
                  You agree not to use the {panelName} or the underlying server resources for any unlawful activities, including but not limited to:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Launching denial-of-service (DDoS) attacks or scanning remote networks.</li>
                  <li>Mining cryptocurrency without explicit written authorization from the host operator.</li>
                  <li>Hosting, distributing, or processing malicious software, malware, or illegal material.</li>
                  <li>Attempting to bypass system resource constraints, virtualization boundaries, or node limitations.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">4. Third-Party Hosting and Deployments</h2>
                <p>
                  The developers of the core Panel software do not operate, control, or supervise individual instances deployed by independent administrators. We disclaim all liability regarding service interruptions, data loss, server hardware failures, or network outages caused by the third-party infrastructure provider hosting this specific panel deployment.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">5. Limitation of Liability</h2>
                <p>
                  The {panelName} software is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without warranties of any kind, either express or implied. In no event shall the developers or the instance operators be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the platform.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-zinc-100">6. Modifications and Termination</h2>
                <p>
                  The instance operator reserves the right to modify or terminate access to the service, change resource allocations, or suspend accounts at any time, with or without prior notice, in the event of resource abuse or policy violations.
                </p>
              </section>
            </div>
          )}

          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:justify-between gap-4 text-xs">
            <span className="text-zinc-500">
              Questions about these terms? Contact your server administrator.
            </span>
            <Link
              href="/privacy"
              style={{ color: accentColor }}
              className="font-bold hover:underline"
            >
              Read Privacy Policy
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}