"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { config, apiRequest, setAccentColor } from "@/lib/main";

export interface MainInfo {
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  emailEnabled: boolean;
  recaptchaEnabled: boolean;
  recaptchaPublicKey: string;
  customLegal?: boolean;
  tos?: string | null;
  privacy?: string | null;
  tosUpdatedAt?: string | number | null;
  privacyUpdatedAt?: string | number | null;
  websiteUrl?: string | null;
  discordUrl?: string | null;
}

interface MainInfoContextType {
  mainInfoStore: MainInfo | null;
  isLoadingInfo: boolean;
  refreshInformation: () => Promise<void>;
}

const MainInfoContext = createContext<MainInfoContextType>({
  mainInfoStore: null,
  isLoadingInfo: true,
  refreshInformation: async () => {},
});

export function useMainInfoStore() {
  return useContext(MainInfoContext);
}

const PUBLIC_PATHS = [
  "/",
  "/register",
  "/terms",
  "/privacy",
  "/verify-email",
  "/reset-password",
];

const CACHE_COOKIE_KEY = "panel_info";

const getDynamicTitle = (path: string, panelName?: string): string => {
  const baseName =
    panelName && panelName.trim() ? panelName.trim() : "Control Panel";

  if (path === "/" || path === "/register") {
    return `${baseName} - Auth`;
  }
  if (path === "/privacy") {
    return `${baseName} - Privacy`;
  }
  if (path === "/terms") {
    return `${baseName} - TOS`;
  }
  if (path === "/verify-email") {
    return `${baseName} - Verify Email`;
  }
  if (path === "/reset-password") {
    return `${baseName} - Reset Password`;
  }
  if (path.startsWith("/home/admin")) {
    return `${baseName} - Admin`;
  }
  if (path.startsWith("/home")) {
    return `${baseName} - Home`;
  }
  return baseName;
};

const getInitialCache = (): MainInfo | null => {
  if (typeof window !== "undefined") {
    const cached = Cookies.get(CACHE_COOKIE_KEY);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {}
    }
  }

  return null;
};

