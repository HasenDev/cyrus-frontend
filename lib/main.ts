import Cookies from "js-cookie";

export interface AppConfig {
  accentColor: string;
  theme: "white" | "dark";
  panelVersion: string;
  testingMode: boolean;
  testingModeApiUrl: string;
  readonly apiBaseUrl: string;
}

const getSavedTheme = (): "white" | "dark" => {
  if (typeof window !== "undefined") {
    const saved = Cookies.get("theme");
    if (saved === "white" || saved === "dark") {
      return saved;
    }
  }
  return "dark";
};

const getSavedAccentColor = (): string => {
  if (typeof window !== "undefined") {
    const cached = Cookies.get("panel_info");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.accentColor === "string" && parsed.accentColor) {
          return parsed.accentColor;
        }
      } catch (e) {}
    }
  }
  return "#00f2fe";
};

export const config: AppConfig = {
  accentColor: getSavedAccentColor(),
  theme: getSavedTheme(),
  panelVersion: "1.0.0",
  testingMode: false,
  testingModeApiUrl: "https://cyruspaneltest.admibot.xyz/",
  get apiBaseUrl(): string {
    if (this.testingMode) {
      const testUrl = this.testingModeApiUrl || "https://testing.example.com";
      return testUrl.endsWith("/") ? testUrl : `${testUrl}/`;
    }

    if (typeof window !== "undefined" && window.location?.origin) {
      const origin = window.location.origin;
      return origin.endsWith("/") ? origin : `${origin}/`;
    }

    return "http://localhost:3000/";
  },
};

export function setTheme(newTheme: "white" | "dark") {
  config.theme = newTheme;
  if (typeof window !== "undefined") {
    Cookies.set("theme", newTheme, { expires: 365, path: "/" });
  }
}

export function setAccentColor(color: string) {
  if (color && typeof color === "string") {
    config.accentColor = color;
  }
}

export function setTestingMode(enabled: boolean, testUrl?: string) {
  config.testingMode = enabled;
  if (testUrl) {
    config.testingModeApiUrl = testUrl;
  }
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = config.apiBaseUrl.endsWith("/")
    ? config.apiBaseUrl
    : `${config.apiBaseUrl}/`;
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint.slice(1)
    : endpoint;

  const url = `${baseUrl}${cleanEndpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
}