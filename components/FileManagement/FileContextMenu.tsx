"use client";

import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import { config } from "@/lib/main";
import {
  PencilSquareIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  KeyIcon,
  DocumentIcon,
  FolderIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

export interface FileItem {
  name: string;
  size: number;
  directory: boolean;
  isArchive: boolean;
  mimeType: string;
  permissions: string;
  rawMode?: string;
  modifiedAt: string;
}

interface FileContextMenuProps {
  x: number;
  y: number;
  file: FileItem;
  accentColor?: string;
  onClose: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onMove?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  onPermissions?: () => void;
  canDownload?: boolean;
  canArchive?: boolean;
  canRename?: boolean;
  canMove?: boolean;
  canCopy?: boolean;
  canEditPermissions?: boolean;
  canDelete?: boolean;
}

export default function FileContextMenu({
  x,
  y,
  file,
  accentColor = "#00f2fe",
  onClose,
  onRename,
  onDelete,
  onArchive,
  onUnarchive,
  onMove,
  onCopy,
  onDownload,
  onPermissions,
  canDownload = true,
  canArchive = true,
  canRename = true,
  canMove = true,
  canCopy = true,
  canEditPermissions = true,
  canDelete = true
}: FileContextMenuProps) {
  const isDark = config.theme === "dark";
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const isMobileRef = useRef(isMobile);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0, isReady: false });
  const dragControls = useDragControls();
  const handleClose = useCallback(() => setIsVisible(false), []);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      if (mobile !== isMobileRef.current) {
        isMobileRef.current = mobile;
        setIsMobile(mobile);
        handleClose();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleClose]);
  const getEstimatedMenuHeight = useCallback(() => {
    let height = 45; // Header and divider
    if (file.isArchive) height += 32; // Unarchive button
    if (!file.directory) {
      height += 32; // Download button
      height += 32; // Duplicate button
      height += 32; // Archive button
    }
    height += 32; // Rename
    height += 32; // Move
    height += 32; // Permissions
    height += 9;  // Separator
    height += 32; // Delete
    height += 12; // Container padding (p-1.5)
    return height;
  }, [file.directory, file.isArchive]);
  useLayoutEffect(() => {
    if (isMobile) return;

    const MENU_WIDTH = menuRef.current ? menuRef.current.offsetWidth : 208;
    const MENU_HEIGHT = menuRef.current ? menuRef.current.offsetHeight : getEstimatedMenuHeight();
    const PADDING = 12;

    let safeX = x;
    let safeY = y;

    if (safeX + MENU_WIDTH + PADDING > window.innerWidth) {
      safeX = window.innerWidth - MENU_WIDTH - PADDING;
    }
    if (safeY + MENU_HEIGHT + PADDING > window.innerHeight) {
      safeY = window.innerHeight - MENU_HEIGHT - PADDING;
    }
    safeX = Math.max(PADDING, safeX);
    safeY = Math.max(PADDING, safeY);

    setMenuPos({ x: safeX, y: safeY, isReady: true });
  }, [x, y, isMobile, getEstimatedMenuHeight]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  const isUnarchiveAllowed = Boolean(canArchive && onUnarchive);
  const isDownloadAllowed = Boolean(canDownload && onDownload);
  const isCopyAllowed = Boolean(canCopy && onCopy);
  const isArchiveAllowed = Boolean(canArchive && onArchive);
  const isRenameAllowed = Boolean(canRename && onRename);
  const isMoveAllowed = Boolean(canMove && onMove);
  const isPermissionsAllowed = Boolean(canEditPermissions && onPermissions);
  const isDeleteAllowed = Boolean(canDelete && onDelete);

  const actionItems = (
    <>
      {file.isArchive && (
        <button
          type="button"
          disabled={!isUnarchiveAllowed}
          onClick={() => {
            if (!isUnarchiveAllowed || !onUnarchive) return;
            onUnarchive();
            handleClose();
          }}
          className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
            !isUnarchiveAllowed
              ? "opacity-35 cursor-not-allowed text-zinc-500"
              : isDark
              ? "text-cyan-400 hover:bg-cyan-500/10 active:bg-cyan-500/20 active:scale-[0.99]"
              : "text-cyan-600 hover:bg-cyan-50 active:bg-cyan-100 active:scale-[0.99]"
          }`}
        >
          <div className="flex items-center gap-3">
            <ArchiveBoxIcon className="w-5 h-5 sm:w-4 sm:h-4" />
            <span>Unarchive</span>
          </div>
        </button>
      )}
      {!file.directory && (
        <button
          type="button"
          disabled={!isDownloadAllowed}
          onClick={() => {
            if (!isDownloadAllowed || !onDownload) return;
            onDownload();
            handleClose();
          }}
          className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
            !isDownloadAllowed
              ? "opacity-35 cursor-not-allowed text-zinc-500"
              : isDark
              ? "hover:bg-white/5 active:bg-white/10 hover:text-white text-zinc-200 active:scale-[0.99]"
              : "hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-900 text-zinc-700 active:scale-[0.99]"
          }`}
        >
          <div className="flex items-center gap-3">
            <ArrowDownTrayIcon className="w-5 h-5 sm:w-4 sm:h-4 opacity-75" />
            <span>Download</span>
          </div>
        </button>
      )}
      {!file.directory && (
        <button
          type="button"
          disabled={!isCopyAllowed}
          onClick={() => {
            if (!isCopyAllowed || !onCopy) return;
            onCopy();
            handleClose();
          }}
          className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
            !isCopyAllowed
              ? "opacity-35 cursor-not-allowed text-zinc-500"
              : isDark
              ? "hover:bg-white/5 active:bg-white/10 hover:text-white text-zinc-200 active:scale-[0.99]"
              : "hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-900 text-zinc-700 active:scale-[0.99]"
          }`}
        >
          <div className="flex items-center gap-3">
            <DocumentDuplicateIcon className="w-5 h-5 sm:w-4 sm:h-4 opacity-75" />
            <span>Duplicate</span>
          </div>
        </button>
      )}
      {!file.directory && (
        <button
          type="button"
          disabled={!isArchiveAllowed}
          onClick={() => {
            if (!isArchiveAllowed || !onArchive) return;
            onArchive();
            handleClose();
          }}
          className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
            !isArchiveAllowed
              ? "opacity-35 cursor-not-allowed text-zinc-500"
              : isDark
              ? "hover:bg-white/5 active:bg-white/10 hover:text-white text-zinc-200 active:scale-[0.99]"
              : "hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-900 text-zinc-700 active:scale-[0.99]"
          }`}
        >
          <div className="flex items-center gap-3">
            <ArchiveBoxIcon className="w-5 h-5 sm:w-4 sm:h-4 opacity-75" />
            <span>Archive</span>
          </div>
        </button>
      )}
      <button
        type="button"
        disabled={!isRenameAllowed}
        onClick={() => {
          if (!isRenameAllowed || !onRename) return;
          onRename();
          handleClose();
        }}
        className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
          !isRenameAllowed
            ? "opacity-35 cursor-not-allowed text-zinc-500"
            : isDark
            ? "hover:bg-white/5 active:bg-white/10 hover:text-white text-zinc-200 active:scale-[0.99]"
            : "hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-900 text-zinc-700 active:scale-[0.99]"
        }`}
      >
        <div className="flex items-center gap-3">
          <PencilSquareIcon className="w-5 h-5 sm:w-4 sm:h-4 opacity-75" />
          <span>Rename</span>
        </div>
      </button>
      <button
        type="button"
        disabled={!isMoveAllowed}
        onClick={() => {
          if (!isMoveAllowed || !onMove) return;
          onMove();
          handleClose();
        }}
        className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
          !isMoveAllowed
            ? "opacity-35 cursor-not-allowed text-zinc-500"
            : isDark
            ? "hover:bg-white/5 active:bg-white/10 hover:text-white text-zinc-200 active:scale-[0.99]"
            : "hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-900 text-zinc-700 active:scale-[0.99]"
        }`}
      >
        <div className="flex items-center gap-3">
          <ArrowRightIcon className="w-5 h-5 sm:w-4 sm:h-4 opacity-75" />
          <span>Move</span>
        </div>
      </button>
      <button
        type="button"
        disabled={!isPermissionsAllowed}
        onClick={() => {
          if (!isPermissionsAllowed || !onPermissions) return;
          onPermissions();
          handleClose();
        }}
        className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
          !isPermissionsAllowed
            ? "opacity-35 cursor-not-allowed text-zinc-500"
            : isDark
            ? "hover:bg-white/5 active:bg-white/10 hover:text-white text-zinc-200 active:scale-[0.99]"
            : "hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-900 text-zinc-700 active:scale-[0.99]"
        }`}
      >
        <div className="flex items-center gap-3">
          <KeyIcon className="w-5 h-5 sm:w-4 sm:h-4 opacity-75" />
          <span>Permissions</span>
        </div>
      </button>

      <div className={`h-[1px] my-1 ${isDark ? "bg-white/[0.08]" : "bg-zinc-200"}`} />
      <button
        type="button"
        disabled={!isDeleteAllowed}
        onClick={() => {
          if (!isDeleteAllowed || !onDelete) return;
          onDelete();
          handleClose();
        }}
        className={`w-full px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-semibold rounded-xl flex items-center justify-between transition-colors ${
          !isDeleteAllowed
            ? "opacity-35 cursor-not-allowed text-zinc-500"
            : isDark
            ? "text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 active:scale-[0.99]"
            : "text-rose-600 hover:bg-rose-50 active:bg-rose-100 active:scale-[0.99]"
        }`}
      >
        <div className="flex items-center gap-3">
          <TrashIcon className="w-5 h-5 sm:w-4 sm:h-4 opacity-90" />
          <span>Delete</span>
        </div>
      </button>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{ pointerEvents: isMobile ? "auto" : "none" }}
      onContextMenu={(e) => {
        e.preventDefault();
        handleClose();
      }}
    >
      <AnimatePresence onExitComplete={() => { if (!isVisible) onClose(); }}>
        {isVisible && isMobile && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 z-0"
            onClick={handleClose}
            style={{ pointerEvents: "auto" }}
          />
        )}
        {isVisible && isMobile && (
          <motion.div
            key="mobile-drawer"
            ref={menuRef}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 250) handleClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className={`relative w-full rounded-t-3xl border-t shadow-2xl flex flex-col z-10 pb-[max(1.75rem,env(safe-area-inset-bottom))] transition-colors ${
              isDark ? "bg-[#111218] border-white/10 text-zinc-200" : "bg-white border-zinc-200 text-zinc-800"
            }`}
            style={{ maxHeight: "85vh", pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`absolute top-full left-0 right-0 h-40 ${
                isDark ? "bg-[#111218]" : "bg-white"
              }`}
            />
            <div
              className="w-full shrink-0 pt-3 pb-2.5 flex justify-center cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className={`w-12 h-1.5 rounded-full ${isDark ? "bg-white/20" : "bg-zinc-300"}`} />
            </div>
            <div
              className={`px-5 pb-3.5 flex items-center gap-3 border-b select-none ${
                isDark ? "border-white/[0.08]" : "border-zinc-200"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  file.directory
                    ? isDark
                      ? "bg-amber-400/15 text-amber-400 border border-amber-400/25"
                      : "bg-amber-100 text-amber-600 border border-amber-200"
                    : isDark
                    ? "bg-white/5 text-zinc-300 border border-white/10"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}
              >
                {file.directory ? <FolderIcon className="w-5 h-5 fill-amber-400/20" /> : <DocumentIcon className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                  {file.name}
                </p>
                <p className="text-[11px] opacity-60 truncate">
                  {file.directory ? "Folder" : file.size ? `${(file.size / 1024).toFixed(1)} KB` : "File"}
                </p>
              </div>
            </div>
            <div className="flex flex-col px-3 pt-2 gap-1 overflow-y-auto max-h-[55vh]">
              {actionItems}
            </div>
          </motion.div>
        )}
        {isVisible && !isMobile && menuPos.isReady && (
          <motion.div
            key="desktop-menu"
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -2 }}
            transition={{
              type: "spring",
              duration: 0.18,
              bounce: 0.1
            }}
            style={{
              left: menuPos.x,
              top: menuPos.y,
              transformOrigin: "top left",
              pointerEvents: "auto"
            }}
            className={`absolute w-52 rounded-2xl p-1.5 z-[9999] shadow-2xl border transition-colors ${
              isDark ? "bg-[#111218] border-white/10 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-left select-none flex items-center gap-2">
              {file.directory ? (
                <FolderIcon className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
              ) : (
                <DocumentIcon className="w-4 h-4 text-zinc-400 shrink-0" />
              )}
              <p className={`text-xs font-semibold truncate ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                {file.name}
              </p>
            </div>
            <div className={`h-[1px] mb-1 ${isDark ? "bg-white/[0.08]" : "bg-zinc-200"}`} />
            {actionItems}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}