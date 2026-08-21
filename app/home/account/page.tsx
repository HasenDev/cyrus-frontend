"use client";

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { useAppStore } from "@/app/home/layout";
import { config, apiRequest } from "@/lib/main";

type ActiveModal = "none" | "username" | "email" | "password" | "avatar" | "logout";

export default function AccountPage() {
  const router = useRouter();
  const { user, refreshUser } = useAppStore();
  const isDark = config.theme === "dark";
  const isLightModeUI = !isDark;
  const accentColor = config.accentColor;
  const [isVerified, setIsVerified] = useState<boolean | null>(
    user?.emailVerified ?? null
  );
  const [resendLoading, setResendLoading] = useState(false);
  const [hasSentResend, setHasSentResend] = useState(false);
  const [resendMsg, setResendMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>("none");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  useEffect(() => {
    const checkVerificationStatus = async () => {
      const token = Cookies.get("token");
      if (!token) return;

      try {
        const res = await apiRequest("api/v1/auth/resend-verification", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (typeof data.emailVerified === "boolean") {
            setIsVerified(data.emailVerified);
          }
        }
      } catch (e) {
        if (user && typeof user.emailVerified === "boolean") {
          setIsVerified(user.emailVerified);
        }
      }
    };

    checkVerificationStatus();
  }, [user]);
  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg(null);

    const token = Cookies.get("token");
    if (!token) {
      setResendMsg({ type: "error", text: "Authentication token missing." });
      setResendLoading(false);
      return;
    }

    try {
      const res = await apiRequest("api/v1/auth/resend-verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setHasSentResend(true);
        setResendMsg({
          type: "success",
          text: data.message || "Verification email sent successfully!",
        });
      } else {
        setResendMsg({
          type: "error",
          text: data.error || "Failed to resend verification email.",
        });
      }
    } catch (err) {
      setResendMsg({
        type: "error",
        text: "Unable to connect to server. Please try again.",
      });
    } finally {
      setResendLoading(false);
    }
  };
  const dicebearUrl = user?.id
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=default`;

  const computeAvatarSrc = () => {
    if (!user?.avatarUrl) return dicebearUrl;
    if (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://")) {
      return user.avatarUrl;
    }
    const cleanBase = config.apiBaseUrl.endsWith("/")
      ? config.apiBaseUrl.slice(0, -1)
      : config.apiBaseUrl;
    const cleanPath = user.avatarUrl.startsWith("/")
      ? user.avatarUrl
      : `/${user.avatarUrl}`;
    return `${cleanBase}${cleanPath}`;
  };

  const [avatarSrc, setAvatarSrc] = useState<string>(computeAvatarSrc());

  useEffect(() => {
    setAvatarSrc(computeAvatarSrc());
  }, [user?.avatarUrl, user?.id]);

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";
  const getAccessBadgeInfo = () => {
    if (user?.bot) {
      return {
        label: "Bot User",
        className: isDark
          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
          : "bg-purple-50 text-purple-600 border border-purple-200",
        style: {},
      };
    }

    const rawLevel =
      user?.accessLevel ||
      (user?.developer || (user as any)?.role === "developer"
        ? "Developer"
        : user?.admin
        ? "Admin"
        : "Client");

    const level = rawLevel.toLowerCase();

    if (level === "developer") {
      return {
        label: "Developer Account",
        className: isDark
          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
          : "bg-orange-50 text-orange-600 border border-orange-200",
        style: {},
      };
    }

    if (level === "admin") {
      return {
        label: "Admin Account",
        className: isDark
          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          : "bg-rose-50 text-rose-600 border border-rose-200",
        style: {},
      };
    }

    if (level === "moderator") {
      return {
        label: "Moderator Account",
        className: isDark
          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          : "bg-blue-50 text-blue-600 border border-blue-200",
        style: {},
      };
    }

    return {
      label: "Client Account",
      className: "border border-transparent",
      style: {
        backgroundColor: `${accentColor}18`,
        color: accentColor,
      },
    };
  };

  const badgeInfo = getAccessBadgeInfo();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const copyAccountId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const closeModal = () => {
    setActiveModal("none");
    setModalError("");
    setModalLoading(false);
    setNewUsername("");
    setNewEmail("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setAvatarPreview(null);
    setAvatarBase64(null);
  };
  const handleLogout = () => {
    Cookies.remove("token");
    closeModal();
    router.replace("/");
  };

  const handleSettingsSubmit = async (
    e: FormEvent,
    payload: {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
      avatar?: string;
    }
  ) => {
    e.preventDefault();
    setModalError("");
    setModalLoading(true);

    const token = Cookies.get("token");
    if (!token) {
      setModalError("Authentication token missing. Please sign in again.");
      setModalLoading(false);
      return;
    }

    try {
      const response = await apiRequest("api/v1/account/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setModalError(data.error || "Failed to update account settings.");
        setModalLoading(false);
        return;
      }

      if (payload.newPassword) {
        Cookies.remove("token");
        closeModal();
        router.replace("/");
        return;
      }

      await refreshUser();
      closeModal();
      showToast(data.message || "Settings updated successfully.");
    } catch (err) {
      setModalError("Unable to connect to server. Please try again.");
      setModalLoading(false);
    }
  };

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setModalError("Image file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result);
      setModalError("");
    };
    reader.readAsDataURL(file);
  };

  const ErrorIcon = () => (
    <svg
      className="h-4 w-4 shrink-0 text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto px-1 sm:px-0">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-bold backdrop-blur-md"
          >
            <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mb-1.5 ${isDark ? "text-white" : "text-zinc-900"}`}>
          Account Settings
        </h1>
        <p className={`text-xs sm:text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Manage your account credentials, security configuration, and profile details.
        </p>
      </div>
      {isVerified === false && (
        <div
          className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isLightModeUI
              ? "bg-orange-50 border-orange-200"
              : "bg-[#1A110B] border-orange-500/20"
          }`}
        >
          <div>
            <h3
              className={`font-bold ${
                isLightModeUI ? "text-orange-900" : "text-orange-400"
              }`}
            >
              Verify your email address
            </h3>
            <p
              className={`text-sm mt-1 max-w-lg ${
                isLightModeUI ? "text-orange-800" : "text-orange-300/80"
              }`}
            >
              Please verify your email address to unlock all features and secure
              your account. A verification email was sent during registration.
            </p>
            {resendMsg && (
              <p
                className={`text-[13px] mt-2 font-bold ${
                  resendMsg.type === "error" ? "text-red-500" : "text-green-500"
                }`}
              >
                {resendMsg.text}
              </p>
            )}
          </div>
          <button
            onClick={handleResend}
            disabled={resendLoading || hasSentResend}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 hover:brightness-110 active:scale-[0.98] ${
              isLightModeUI
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-orange-500 text-white"
            }`}
          >
            {resendLoading
              ? "Sending..."
              : hasSentResend
              ? "Sent"
              : "Resend Email"}
          </button>
        </div>
      )}
      <div
        className={`w-full max-w-full overflow-hidden rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors ${
          isDark
            ? "border-white/[0.06] bg-[#0F1014]"
            : "border-zinc-200 bg-white shadow-slate-200/50"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 w-full max-w-full overflow-hidden">
          <div className="relative group shrink-0">
            <img
              src={avatarSrc}
              onError={() => setAvatarSrc(dicebearUrl)}
              alt="Profile Avatar"
              className={`h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border shadow-inner transition-transform duration-300 group-hover:scale-105 ${
                isDark ? "bg-zinc-800 border-white/[0.08]" : "bg-zinc-100 border-zinc-200"
              }`}
            />
            <button
              type="button"
              onClick={() => {
                setModalError("");
                setActiveModal("avatar");
              }}
              style={{ backgroundColor: accentColor }}
              className="absolute bottom-1 right-1 p-2 rounded-xl text-slate-950 shadow-md opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200"
              title="Change Avatar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-w-0 w-full text-center sm:text-left overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h2 className={`text-xl sm:text-2xl font-bold truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                {user?.username}
              </h2>
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full self-center sm:self-auto ${badgeInfo.className}`}
                style={badgeInfo.style}
              >
                {badgeInfo.label}
              </span>
            </div>

            <p className={`text-xs mb-4 truncate ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {user?.email}
            </p>
            <div className="w-full max-w-full overflow-hidden">
              <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Account UUID / Identifier
              </span>
              <div className="flex items-center gap-2 w-full max-w-full overflow-hidden">
                <span className={`min-w-0 flex-1 font-mono text-[11px] sm:text-xs px-3 py-1.5 rounded-lg border truncate text-left ${
                  isDark
                    ? "bg-[#07080a] border-white/5 text-zinc-300"
                    : "bg-zinc-50 border-zinc-200 text-zinc-700"
                }`}>
                  {user?.id || "N/A"}
                </span>
                <button
                  type="button"
                  onClick={copyAccountId}
                  className={`p-2 rounded-lg border transition-all text-xs font-semibold shrink-0 ${
                    copiedId
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      : isDark
                      ? "border-white/5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                  title="Copy ID"
                >
                  {copiedId ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`w-full max-w-full overflow-hidden rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors ${
          isDark
            ? "border-white/[0.06] bg-[#0F1014]"
            : "border-zinc-200 bg-white shadow-slate-200/50"
        }`}
      >
        <h3 className={`text-base font-bold pb-4 border-b ${isDark ? "text-white border-white/5" : "text-zinc-900 border-zinc-200"}`}>
          Profile Information
        </h3>

        <div className={`divide-y ${isDark ? "divide-white/5" : "divide-zinc-100"}`}>
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Username
              </span>
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                {user?.username}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewUsername(user?.username || "");
                setModalError("");
                setActiveModal("username");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              Edit Username
            </button>
          </div>
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Email Address
              </span>
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                {user?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewEmail(user?.email || "");
                setModalError("");
                setActiveModal("email");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              Update Email
            </button>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Date Registered
              </span>
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`w-full max-w-full overflow-hidden rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors ${
          isDark
            ? "border-white/[0.06] bg-[#0F1014]"
            : "border-zinc-200 bg-white shadow-slate-200/50"
        }`}
      >
        <h3 className={`text-base font-bold pb-4 border-b ${isDark ? "text-white border-white/5" : "text-zinc-900 border-zinc-200"}`}>
          Security & Credentials
        </h3>

        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              Account Password
            </span>
            <span className={`text-sm font-mono tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              ••••••••••••
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalError("");
              setActiveModal("password");
            }}
            style={{ backgroundColor: accentColor }}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 transition-all hover:brightness-110 active:scale-[0.98] self-start sm:self-auto shadow-sm"
          >
            Change Password
          </button>
        </div>
      </div>
      <div
        className={`w-full max-w-full overflow-hidden rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors ${
          isDark
            ? "border-white/[0.06] bg-[#0F1014]"
            : "border-zinc-200 bg-white shadow-slate-200/50"
        }`}
      >
        <h3 className={`text-base font-bold pb-4 border-b ${isDark ? "text-white border-white/5" : "text-zinc-900 border-zinc-200"}`}>
          Session & Logout
        </h3>

        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              Current Session
            </span>
            <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Log out of your active session on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalError("");
              setActiveModal("logout");
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-[0.98] self-start sm:self-auto shadow-sm flex items-center gap-2"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>
      <ModalMenu isOpen={activeModal === "username"} onClose={closeModal} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Change Username
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Enter a new unique handle for your profile (2-16 alphanumeric characters).
          </p>

          <form onSubmit={(e) => handleSettingsSubmit(e, { username: newUsername })}>
            <div className="mb-4">
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                New Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))}
                maxLength={16}
                required
                placeholder="Enter handle"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                  isDark
                    ? "border-white/5 bg-[#07080a] text-white focus:border-cyan-500"
                    : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-cyan-500"
                }`}
              />
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading || !newUsername.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 transition-all flex items-center justify-center hover:brightness-110 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : "Save Handle"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={activeModal === "email"} onClose={closeModal} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Update Email Address
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Your current password is required to verify ownership before changing your email.
          </p>

          <form onSubmit={(e) => handleSettingsSubmit(e, { email: newEmail, currentPassword })}>
            <div className="space-y-4 mb-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                    isDark
                      ? "border-white/5 bg-[#07080a] text-white focus:border-cyan-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-cyan-500"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                    isDark
                      ? "border-white/5 bg-[#07080a] text-white focus:border-cyan-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-cyan-500"
                  }`}
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading || !newEmail.trim() || !currentPassword}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 transition-all flex items-center justify-center hover:brightness-110 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : "Save Email"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={activeModal === "password"} onClose={closeModal} desktopMaxWidth="440px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Change Password
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            After changing your password, you will be logged out and required to sign in again.
          </p>

          <form
            onSubmit={(e) => {
              if (newPassword !== confirmPassword) {
                e.preventDefault();
                setModalError("New passwords do not match.");
                return;
              }
              handleSettingsSubmit(e, { currentPassword, newPassword });
            }}
          >
            <div className="space-y-4 mb-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setModalError("");
                  }}
                  required
                  placeholder="••••••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                    isDark
                      ? "border-white/5 bg-[#07080a] text-white focus:border-cyan-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-cyan-500"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setModalError("");
                  }}
                  required
                  placeholder="••••••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                    isDark
                      ? "border-white/5 bg-[#07080a] text-white focus:border-cyan-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-cyan-500"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setModalError("");
                  }}
                  required
                  placeholder="••••••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                    isDark
                      ? "border-white/5 bg-[#07080a] text-white focus:border-cyan-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-cyan-500"
                  }`}
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading || !currentPassword || !newPassword || !confirmPassword}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 transition-all flex items-center justify-center hover:brightness-110 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={activeModal === "avatar"} onClose={closeModal} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`text-lg font-bold tracking-tight mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
            Update Profile Avatar
          </h2>
          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Upload a custom avatar image (PNG, JPG, WebP) up to 5MB.
          </p>

          <form onSubmit={(e) => avatarBase64 && handleSettingsSubmit(e, { avatar: avatarBase64 })}>
            <div className="flex flex-col items-center justify-center mb-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all ${
                  isDark
                    ? "border-white/10 hover:border-cyan-500 bg-[#07080a]"
                    : "border-zinc-300 hover:border-cyan-500 bg-zinc-50"
                }`}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center p-4 text-center">
                    <svg className="h-8 w-8 mb-2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[11px] font-semibold text-zinc-400">Click to choose image</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            {modalError && (
              <div className="mb-4 p-3 border border-red-500/10 bg-red-500/5 text-red-500 text-xs rounded-lg font-medium flex items-center gap-2">
                <ErrorIcon />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading || !avatarBase64}
                style={{ backgroundColor: accentColor }}
                className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-slate-950 transition-all flex items-center justify-center hover:brightness-110 disabled:opacity-50"
              >
                {modalLoading ? <Loading width={16} height={16} color="#000000" /> : "Upload Picture"}
              </button>
            </div>
          </form>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={activeModal === "logout"} onClose={closeModal} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Sign Out of Account
              </h2>
              <span className="text-xs text-rose-500 font-semibold">Active Session</span>
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Are you sure you want to log out? You will need to re-enter your credentials to access your account dashboard and active deployments.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className={`w-1/2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-1/2 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center justify-center shadow-md active:scale-[0.98]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </ModalMenu>
    </div>
  );
}