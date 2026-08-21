"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { config } from "@/lib/main";

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
  roleColor?: string | null;
}

interface SelectorProps {
  value: string | number | null;
  options: Option[];
  onChange: (value: any) => void;
  placeholder?: string;
}

export default function Selector({
  value,
  options,
  onChange,
  placeholder = "Select...",
}: SelectorProps) {
  const isLightMode = config.theme === "white";
  const accentColor = config.accentColor || "#6366f1";

  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMobile) return;
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        portalRef.current &&
        !portalRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile]);
  const updatePosition = () => {
    if (!dropdownRef.current || isMobile) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 220;

    setOpenUpwards(openUp);

    if (openUp) {
      setDropdownStyle({
        position: "fixed",
        bottom: `${window.innerHeight - rect.top + 6}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 110000,
      });
    } else {
      setDropdownStyle({
        position: "fixed",
        top: `${rect.bottom + 6}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 110000,
      });
    }
  };

  useEffect(() => {
    if (isOpen && !isMobile) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, isMobile]);

  const selectedOption = options?.find((o) => o.value === value);

  const renderOptions = () => {
    if (!options || options.length === 0) {
      return (
        <div
          className={`px-4 py-6 text-center text-[14px] font-medium ${
            isLightMode ? "text-gray-500" : "text-zinc-500"
          }`}
        >
          No options available
        </div>
      );
    }

    return options.map((opt) => {
      const isSelected = value === opt.value;

      return (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
          onClick={() => {
            if (opt.disabled) return;
            onChange(opt.value);
            setIsOpen(false);
          }}
          style={isSelected && !opt.disabled ? { color: accentColor } : {}}
          className={`flex w-full items-center justify-between px-4 py-4 sm:py-2.5 text-[15px] sm:text-[13px] font-medium transition-all ${
            opt.disabled
              ? "opacity-40 cursor-not-allowed"
              : isSelected
              ? isLightMode
                ? "bg-gray-50/80"
                : "bg-white/5"
              : isLightMode
              ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              : "text-zinc-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <div className="flex items-center min-w-0 flex-1 pr-4">
            {opt.roleColor && (
              <div
                className="w-3 h-3 rounded-full mr-3 shrink-0 shadow-sm"
                style={{ backgroundColor: opt.roleColor }}
              />
            )}
            <span className="truncate">{opt.label}</span>
          </div>

          {isSelected && (
            <CheckIcon
              className="h-5 w-5 sm:h-4 sm:w-4 shrink-0"
              style={{ color: accentColor }}
            />
          )}
        </button>
      );
    });
  };
  const mobileMenu = (
    <div className="fixed inset-0 z-[110000] flex flex-col justify-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="selector-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 z-0 pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />
        )}
        {isOpen && (
          <motion.div
            key="selector-mobile-menu"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 60 || info.velocity.y > 300) {
                setIsOpen(false);
              }
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className={`relative w-full mx-auto rounded-t-3xl shadow-2xl flex flex-col z-10 pb-safe pointer-events-auto ${
              isLightMode
                ? "bg-[#FFFFFF] border-t border-black/5"
                : "bg-[#0F1014] border-t border-white/5"
            }`}
            style={{ maxHeight: "75vh", willChange: "transform" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`absolute top-[98%] left-0 right-0 h-[100vh] z-0 ${
                isLightMode ? "bg-[#FFFFFF]" : "bg-[#0F1014]"
              }`}
            />
            <div
              className="w-full shrink-0 pt-3 pb-2 flex justify-center z-20 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
            >
              <div
                className="w-12 h-1.5 rounded-full opacity-20"
                style={{ backgroundColor: isLightMode ? "#000" : "#FFF" }}
              />
            </div>

            <div className="px-4 pb-2 pt-1 shrink-0">
              <p
                className={`text-[13px] font-semibold uppercase tracking-wider ${
                  isLightMode ? "text-gray-400" : "text-zinc-500"
                }`}
              >
                {placeholder}
              </p>
            </div>

            <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden pb-6 flex flex-col z-10 relative">
              {renderOptions()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  const desktopMenu = !isMobile && (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={portalRef}
          initial={{ opacity: 0, y: openUpwards ? 4 : -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: openUpwards ? 4 : -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={dropdownStyle}
          className={`custom-scrollbar max-h-[220px] overflow-y-auto rounded-xl border py-1 shadow-2xl ${
            isLightMode ? "bg-white border-gray-200" : "bg-[#0A0B0E] border-white/10"
          }`}
        >
          {renderOptions()}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={isOpen && !isMobile ? { borderColor: accentColor } : {}}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-[14px] font-medium outline-none transition-colors ${
          isLightMode
            ? "bg-white text-gray-700 " +
              (isOpen && !isMobile ? "" : "border-gray-200 hover:border-gray-300")
            : "bg-[#0A0B0E] text-zinc-200 " +
              (isOpen && !isMobile ? "" : "border-white/5 hover:border-white/10")
        }`}
      >
        <span className="flex items-center min-w-0 flex-1 pr-4">
          {selectedOption?.roleColor && (
            <div
              className="w-3 h-3 rounded-full mr-2.5 shrink-0 shadow-sm"
              style={{ backgroundColor: selectedOption.roleColor }}
            />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDownIcon
          style={isOpen && !isMobile ? { color: accentColor } : {}}
          className={`h-4 w-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : isLightMode ? "text-gray-400" : "text-zinc-500"
          }`}
        />
      </button>
      {!isMobile &&
        typeof document !== "undefined" &&
        createPortal(desktopMenu, document.body)}
      {isMobile &&
        typeof document !== "undefined" &&
        createPortal(mobileMenu, document.body)}
    </div>
  );
}