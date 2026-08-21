"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { createPortal } from "react-dom";
import { config } from "@/lib/main";

interface ModalMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  desktopMaxWidth?: string;
}

export default function ModalMenu({
  isOpen,
  onClose,
  children,
  desktopMaxWidth = "400px",
}: ModalMenuProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dragControls = useDragControls();
  const isDark = config.theme === "dark";

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!mounted) return null;

  const mobileMenu = (
    <div className="fixed inset-0 z-[100000] flex flex-col justify-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 z-0 pointer-events-auto"
            onClick={onClose}
          />
        )}
        {isOpen && (
          <motion.div
            key="modal-mobile-menu"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 60 || info.velocity.y > 300) {
                onClose();
              }
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className={`relative w-full mx-auto rounded-t-3xl shadow-2xl flex flex-col z-10 pb-safe pointer-events-auto ${
              isDark ? "bg-[#0F1014] border-t border-white/5" : "bg-white border-t border-zinc-200"
            }`}
            style={{ maxHeight: "85vh", willChange: "transform" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`absolute top-[98%] left-0 right-0 h-[100vh] z-0 ${isDark ? "bg-[#0F1014]" : "bg-white"}`} />
            <div
              className="w-full shrink-0 pt-3 pb-2 flex justify-center z-20 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
            >
              <div className={`w-12 h-1.5 rounded-full ${isDark ? "bg-white/20" : "bg-zinc-300"}`} />
            </div>
            <div className="flex-1 overflow-y-auto relative w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const desktopMenu = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none p-6 md:p-8">
          <motion.div
            key="modal-desktop-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 z-0 pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            key="modal-desktop-content"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`relative w-full max-h-[85vh] flex flex-col overflow-hidden rounded-[20px] border shadow-2xl z-10 pointer-events-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
              isDark
                ? "border-white/[0.06] bg-[#0F1014] shadow-black/50"
                : "border-zinc-200 bg-white shadow-slate-200/50"
            }`}
            style={{ maxWidth: desktopMaxWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;

  return createPortal(isMobile ? mobileMenu : desktopMenu, document.body);
}