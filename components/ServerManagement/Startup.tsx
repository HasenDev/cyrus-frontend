"use client";

import React, { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { config, apiRequest } from "@/lib/main";
import { ServerDetails } from "@/app/home/server/page";
import Loading from "@/components/Base/Loading";
import Selector from "@/components/Base/Selector";
import SaveBar from "@/components/Base/SaveBar";
import {
  CommandLineIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CubeIcon
} from "@heroicons/react/24/outline";

interface StartupProps {
  serverId: string;
  serverData: ServerDetails;
  accentColor?: string;
  onRefreshServer?: () => Promise<void> | void;
  userPermissions?: string[];
  isOwner?: boolean;
}

interface EggVariable {
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  userViewable: boolean;
  userEditable: boolean;
  rules: string;
  value: string;
}

export default function Startup({
  serverId,
  serverData,
  accentColor = "#00f2fe",
  onRefreshServer,
  userPermissions = [],
  isOwner = true
}: StartupProps) {
  const isDark = config.theme === "dark";
  const canManage = isOwner || userPermissions.includes("startup.manage");
  const [loading, setLoading] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [startupCommand, setStartupCommand] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [initialDockerImage, setInitialDockerImage] = useState("");
  const [dockerImages, setDockerImages] = useState<Record<string, string>>({});
  const [variables, setVariables] = useState<EggVariable[]>([]);
  const [initialVariables, setInitialVariables] = useState<EggVariable[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchStartupDetails = useCallback(async () => {
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/startup`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load startup parameters.");

      const fetchedStartup = data.startup || "";
      const fetchedDockerImage = data.dockerImage || "";
      const fetchedDockerImages = data.dockerImages || {};
      const fetchedVariables = data.variables || [];

      setStartupCommand(fetchedStartup);
      setDockerImage(fetchedDockerImage);
      setInitialDockerImage(fetchedDockerImage);
      setDockerImages(fetchedDockerImages);
      setVariables(fetchedVariables);
      setInitialVariables(fetchedVariables);
    } catch (err: any) {
      setSaveError(err.message || "Failed to communicate with startup service.");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchStartupDetails();
  }, [fetchStartupDetails]);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(startupCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const isBooleanVariable = (v: EggVariable) => {
    const rules = v.rules.toLowerCase();
    const def = v.defaultValue.toLowerCase();
    return (
      rules.includes("boolean") ||
      def === "0" ||
      def === "1" ||
      def === "true" ||
      def === "false"
    );
  };

  const isBooleanTrue = (val: string) => {
    const normalized = String(val).toLowerCase().trim();
    return normalized === "1" || normalized === "true";
  };

  const handleToggleBoolean = (envVariable: string, currentValue: string, defaultValue: string) => {
    if (!canManage) return;
    const currentIsTrue = isBooleanTrue(currentValue);
    const def = defaultValue.toLowerCase();
    const nextVal = currentIsTrue
      ? def === "true" || def === "false" ? "false" : "0"
      : def === "true" || def === "false" ? "true" : "1";

    setVariables((prev) =>
      prev.map((item) => (item.envVariable === envVariable ? { ...item, value: nextVal } : item))
    );
  };

  const handleInputChange = (envVariable: string, val: string) => {
    if (!canManage) return;
    setVariables((prev) =>
      prev.map((item) => (item.envVariable === envVariable ? { ...item, value: val } : item))
    );
  };

  const hasImageChanged = dockerImage !== initialDockerImage;
  const hasVariablesChanged =
    variables.length > 0 &&
    initialVariables.length > 0 &&
    variables.some((v) => {
      const orig = initialVariables.find((iv) => iv.envVariable === v.envVariable);
      return orig ? orig.value !== v.value : false;
    });

  const hasUnsavedChanges = canManage && (hasImageChanged || hasVariablesChanged);

  const handleReset = () => {
    setDockerImage(initialDockerImage);
    setVariables(initialVariables);
    setSaveError(null);
  };

  const handleSaveAll = async () => {
    if (!canManage) return;
    setSaveError(null);
    setSaveSuccess(null);

    for (const v of variables) {
      if (!v.userEditable) continue;
      const isRequired = v.rules.toLowerCase().includes("required");
      if (isRequired && (!v.value || v.value.trim() === "")) {
        setSaveError(`"${v.name}" is required and cannot be left empty.`);
        return;
      }
    }

    setIsSaving(true);

    try {
      const token = Cookies.get("token");
      const payload: { dockerImage?: string; environment?: Record<string, string> } = {};

      if (hasImageChanged) {
        payload.dockerImage = dockerImage;
      }

      if (hasVariablesChanged) {
        const envMap: Record<string, string> = {};
        variables.forEach((v) => {
          if (v.userEditable) {
            envMap[v.envVariable] = v.value;
          }
        });
        payload.environment = envMap;
      }

      const res = await apiRequest(`api/v1/client/servers/${serverId}/startup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update startup configuration.");

      setInitialDockerImage(dockerImage);
      setInitialVariables(variables);
      setSaveSuccess("Configuration saved! Restart your server to apply changes.");
      setTimeout(() => setSaveSuccess(null), 4000);
      onRefreshServer?.();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] w-full">
        <Loading width={32} height={32} color={accentColor} />
      </div>
    );
  }

  const dockerOptions = Object.entries(dockerImages).map(([label, img]) => ({
    label: `${label} (${img})`,
    value: img
  }));

  return (
    <div className="space-y-6 select-none w-full max-w-full">
      {(saveSuccess || saveError) && (
        <div className="space-y-3">
          {saveSuccess && (
            <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 stroke-[3]" />
                <span>{saveSuccess}</span>
              </div>
              <button onClick={() => setSaveSuccess(null)} className="hover:opacity-75">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          {saveError && (
            <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
              <button onClick={() => setSaveError(null)} className="hover:opacity-75">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 min-[980px]:grid-cols-2 gap-4 items-start">
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
          } shadow-sm flex flex-col gap-3.5 min-w-0`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col min-[260px]:flex-row items-start min-[260px]:items-center gap-3 min-w-0">
              <div
                style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                className="p-3 rounded-xl shrink-0"
              >
                <CommandLineIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm font-bold break-words [overflow-wrap:anywhere] ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Startup Command
                </h3>
                <p className={`text-[11px] mt-0.5 break-words [overflow-wrap:anywhere] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Command execution string defined by egg template.
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyCommand}
              className={`hidden min-[980px]:inline-flex p-2 rounded-xl border text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
              title="Copy Startup Command"
            >
              {copiedCmd ? (
                <CheckIcon className="w-4 h-4 text-emerald-400 stroke-[3]" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
            </button>
          </div>
          <div
            className={`p-3.5 rounded-xl border text-xs font-mono select-text leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${
              isDark ? "bg-[#111218] border-white/10 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-800"
            }`}
          >
            {startupCommand || "No startup command configured."}
          </div>
          <button
            onClick={handleCopyCommand}
            className={`w-full min-[980px]:hidden p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              isDark
                ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white"
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {copiedCmd ? (
              <CheckIcon className="w-4 h-4 text-emerald-400 stroke-[3]" />
            ) : (
              <ClipboardDocumentIcon className="w-4 h-4" />
            )}
            <span className="hidden min-[240px]:inline">Copy Startup Command</span>
            <span className="inline min-[240px]:hidden">Copy</span>
          </button>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "border-white/[0.06] bg-[#0c0d12]" : "border-zinc-200 bg-white"
          } shadow-sm space-y-3.5 min-w-0 h-fit`}
        >
          <div className="flex flex-col min-[260px]:flex-row items-start min-[260px]:items-center gap-3 min-w-0">
            <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
              <CubeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-sm font-bold break-words [overflow-wrap:anywhere] ${isDark ? "text-white" : "text-zinc-900"}`}>
                Container Image
              </h3>
              <p className={`text-[11px] mt-0.5 break-words [overflow-wrap:anywhere] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Environment Docker runtime container image.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-0.5">
            <Selector
              disabled={!canManage}
              value={dockerImage}
              options={
                dockerOptions.length > 0
                  ? dockerOptions
                  : dockerImage
                  ? [{ label: dockerImage, value: dockerImage }]
                  : []
              }
              onChange={(val) => canManage && setDockerImage(val)}
              placeholder="Select Container Image..."
            />
          </div>
        </div>
      </div>
      <div
        className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? "border-white/[0.08] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? "border-white/[0.06] bg-[#111218]" : "border-zinc-200 bg-zinc-50"
        }`}>
          <div>
            <h2 className={`text-sm font-bold break-words [overflow-wrap:anywhere] ${isDark ? "text-white" : "text-zinc-900"}`}>
              Egg Variables
            </h2>
            <p className={`text-xs break-words [overflow-wrap:anywhere] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Custom runtime arguments and dynamic server configurations.
            </p>
          </div>
        </div>

        {variables.length === 0 ? (
          <div className={`p-12 text-center text-xs ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            No editable variables found for this egg template.
          </div>
        ) : (
          <div className="p-4 sm:p-5 grid grid-cols-1 min-[980px]:grid-cols-2 gap-4">
            {variables.map((v) => {
              const isBool = isBooleanVariable(v);
              const isTrue = isBooleanTrue(v.value);
              const isRequired = v.rules.toLowerCase().includes("required");
              const isFieldEditable = v.userEditable && canManage;

              return (
                <div
                  key={v.envVariable}
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${
                    isDark ? "border-white/[0.06] bg-[#111218]" : "border-zinc-200 bg-zinc-50/60"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-xs font-bold break-words [overflow-wrap:anywhere] ${isDark ? "text-white" : "text-zinc-900"}`}>
                          {v.name}
                        </span>
                        {isRequired && (
                          <span className="text-rose-500 text-xs font-bold" title="Required field">*</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!v.userEditable && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-500/20 bg-amber-500/10 text-amber-400">
                            LOCKED
                          </span>
                        )}
                      </div>
                    </div>

                    <p className={`text-[11px] leading-relaxed break-words [overflow-wrap:anywhere] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      {v.description || "No description provided for this parameter."}
                    </p>
                  </div>
                  <div className="pt-1">
                    {isBool ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className={`text-xs font-semibold ${isTrue ? "text-emerald-400" : "text-zinc-500"}`}>
                          {isTrue ? "Enabled" : "Disabled"}
                        </span>
                        <button
                          type="button"
                          disabled={!isFieldEditable}
                          onClick={() => handleToggleBoolean(v.envVariable, v.value, v.defaultValue)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            !isTrue ? (isDark ? "bg-zinc-800" : "bg-zinc-300") : ""
                          }`}
                          style={{
                            backgroundColor: isTrue ? accentColor : undefined
                          }}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isTrue ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        disabled={!isFieldEditable}
                        value={v.value}
                        onChange={(e) => handleInputChange(v.envVariable, e.target.value)}
                        placeholder={v.defaultValue || "Enter value..."}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors outline-none ${
                          !isFieldEditable
                            ? isDark
                              ? "bg-zinc-900/60 border-white/5 text-zinc-500 cursor-not-allowed"
                              : "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed"
                            : isDark
                            ? "bg-[#090a0f] border-white/10 text-white focus:border-white/20"
                            : "bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400"
                        }`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SaveBar
        isOpen={hasUnsavedChanges}
        onReset={handleReset}
        onSave={handleSaveAll}
        isSaving={isSaving}
        pendingAccentColor={accentColor}
      />
    </div>
  );
}
