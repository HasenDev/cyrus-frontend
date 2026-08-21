"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha";
import Cookies from "js-cookie";
import {
  ExclamationCircleIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import { config, apiRequest } from "@/lib/main";
import { useMainInfoStore } from "@/components/Layout/ClientProviders";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams?.get("inviteCode");
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { mainInfoStore } = useMainInfoStore();
  const accentColor = mainInfoStore?.accentColor || config.accentColor;
  const isDark = config.theme === "dark";
  const [isSwitching, setIsSwitching] = useState(false);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        if (step === 1 && emailRef.current) emailRef.current.focus();
        if (step === 2 && usernameRef.current) usernameRef.current.focus();
        if (step === 3 && passwordRef.current) passwordRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [step]);

  const handleNavigation = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const targetUrl = inviteCode ? `/?inviteCode=${encodeURIComponent(inviteCode)}` : "/";
    router.push(targetUrl);
  };

  const handleBack = () => {
    if (isLoading) return;

    if (step > 1) {
      setDirection(-1);
      setStep((prev) => prev - 1);
      setHasError(false);
      setErrorMsg("");
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9 ]/g, "");
    setUsername(val);
    setHasError(false);
  };

  const handleNextStep = () => {
    setErrorMsg("");
    setHasError(false);

    if (step === 1) {
      if (!email.trim()) {
        setHasError(true);
        setErrorMsg("Email address is required.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setHasError(true);
        setErrorMsg("Please enter a valid email address.");
        return;
      }
      setDirection(1);
      setStep(2);
    } else if (step === 2) {
      if (!username.trim()) {
        setHasError(true);
        setErrorMsg("Username is required.");
        return;
      }
      if (username.length < 2) {
        setHasError(true);
        setErrorMsg("Username must be at least 2 characters.");
        return;
      }
      setDirection(1);
      setStep(3);
    }
  };

  const handlePreSubmit = async () => {
    setHasError(false);
    setErrorMsg("");

    if (password.length < 6) {
      setHasError(true);
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setHasError(true);
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiRequest("api/v1/auth/register", { method: "GET" });
      const data = await res.json();

      if (data.recaptchaRequired && (data.siteKey || mainInfoStore?.recaptchaPublicKey)) {
        setSiteKey(data.siteKey || mainInfoStore?.recaptchaPublicKey || "");
        setIsLoading(false);
        setShowCaptchaModal(true);
      } else {
        await executeRegistration(null);
      }
    } catch {
      await executeRegistration(null);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1 || step === 2) {
      handleNextStep();
    } else if (step === 3) {
      handlePreSubmit();
    }
  };

  const onCaptchaChange = (token: string | null) => {
    if (token) {
      executeRegistration(token);
    }
  };

  const executeRedirect = (targetUrl: string) => {
    const isNativePlatform =
      typeof window !== "undefined" &&
      (!!(window as any).Capacitor ||
        !!(window as any).Capacitor?.isNative ||
        window.location.protocol === "file:" ||
        navigator.userAgent.toLowerCase().includes("capacitor") ||
        navigator.userAgent.toLowerCase().includes("cordova"));

    if (isNativePlatform) {
      router.replace(targetUrl);
      router.refresh();
    } else {
      window.location.replace(targetUrl);
    }
  };

  const executeRegistration = async (token: string | null) => {
    setIsLoading(true);
    setShowCaptchaModal(false);

    try {
      const response = await apiRequest("api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          username,
          password,
          captchaToken: token,
          inviteCode,
          acceptTosAndPrivacy: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setHasError(true);
        setErrorMsg(data.error || "Failed to create account.");
        setIsLoading(false);
        return;
      }

      const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
      Cookies.set("token", data.token, { expires: 7, secure: isSecure, sameSite: "strict" });

      const targetUrl = inviteCode
        ? `/home?inviteCode=${encodeURIComponent(inviteCode)}`
        : "/home";

      executeRedirect(targetUrl);
    } catch (err) {
      setHasError(true);
      setErrorMsg("Unable to connect to Cyrus servers. Please check your connection.");
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 15 : -15,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 15 : -15,
      opacity: 0,
    }),
  };

  return (
    <div
      className={`relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? "bg-[#050608] text-zinc-50" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div
          className={`absolute inset-0 ${isDark ? "opacity-[0.07]" : "opacity-[0.04]"}`}
          style={{
            backgroundImage: `
              linear-gradient(to right, ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} 1px, transparent 1px),
              linear-gradient(to bottom, ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
          }}
        />

        <div
          className={`absolute inset-0 ${isDark ? "opacity-30" : "opacity-15"}`}
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.05)"} 1px, transparent 0)`,
            backgroundSize: "14px 14px",
          }}
        />

        <div
          className="absolute top-[10%] right-[5%] w-[650px] h-[650px] rounded-full filter blur-[150px] opacity-[0.08]"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          }}
        />

        <div
          className="absolute bottom-[10%] left-[5%] w-[600px] h-[600px] rounded-full filter blur-[130px] opacity-[0.05]"
          style={{
            background: `radial-gradient(circle, #4facfe 0%, transparent 70%)`,
          }}
        />
      </div>
      <ModalMenu isOpen={showCaptchaModal} onClose={() => setShowCaptchaModal(false)} desktopMaxWidth="420px">
        <div className={`p-6 sm:p-8 text-left font-sans ${isDark ? "bg-[#0F1014] text-zinc-100" : "bg-white text-zinc-900"}`}>
          <h2 className={`mb-2 text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            Security Check
          </h2>
          <p className={`mb-6 text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Complete the human verification layer to submit your configuration request.
          </p>

          <div className="flex w-full justify-center">
            {(siteKey || mainInfoStore?.recaptchaPublicKey) && (
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={siteKey || mainInfoStore?.recaptchaPublicKey || ""}
                theme={isDark ? "dark" : "light"}
                onChange={onCaptchaChange}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCaptchaModal(false)}
            className={`mt-6 w-full text-xs font-semibold transition-colors ${
              isDark ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-700"
            }`}
          >
            Cancel
          </button>
        </div>
      </ModalMenu>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={
          isSwitching
            ? { opacity: 0, y: -10, scale: 0.99 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        style={{ borderTopColor: accentColor }}
        className={`relative z-20 flex w-full flex-col justify-center px-6 pb-10 pt-10 min-h-[100dvh] sm:min-h-fit sm:max-w-[420px] border-t-[3px] sm:border sm:border-t-[3px] sm:rounded-2xl shadow-xl transition-all ${
          isDark
            ? "bg-[#0F1014] sm:border-white/[0.06] shadow-black/50"
            : "bg-white sm:border-zinc-200/80 shadow-slate-200/50"
        } ${isSwitching ? "pointer-events-none" : ""}`}
      >
        <div className="mb-6 flex flex-col gap-4">
          <AnimatePresence>
            {step > 1 && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className={`self-start text-xs font-semibold select-none outline-none group flex items-center gap-1 transition-colors duration-150 disabled:opacity-40 ${
                  isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <ChevronLeftIcon className="h-3.5 w-3.5 transform group-hover:-translate-x-0.5 transition-transform duration-150" />
                <span>Back</span>
              </motion.button>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor:
                    step >= i
                      ? accentColor
                      : isDark
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(0, 0, 0, 0.08)",
                }}
              />
            ))}
          </div>

          <div>
            <h1
              className="mb-2 text-2xl font-black tracking-tight font-sans"
              style={{ color: accentColor }}
            >
              {step === 1 && "Create your account"}
              {step === 2 && "Choose your username"}
              {step === 3 && "Secure your account"}
            </h1>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {step === 1 && "Enter your email address to get started."}
              {step === 2 && "Choose how you will be recognized."}
              {step === 3 && "Generate an encryption key profile."}
            </p>
          </div>
        </div>

        <form className="flex flex-col w-full" onSubmit={handleSubmit}>
          <div className={`relative overflow-hidden transition-all duration-200 ${step === 1 || step === 2 ? "min-h-[76px]" : "min-h-[168px]"}`}>
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="w-full space-y-4"
                >
                  <div>
                    <label className={`mb-1.5 block text-xs font-semibold tracking-wide ${hasError ? "text-red-500" : isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Email Address
                    </label>
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setHasError(false);
                      }}
                      placeholder="name@example.com"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 ${
                        hasError
                          ? "border-red-500 focus:ring-1 focus:ring-red-500/10"
                          : isDark
                          ? "border-white/5 bg-[#07080a] text-white placeholder:text-zinc-650 focus:border-cyan-500"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white"
                      }`}
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="w-full space-y-4"
                >
                  <div>
                    <label className={`mb-1.5 block text-xs font-semibold tracking-wide ${hasError && (!username.trim() || errorMsg.includes("required")) ? "text-red-500" : isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Username
                    </label>
                    <input
                      ref={usernameRef}
                      type="text"
                      value={username}
                      maxLength={16}
                      onChange={handleUsernameChange}
                      placeholder="Your unique handle"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 ${
                        hasError && (!username.trim() || errorMsg.includes("required"))
                          ? "border-red-500 focus:ring-1 focus:ring-red-500/10"
                          : isDark
                          ? "border-white/5 bg-[#07080a] text-white placeholder:text-zinc-650 focus:border-cyan-500"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white"
                      }`}
                    />
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="w-full space-y-4"
                >
                  <div>
                    <label className={`mb-1.5 block text-xs font-semibold tracking-wide ${hasError ? "text-red-500" : isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Password
                    </label>
                    <input
                      ref={passwordRef}
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setHasError(false);
                      }}
                      placeholder="••••••••••••"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 ${
                        hasError
                          ? "border-red-500 focus:ring-1 focus:ring-red-500/10"
                          : isDark
                          ? "border-white/5 bg-[#07080a] text-white placeholder:text-zinc-650 focus:border-cyan-500"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`mb-1.5 block text-xs font-semibold tracking-wide ${hasError ? "text-red-500" : isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setHasError(false);
                      }}
                      placeholder="••••••••••••"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 ${
                        hasError
                          ? "border-red-500 focus:ring-1 focus:ring-red-500/10"
                          : isDark
                          ? "border-white/5 bg-[#07080a] text-white placeholder:text-zinc-650 focus:border-cyan-500"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white"
                      }`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {hasError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-red-500"
            >
              <ExclamationCircleIcon className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          <div className="w-full pt-3">
            <button
              type="submit"
              disabled={isLoading || isSwitching}
              style={{ backgroundColor: accentColor }}
              className="flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold text-slate-950 shadow-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loading width={14} height={14} color="#000000" />
                  <span>Creating account...</span>
                </div>
              ) : step === 3 ? (
                "Create Account"
              ) : (
                "Continue"
              )}
            </button>

            <div className="relative flex py-5 items-center">
              <div className={`flex-grow border-t ${isDark ? "border-white/[0.06]" : "border-zinc-200"}`} />
              <span className={`flex-shrink mx-4 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                OR
              </span>
              <div className={`flex-grow border-t ${isDark ? "border-white/[0.06]" : "border-zinc-200"}`} />
            </div>

            <div className={`text-center text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              <a
                href={inviteCode ? `/?inviteCode=${encodeURIComponent(inviteCode)}` : "/"}
                onClick={handleNavigation}
                style={{ color: accentColor }}
                className="font-bold hover:underline transition-all"
              >
                Already a member? Sign in
              </a>
            </div>

            <div className={`mt-5 text-center text-[10px] leading-relaxed ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              By continuing, you acknowledge our{" "}
              <a
                href="/terms"
                style={{ color: accentColor }}
                className="font-bold hover:underline"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                style={{ color: accentColor }}
                className="font-bold hover:underline"
              >
                Privacy Policy
              </a>
              .
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div
          className={`flex min-h-[100dvh] w-full ${
            config.theme === "dark" ? "bg-[#050608]" : "bg-slate-50"
          }`}
        />
      }
    >
      <RegisterContent />
    </Suspense>
  );
}