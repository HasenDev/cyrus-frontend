import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientProviders from "@/components/Layout/ClientProviders";
import { config } from "@/lib/main";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDark = config.theme === "dark";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased ${
        isDark ? "dark" : ""
      }`}
      style={{
        colorScheme: isDark ? "dark" : "light",
        backgroundColor: isDark ? "#050608" : "#ffffff",
      }}
    >
      <body
        className={`min-h-full w-full flex flex-col font-sans transition-colors duration-200 selection:bg-cyan-500/30 selection:text-cyan-800 ${
          isDark ? "bg-[#050608] text-zinc-50" : "bg-white text-zinc-900"
        }`}
        style={{
          colorScheme: isDark ? "dark" : "light",
          backgroundColor: isDark ? "#050608" : "#ffffff",
        }}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}