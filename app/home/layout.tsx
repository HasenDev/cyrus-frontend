"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import Sidebar from "@/components/HomeLayout/Sidebar";
import Header from "@/components/HomeLayout/Header";
import LegalAcceptanceModal from "@/components/Modals/LegalAcceptanceModal";
import { config, apiRequest, setAccentColor } from "@/lib/main";

export interface PanelInfo {
  name: string;
  description: string;
  icon: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  bot: boolean;
  createdAt: number;
  permissions?: string[];
  accessLevel?: string;
  requiresLegalAcceptance?: boolean;
  acceptedTosAndPrivacyAt?: number | null;
  panel?: PanelInfo;
  accentColor?: string;
  metrics?: {
    ramUsed: number;
    maxRam: number;
    cpuUsage: string;
    credits: number;
    deployments: number;
    maxDeployments: number;
    bandwidthUsed: number;
    maxBandwidth: number;
  };
  newsletter?: {
    title: string;
    description: string;
    image: string | null;
  };
}

interface AppContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppStore must be used within a home layout context");
  }
  return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDark = config.theme === "dark";

  const fetchUserProfile = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/account/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data: User = await res.json();
        if (data.accentColor) {
          setAccentColor(data.accentColor);
        }
        if (data && data.avatarUrl && typeof data.avatarUrl === "string") {
          if (
            !data.avatarUrl.startsWith("http://") &&
            !data.avatarUrl.startsWith("https://")
          ) {
            const baseUrl = config.apiBaseUrl.endsWith("/")
              ? config.apiBaseUrl.slice(0, -1)
              : config.apiBaseUrl;
            const cleanAvatarPath = data.avatarUrl.startsWith("/")
              ? data.avatarUrl
              : `/${data.avatarUrl}`;

            data.avatarUrl = `${baseUrl}${cleanAvatarPath}`;
          }
        }

        setUser(data);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  if (isLoading) {
    return (
      <div
        className={`relative flex h-[100dvh] w-full items-center justify-center transition-colors ${
          isDark ? "bg-[#050608]" : "bg-white"
        }`}
      >
        <div className="relative h-11 w-11">
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              isDark ? "border-white/5" : "border-zinc-200"
            }`}
          />
          <div
            className="absolute inset-0 rounded-full border-2 border-r-transparent border-b-transparent border-l-transparent animate-spin"
            style={{ borderTopColor: config.accentColor }}
          />
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{ user, isLoading, refreshUser: fetchUserProfile }}
    >
      <div
        className={`relative min-h-screen w-full font-sans transition-colors ${
          isDark ? "bg-[#050608] text-zinc-100" : "bg-white text-zinc-900"
        }`}
      >
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex flex-col min-h-screen w-full md:pl-64">
          <Header setSidebarOpen={setSidebarOpen} />

          <main
            className={`flex-1 w-full p-6 sm:p-8 lg:p-10 ${isDark ? "bg-[#050608]" : "bg-white"}`}
          >
            {children}
          </main>

          <footer
            className={`w-full px-6 py-5 text-xs text-center select-none transition-colors ${
              isDark ? "text-zinc-600" : "text-zinc-400"
            }`}
          >
            <span>Powered by </span>
            <a
              href="https://cyrus.admibot.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold transition-colors ${
                isDark ? "hover:text-zinc-300" : "hover:text-zinc-700"
              }`}
            >
              Cyrus Panel®
            </a>
          </footer>
        </div>

        <LegalAcceptanceModal
          isOpen={Boolean(user?.requiresLegalAcceptance)}
          onAccepted={fetchUserProfile}
        />
      </div>
    </AppContext.Provider>
  );
}