const applyDOMMetadata = (info: MainInfo | null, pathname: string) => {
  if (typeof window === "undefined") return;

  const panelName = info?.name || "Control Panel";

  document.title = getDynamicTitle(pathname, panelName);

  const iconUrl =
    info?.icon && info.icon.trim() ? info.icon.trim() : "/ico/favicon.ico";

  let link: HTMLLinkElement | null = document.querySelector(
    "link[rel*='icon']"
  );

  if (!link) {
    link = document.createElement("link");
    link.rel = "shortcut icon";
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  link.href = iconUrl;

  if (info?.accentColor) {
    setAccentColor(info.accentColor);
  }
};

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isDark = config.theme === "dark";
  const [mainInfoStore, setMainInfoStore] = useState<MainInfo | null>(
    getInitialCache
  );
  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(
    !getInitialCache()
  );
  const infoFetchedRef = useRef<boolean>(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const authFetchedRef = useRef<boolean>(false);
  const [progress, setProgress] = useState(0);
  const [progressVisible, setProgressVisible] = useState(false);
  const scrollbarContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const scrollbarDragRef = useRef<{
    active: boolean;
    startY: number;
    startScrollY: number;
  }>({
    active: false,
    startY: 0,
    startScrollY: 0,
  });

  const updateScrollbarDOM = useCallback(() => {
    if (typeof window === "undefined") return;

    const container = scrollbarContainerRef.current;
    const thumb = scrollbarThumbRef.current;
    if (!container || !thumb) return;

    const doc = document.documentElement;
    const viewportHeight = window.innerHeight;
    const scrollHeight = Math.max(
      doc.scrollHeight,
      document.body?.scrollHeight || 0
    );

    if (scrollHeight <= viewportHeight + 2) {
      container.style.display = "none";
      return;
    }

    container.style.display = "block";

    const ratio = viewportHeight / scrollHeight;
    const thumbHeight = Math.max(
      32,
      Math.min(viewportHeight, viewportHeight * ratio)
    );

    const maxScroll = scrollHeight - viewportHeight;
    const maxThumbTop = viewportHeight - thumbHeight;

    const scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    const thumbTop = Math.max(0, Math.min(1, scrollProgress)) * maxThumbTop;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
  }, []);

  const scheduleScrollbarUpdate = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      updateScrollbarDOM();
      rafIdRef.current = null;
    });
  }, [updateScrollbarDOM]);

  useEffect(() => {
    scheduleScrollbarUpdate();

    const onScroll = () => scheduleScrollbarUpdate();
    const onResize = () => scheduleScrollbarUpdate();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        scheduleScrollbarUpdate();
      });
      if (document.documentElement) ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleScrollbarUpdate]);

  useEffect(() => {
    scheduleScrollbarUpdate();
  }, [pathname, scheduleScrollbarUpdate]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = scrollbarDragRef.current;
      if (!drag.active) return;

      const viewportHeight = window.innerHeight;
      const doc = document.documentElement;
      const scrollHeight = Math.max(
        doc.scrollHeight,
        document.body?.scrollHeight || 0
      );

      const ratio = viewportHeight / scrollHeight;
      const thumbHeight = Math.max(
        32,
        Math.min(viewportHeight, viewportHeight * ratio)
      );

      const maxScroll = scrollHeight - viewportHeight;
      const maxThumbTop = viewportHeight - thumbHeight;

      if (maxScroll <= 0 || maxThumbTop <= 0) return;

      const deltaY = event.clientY - drag.startY;
      const deltaScroll = (deltaY / maxThumbTop) * maxScroll;

      window.scrollTo({
        top: drag.startScrollY + deltaScroll,
        behavior: "auto",
      });
    };

    const handlePointerUp = () => {
      scrollbarDragRef.current.active = false;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleScrollbarPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    scrollbarDragRef.current = {
      active: true,
      startY: event.clientY,
      startScrollY: window.scrollY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    if (mainInfoStore) {
      applyDOMMetadata(mainInfoStore, pathname);
    } else {
      const cached = getInitialCache();

      if (cached) {
        applyDOMMetadata(cached, pathname);
      } else {
        document.title = getDynamicTitle(pathname, "Control Panel");
      }
    }
  }, [pathname, mainInfoStore]);

  const fetchInformation = useCallback(
    async (force = false) => {
      if (infoFetchedRef.current && !force) return;

      setIsLoadingInfo(true);

      let resolvedData: MainInfo | null = null;

      try {
        const res = await apiRequest("api/v1/information", {
          method: "GET",
        });

        if (res.ok) {
          const data: MainInfo = await res.json();

          resolvedData = data;
          infoFetchedRef.current = true;

          Cookies.set(CACHE_COOKIE_KEY, JSON.stringify(data), {
            expires: 7,
            path: "/",
          });
        } else {
          infoFetchedRef.current = true;
        }
      } catch (err) {
        console.warn(
          "[ClientProviders] Information fetch failed.",
          err
        );
      }

      if (!resolvedData) {
        resolvedData = getInitialCache();
      }

      if (!resolvedData) {
        resolvedData = {
          name: "Control Panel",
          description:
            "High-performance cloud compute and service management panel.",
          icon: "/ico/favicon.ico",
          accentColor: config.accentColor || "#00f2fe",
          emailEnabled: false,
          recaptchaEnabled: false,
          recaptchaPublicKey: "",
        };
      }

      setMainInfoStore(resolvedData);
      applyDOMMetadata(resolvedData, pathname);
      setIsLoadingInfo(false);
    },
    [pathname]
  );

  useEffect(() => {
    fetchInformation();
  }, [fetchInformation]);

  const checkAuth = useCallback(async (force = false) => {
    if (authFetchedRef.current && !force) return;

    const token = Cookies.get("token");

    if (!token) {
      authFetchedRef.current = true;
      setIsAuthenticated(false);
      return;
    }

    let isValid = false;

    try {
      const res = await apiRequest("api/v1/account/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        isValid = true;
      } else {
        Cookies.remove("token");
        isValid = false;
      }

      authFetchedRef.current = true;
    } catch (err) {
      console.warn(
        "[ClientProviders] Auth verification network failure.",
        err
      );

      isValid = false;
    }

    setIsAuthenticated(isValid);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const checkTokenState = () => {
      const token = Cookies.get("token");

      if (isAuthenticated && !token) {
        setIsVerifying(true);
        setIsAuthenticated(false);

        const isPublicPath = PUBLIC_PATHS.includes(pathname);

        if (!isPublicPath) {
          router.replace("/");
        }
      }
    };

    const interval = setInterval(checkTokenState, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, pathname, router]);

  useEffect(() => {
    if (isAuthenticated === null) return;

    const token = Cookies.get("token");
    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (isAuthenticated && !token) {
      setIsVerifying(true);
      setIsAuthenticated(false);

      if (!isPublicPath) {
        router.replace("/");
      }

      return;
    }

    let targetPath: string | null = null;

    if (isAuthenticated && token) {
      if (pathname === "/" || pathname === "/register") {
        targetPath = "/home";
      }
    } else {
      if (!isPublicPath) {
        targetPath = "/";
      }
    }

    if (targetPath && targetPath !== pathname) {
      setIsVerifying(true);
      router.replace(targetPath);
    } else {
      setIsVerifying(false);
    }
  }, [pathname, isAuthenticated, router]);

  useEffect(() => {
    setProgressVisible(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(70), 80);

    const t2 = setTimeout(() => {
      setProgress(100);

      const t3 = setTimeout(() => {
        setProgressVisible(false);
        setProgress(0);
      }, 250);

      return () => clearTimeout(t3);
    }, 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  const isHome = pathname.startsWith("/home");
  const activeAccentColor =
    mainInfoStore?.accentColor || config.accentColor;

  return (
    <MainInfoContext.Provider
      value={{
        mainInfoStore,
        isLoadingInfo,
        refreshInformation: () => fetchInformation(true),
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root,
            html,
            body {
              color-scheme: ${isDark ? "dark" : "light"} !important;
            }
            html,
            body {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }

            html::-webkit-scrollbar,
            body::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
              background: transparent !important;
            }
            body * {
              scrollbar-width: thin;
              scrollbar-color:
                ${
                  isDark
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.2)"
                }
                transparent;
            }

            body *::-webkit-scrollbar {
              width: 8px;
              height: 8px;
              background: transparent !important;
            }

            body *::-webkit-scrollbar-track {
              background: transparent !important;
            }

            body *::-webkit-scrollbar-track-piece {
              background: transparent !important;
            }

            body *::-webkit-scrollbar-thumb {
              background-color: ${
                isDark
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.2)"
              } !important;
              border: 0 !important;
              border-radius: 9999px;
            }

            body *::-webkit-scrollbar-thumb:hover {
              background-color: ${activeAccentColor} !important;
            }

            body *::-webkit-scrollbar-corner {
              background: transparent !important;
            }
          `,
        }}
      />
      <div
        ref={scrollbarContainerRef}
        aria-hidden="true"
        className="pointer-events-none fixed right-0 top-0 z-[10000] will-change-transform"
        style={{
          width: "8px",
          height: "100dvh",
          display: "none",
        }}
      >
        <div
          ref={scrollbarThumbRef}
          role="presentation"
          className="pointer-events-auto absolute right-0 rounded-full cursor-pointer will-change-transform"
          onPointerDown={handleScrollbarPointerDown}
          style={{
            width: "8px",
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(0, 0, 0, 0.2)",
            transition: "background-color 150ms ease",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = activeAccentColor;
          }}
          onMouseLeave={(event) => {
            if (!scrollbarDragRef.current.active) {
              event.currentTarget.style.backgroundColor = isDark
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.2)";
            }
          }}
        />
      </div>

      {progressVisible && !isVerifying && isHome && (
        <div className="fixed top-0 left-0 h-[3px] w-full z-[9999] transition-opacity duration-200 bg-transparent">
          <div
            className="h-full transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: activeAccentColor,
            }}
          />
        </div>
      )}

      {isHome && !isVerifying && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <div
            className={`absolute inset-0 ${
              isDark ? "opacity-[0.07]" : "opacity-[0.04]"
            }`}
            style={{
              backgroundImage: `
                linear-gradient(to right, ${
                  isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)"
                } 1px, transparent 1px),
                linear-gradient(to bottom, ${
                  isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)"
                } 1px, transparent 1px)
              `,
              backgroundSize: "56px 56px",
            }}
          />

          <div
            className={`absolute inset-0 ${
              isDark ? "opacity-20" : "opacity-10"
            }`}
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, ${
                isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.04)"
              } 1px, transparent 0)`,
              backgroundSize: "14px 14px",
            }}
          />

          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full filter blur-[150px] opacity-[0.06]"
            style={{
              background: `radial-gradient(circle, ${activeAccentColor} 0%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {isVerifying ? (
        <div
          className={`relative flex h-[100dvh] w-full items-center justify-center overflow-hidden font-sans transition-colors ${
            isDark ? "bg-[#050608]" : "bg-slate-50"
          }`}
        >
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
            <div
              className={`absolute inset-0 ${
                isDark ? "opacity-[0.05]" : "opacity-[0.03]"
              }`}
              style={{
                backgroundImage: `
                  linear-gradient(to right, ${
                    isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  } 1px, transparent 1px),
                  linear-gradient(to bottom, ${
                    isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  } 1px, transparent 1px)
                `,
                backgroundSize: "56px 56px",
              }}
            />

            <div
              className={`absolute inset-0 ${
                isDark ? "opacity-20" : "opacity-10"
              }`}
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, ${
                  isDark
                    ? "rgba(255, 255, 255, 0.03)"
                    : "rgba(0, 0, 0, 0.04)"
                } 1px, transparent 0)`,
                backgroundSize: "14px 14px",
              }}
            />

            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full filter blur-[100px] opacity-[0.05]"
              style={{
                background: `radial-gradient(circle, ${activeAccentColor} 0%, transparent 70%)`,
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="relative h-11 w-11">
              <div
                className={`absolute inset-0 rounded-full border-2 ${
                  isDark ? "border-white/5" : "border-zinc-200"
                }`}
              />

              <motion.div
                className="absolute inset-0 rounded-full border-2 border-r-transparent border-b-transparent border-l-transparent"
                style={{ borderTopColor: activeAccentColor }}
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 0.75,
                  ease: "linear",
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </MainInfoContext.Provider>
  );
}