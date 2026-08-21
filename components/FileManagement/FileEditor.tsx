"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Cookies from "js-cookie";
import Editor from "@monaco-editor/react";
import { apiRequest, config } from "@/lib/main";
import Loading from "@/components/Base/Loading";
import {
  ArrowLeftIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  Bars3BottomLeftIcon,
  LockClosedIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

interface FileEditorProps {
  serverId: string;
  filePath: string;
  onClose: () => void;
  accentColor?: string;
  canEdit?: boolean;
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() || "" : "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    json: "json",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "scss",
    less: "less",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    md: "markdown",
    markdown: "markdown",
    sql: "sql",
    php: "php",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    lua: "lua",
    xml: "xml",
    svg: "xml",
    env: "shell",
    dockerfile: "dockerfile",
    toml: "ini",
    ini: "ini",
    conf: "ini",
    properties: "ini"
  };
  return map[ext] || "plaintext";
}

export default function FileEditor({
  serverId,
  filePath,
  onClose,
  accentColor = "#00f2fe",
  canEdit = true
}: FileEditorProps) {
  const isDark = config.theme === "dark";

  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedFailed, setSavedFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const editorRef = useRef<any>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchContent = useCallback(async () => {
    if (!filePath) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(
        `api/v1/client/servers/${serverId}/files?action=content&file=${encodeURIComponent(filePath)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Problem loading content");
      }
      setContent(data.content || "");
    } catch (err: any) {
      setError(err?.message || "Seems like we encountered a problem while fetching the file. Please check if the node daemon is online.");
    } finally {
      setLoading(false);
    }
  }, [serverId, filePath]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (failedTimeoutRef.current) clearTimeout(failedTimeoutRef.current);
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!canEdit || saving || loading) return;
    setSaving(true);
    setError(null);
    setSavedSuccess(false);
    setSavedFailed(false);

    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    if (failedTimeoutRef.current) clearTimeout(failedTimeoutRef.current);

    try {
      const currentVal = editorRef.current ? editorRef.current.getValue() : content;
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "write", file: filePath, content: currentVal })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save file.");
      }
      setContent(currentVal);
      setSavedSuccess(true);
      successTimeoutRef.current = setTimeout(() => {
        setSavedSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Seems like we encountered a problem while saving the file. Please check if the daemon is online.");
      setSavedFailed(true);
      failedTimeoutRef.current = setTimeout(() => {
        setSavedFailed(false);
      }, 2000);
    } finally {
      setSaving(false);
    }
  }, [canEdit, saving, loading, content, serverId, filePath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, handleSave]);

  const language = getLanguageFromFilename(filePath);

  const getButtonBgColor = () => {
    if (savedSuccess) return "#10b981";
    if (savedFailed) return "#ef4444";
    return accentColor;
  };

  const getButtonTextColor = () => {
    if (savedSuccess || savedFailed) return "#ffffff";
    return "#000000";
  };

  return (
    <div
      className={`flex flex-col h-[88dvh] sm:h-[82vh] w-full max-w-full rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
        isDark ? "border-white/[0.08] bg-[#0c0d12]" : "border-zinc-200 bg-white"
      }`}
    >
      <div
        className={`p-3 sm:p-4 border-b flex items-center justify-between gap-3 shrink-0 ${
          isDark ? "border-white/[0.08] bg-[#111218]" : "border-zinc-200 bg-zinc-50"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-all shrink-0 active:scale-95 outline-none focus:outline-none ${
              isDark
                ? "border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-white/20"
                : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 shadow-sm"
            }`}
            title="Back to file manager"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-0.5">
            <span
              className={`text-xs font-semibold whitespace-nowrap truncate max-w-[150px] min-[400px]:max-w-[220px] sm:max-w-md ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
              title={filePath}
            >
              {filePath}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setWordWrap((prev) => !prev)}
            title={wordWrap ? "Disable Word Wrap (Enable Horizontal Scroll)" : "Enable Word Wrap"}
            style={
              wordWrap
                ? {
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}35`,
                    color: accentColor
                  }
                : undefined
            }
            className={`px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 outline-none focus:outline-none ${
              wordWrap
                ? "shadow-sm"
                : isDark
                ? "bg-zinc-900/90 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
                : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm"
            }`}
          >
            <Bars3BottomLeftIcon className="w-4 h-4" />
            <span className="hidden min-[480px]:inline text-[11px] font-medium">
              {wordWrap ? "Wrap: On" : "Wrap: Off"}
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-3">
            {canEdit ? (
              <button
                onClick={handleSave}
                disabled={saving || loading}
                style={{
                  backgroundColor: getButtonBgColor(),
                  color: getButtonTextColor()
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-md active:scale-95 outline-none focus:outline-none"
              >
                {saving ? (
                  <Loading width={14} height={14} color={getButtonTextColor()} />
                ) : savedSuccess ? (
                  <CheckIcon className="w-4 h-4 stroke-[3]" />
                ) : savedFailed ? (
                  <XMarkIcon className="w-4 h-4 stroke-[3]" />
                ) : null}
                <span>
                  {saving
                    ? "Saving..."
                    : savedSuccess
                    ? "Saved!"
                    : savedFailed
                    ? "Failed"
                    : "Save File"}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold">
                <LockClosedIcon className="w-3.5 h-3.5" />
                <span>Read-Only</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 p-6 space-y-4 animate-pulse">
          <div className={`h-4 w-3/4 rounded ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
          <div className={`h-4 w-1/2 rounded ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
          <div className={`h-4 w-2/3 rounded ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
          <div className={`h-4 w-4/5 rounded ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
          <div className={`h-4 w-1/3 rounded ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
        </div>
      ) : error && !content ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <div
            className={`p-4 rounded-xl border text-xs max-w-md flex items-center gap-2 ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchContent}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              isDark
                ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm"
            }`}
          >
            <ArrowPathIcon className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : (
        <div className="flex-1 w-full min-w-0 h-full relative overflow-hidden touch-pan-x touch-pan-y">
          <Editor
            height="100%"
            width="100%"
            language={language}
            theme={isDark ? "vs-dark" : "vs"}
            value={content}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={{
              readOnly: !canEdit,
              fontSize: 13,
              fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              scrollBeyondLastColumn: 5,
              wordWrap: wordWrap ? "on" : "off",
              wrappingStrategy: "advanced",
              automaticLayout: true,
              tabSize: 2,
              smoothScrolling: true,
              mouseWheelScrollSensitivity: 1,
              touchSupport: "on",
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
                useShadows: false,
                alwaysConsumeMouseWheel: false
              },
              padding: { top: 12, bottom: 12 }
            }}
            loading={<Loading width={32} height={32} color={accentColor} />}
          />
        </div>
      )}
      <div
        className={`px-4 py-3 sm:py-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t flex flex-col sm:flex-row items-center justify-between shrink-0 gap-2 ${
          isDark ? "border-white/[0.06] bg-[#0d0e14]" : "border-zinc-200 bg-zinc-50"
        }`}
      >
        <div className="w-full sm:hidden flex flex-col gap-2">
          {canEdit ? (
            <button
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                backgroundColor: getButtonBgColor(),
                color: getButtonTextColor()
              }}
              className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all outline-none focus:outline-none"
            >
              {saving ? (
                <Loading width={14} height={14} color={getButtonTextColor()} />
              ) : savedSuccess ? (
                <CheckIcon className="w-4 h-4 stroke-[3]" />
              ) : savedFailed ? (
                <XMarkIcon className="w-4 h-4 stroke-[3]" />
              ) : null}
              <span>
                {saving
                  ? "Saving..."
                  : savedSuccess
                  ? "Saved!"
                  : savedFailed
                  ? "Failed"
                  : "Save File"}
              </span>
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center gap-1.5">
              <LockClosedIcon className="w-3.5 h-3.5" />
              <span>Read-Only</span>
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center justify-between w-full text-[11px]">
          <div className="flex items-center gap-3">
            <span className={isDark ? "text-zinc-500" : "text-zinc-400"}>
              {canEdit ? "Ready" : "Read-Only"}
            </span>
            <span className={isDark ? "text-zinc-600" : "text-zinc-300"}>•</span>
            <span className={isDark ? "text-zinc-500" : "text-zinc-400"}>Language: {language}</span>
          </div>
          <span className={`font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {canEdit ? (
              <>Press <kbd className="font-sans px-1.5 py-0.5 rounded border border-current text-[10px]">Ctrl + S</kbd> to Save</>
            ) : (
              "Editing disabled by permissions"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}