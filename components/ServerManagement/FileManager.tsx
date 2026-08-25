"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import { apiRequest, config } from "@/lib/main";
import FileEditor from "@/components/FileManagement/FileEditor";
import FileContextMenu, { FileItem } from "@/components/FileManagement/FileContextMenu";
import FileModals from "@/components/FileManagement/FileModals";
import {
  FolderIcon,
  DocumentIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArchiveBoxIcon,
  FolderPlusIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import {
  SiJavascript,
  SiTypescript,
  SiPython,
  SiReact,
  SiHtml5,
  SiCss,
  SiSass,
  SiJson,
  SiYaml,
  SiMarkdown,
  SiDocker,
  SiGnubash,
  SiPhp,
  SiRust,
  SiGo,
  SiCplusplus,
  SiPostgresql
} from "react-icons/si";
import {
  TbFileTypePdf,
  TbPhoto,
  TbMusic,
  TbVideo,
  TbKey,
  TbSettings
} from "react-icons/tb";

interface FileManagerProps {
  serverId: string;
  nodeOnline: boolean;
  accentColor?: string;
  userPermissions?: string[];
  isOwner?: boolean;
}

const MONACO_SUPPORTED_EXTENSIONS = new Set([
  "", "txt", "js", "jsx", "ts", "tsx", "json", "html", "htm", "css", "scss", "sass", "less",
  "py", "pyw", "java", "c", "cpp", "h", "hpp", "cs", "php", "sh", "bash", "zsh", "bat", "cmd",
  "ps1", "rb", "rs", "go", "lua", "sql", "yml", "yaml", "xml", "svg", "md", "markdown", "ini",
  "conf", "config", "env", "dockerfile", "properties", "toml", "lock", "gitignore", "log"
]);

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KiB", "MiB", "GiB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getParentDirectory(path: string): string {
  if (!path || path === "/") return "/";
  const clean = path.endsWith("/") ? path.slice(0, -1) : path;
  const lastSlash = clean.lastIndexOf("/");
  if (lastSlash <= 0) return "/";
  return clean.substring(0, lastSlash);
}

function CustomCheckbox({
  checked,
  onChange,
  accentColor = "#00f2fe",
  isDark = true
}: {
  checked: boolean;
  onChange: () => void;
  accentColor?: string;
  isDark?: boolean;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{
        borderColor: checked ? accentColor : isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
        backgroundColor: checked ? accentColor : isDark ? "transparent" : "#ffffff"
      }}
      className="w-4 h-4 rounded-[4px] border flex items-center justify-center cursor-pointer transition-all shrink-0 select-none shadow-sm focus:outline-none"
    >
      {checked && <CheckIcon className="w-3 h-3 text-black stroke-[3]" />}
    </div>
  );
}

function FileTypeIcon({ name, isDirectory, isArchive }: { name: string; isDirectory: boolean; isArchive: boolean }) {
  if (isDirectory) {
    return <FolderIcon className="w-5 h-5 text-amber-500 shrink-0 select-none" />;
  }

  if (isArchive) {
    return <ArchiveBoxIcon className="w-5 h-5 text-cyan-400 shrink-0 select-none" />;
  }

  const lowerName = name.toLowerCase();
  const ext = lowerName.includes(".") ? lowerName.split(".").pop() || "" : "";

  const renderBadge = (icon: React.ReactNode, color: string) => (
    <div
      style={{ color: color }}
      className="w-5.5 h-5.5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0 select-none"
    >
      {icon}
    </div>
  );

  if (lowerName === "dockerfile" || ext === "dockerfile") {
    return renderBadge(<SiDocker className="w-3.5 h-3.5" />, "#2496ed");
  }
  if (lowerName.startsWith(".env")) {
    return renderBadge(<TbKey className="w-3.5 h-3.5" />, "#10b981");
  }
  if (lowerName.startsWith(".git") || lowerName.includes("config") || ext === "ini" || ext === "conf") {
    return renderBadge(<TbSettings className="w-3.5 h-3.5" />, "#71717a");
  }

  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
      return renderBadge(<SiJavascript className="w-3.5 h-3.5 rounded-[1px]" />, "#f7df1e");
    case "ts":
    case "mts":
    case "cts":
      return renderBadge(<SiTypescript className="w-3.5 h-3.5 rounded-[1px]" />, "#3178c6");
    case "jsx":
    case "tsx":
      return renderBadge(<SiReact className="w-3.5 h-3.5" />, "#00d8ff");

    case "py":
    case "pyw":
      return renderBadge(<SiPython className="w-3.5 h-3.5" />, "#3776ab");

    case "html":
    case "htm":
      return renderBadge(<SiHtml5 className="w-3.5 h-3.5" />, "#e34f26");
    case "css":
      return renderBadge(<SiCss className="w-3.5 h-3.5" />, "#1572b6");
    case "scss":
    case "sass":
    case "less":
      return renderBadge(<SiSass className="w-3.5 h-3.5" />, "#cc6699");

    case "json":
    case "lock":
      return renderBadge(<SiJson className="w-3.5 h-3.5" />, "#eab308");
    case "yaml":
    case "yml":
      return renderBadge(<SiYaml className="w-3.5 h-3.5" />, "#cb171e");
    case "sql":
      return renderBadge(<SiPostgresql className="w-3.5 h-3.5" />, "#336791");
    case "md":
    case "markdown":
      return renderBadge(<SiMarkdown className="w-3.5 h-3.5" />, "#38bdf8");

    case "sh":
    case "bash":
    case "zsh":
      return renderBadge(<SiGnubash className="w-3.5 h-3.5" />, "#22c55e");

    case "rs":
      return renderBadge(<SiRust className="w-3.5 h-3.5" />, "#dea584");
    case "go":
      return renderBadge(<SiGo className="w-3.5 h-3.5" />, "#00add8");
    case "php":
      return renderBadge(<SiPhp className="w-3.5 h-3.5" />, "#777bb4");
    case "c":
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return renderBadge(<SiCplusplus className="w-3.5 h-3.5" />, "#00599c");

    case "pdf":
      return renderBadge(<TbFileTypePdf className="w-3.5 h-3.5" />, "#ef4444");
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
    case "ico":
      return renderBadge(<TbPhoto className="w-3.5 h-3.5" />, "#a855f7");
    case "mp3":
    case "wav":
    case "ogg":
      return renderBadge(<TbMusic className="w-3.5 h-3.5" />, "#ec4899");
    case "mp4":
    case "mkv":
    case "avi":
    case "mov":
      return renderBadge(<TbVideo className="w-3.5 h-3.5" />, "#f43f5e");

    default:
      return <DocumentIcon className="w-5 h-5 text-zinc-400 shrink-0 select-none" />;
  }
}

export default function FileManager({
  serverId,
  nodeOnline,
  accentColor = "#00f2fe",
  userPermissions = [],
  isOwner = true
}: FileManagerProps) {
  const isDark = config.theme === "dark";
  const canCreate = isOwner || userPermissions.includes("files.create");
  const canUpload = isOwner || userPermissions.includes("files.upload");
  const canDownload = isOwner || userPermissions.includes("files.download");
  const canArchive = isOwner || userPermissions.includes("files.archiving");
  const canReadContent = isOwner || userPermissions.includes("files.content") || userPermissions.includes("files.editfile");
  const canEditFile = isOwner || userPermissions.includes("files.editfile");
  const canMove = isOwner || userPermissions.includes("files.move");
  const canDelete = isOwner || userPermissions.includes("files.move");
  const canRename = isOwner || userPermissions.includes("files.editfile") || userPermissions.includes("files.move");
  const canCopy = isOwner || userPermissions.includes("files.create") || userPermissions.includes("files.move");
  const canEditPermissions = isOwner || userPermissions.includes("files.editfile");
  const [currentDir, setCurrentDir] = useState<string>("/");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [daemonError, setDaemonError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeEditorFile, setActiveEditorFile] = useState<string | null>(null);
  const dirCacheRef = useRef<Map<string, FileItem[]>>(new Map());
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string>("");
  const [renameValue, setRenameValue] = useState<string>("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [moveBrowserDir, setMoveBrowserDir] = useState<string>("/");
  const [moveFolderList, setMoveFolderList] = useState<FileItem[]>([]);
  const [moveLoadingFolders, setMoveLoadingFolders] = useState(false);
  const [chmodOpen, setChmodOpen] = useState(false);
  const [chmodTarget, setChmodTarget] = useState<string>("");
  const [chmodValue, setChmodValue] = useState<string>("755");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateUrlParams = useCallback((dir: string, editPath: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);

    if (dir && dir !== "/") {
      url.searchParams.set("directory", dir);
    } else {
      url.searchParams.delete("directory");
    }

    if (editPath && editPath.trim() !== "") {
      url.searchParams.set("edit", editPath);
    } else {
      url.searchParams.delete("edit");
    }

    window.history.replaceState({}, "", url.toString());
  }, []);

  const fetchFiles = useCallback(async (dir: string, bypassCache = false) => {
    setDaemonError(null);
    setSelectedFiles([]);
    setCurrentDir(dir);
    if (!bypassCache && dirCacheRef.current.has(dir)) {
      setFiles(dirCacheRef.current.get(dir)!);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files?directory=${encodeURIComponent(dir)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) {
        throw new Error(data.error || "The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }

      const fileList = data.files || [];
      const resolvedDir = data.currentDirectory || dir;

      dirCacheRef.current.set(resolvedDir, fileList);
      setFiles(fileList);
      setCurrentDir(resolvedDir);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (resolvedDir && resolvedDir !== "/") {
          url.searchParams.set("directory", resolvedDir);
        } else {
          url.searchParams.delete("directory");
        }
        window.history.replaceState({}, "", url.toString());
      }
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.name === "TypeError" || !err?.message) {
        setDaemonError("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      } else {
        setDaemonError(err?.message || "The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const urlDir = url.searchParams.get("directory") || "/";
      const urlEdit = url.searchParams.get("edit");
      setActiveEditorFile(urlEdit);
      setCurrentDir(urlDir);
      fetchFiles(urlDir);
    };

    const url = new URL(window.location.href);
    const initialEdit = url.searchParams.get("edit");
    let initialDir = url.searchParams.get("directory") || "/";

    if (initialEdit) {
      setActiveEditorFile(initialEdit);
      if (!url.searchParams.get("directory")) {
        initialDir = getParentDirectory(initialEdit);
      }
    }

    setCurrentDir(initialDir);
    fetchFiles(initialDir);

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [serverId, fetchFiles]);

  const handleCloseEditor = () => {
    const targetDir = activeEditorFile ? getParentDirectory(activeEditorFile) : currentDir;
    setActiveEditorFile(null);
    setCurrentDir(targetDir);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      if (targetDir && targetDir !== "/") {
        url.searchParams.set("directory", targetDir);
      } else {
        url.searchParams.delete("directory");
      }
      window.history.replaceState({}, "", url.toString());
    }

    fetchFiles(targetDir, true);
  };

  const fetchMoveFolders = useCallback(async (dir: string) => {
    setMoveLoadingFolders(true);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files?directory=${encodeURIComponent(dir)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        return;
      }
      if (res.ok && data.files) {
        setMoveFolderList(data.files.filter((f: FileItem) => f.directory));
        setMoveBrowserDir(data.currentDirectory || dir);
      }
    } catch {
    } finally {
      setMoveLoadingFolders(false);
    }
  }, [serverId]);

  const openMoveModal = (targetFileName: string) => {
    if (!canMove) return;
    setMoveTarget(targetFileName);
    setMoveBrowserDir(currentDir);
    setModalError(null);
    setMoveOpen(true);
    fetchMoveFolders(currentDir);
  };

  const openChmodModal = (file: FileItem) => {
    if (!canEditPermissions) return;
    setChmodTarget(file.name);
    setChmodValue(file.rawMode || "755");
    setModalError(null);
    setChmodOpen(true);
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) setSelectedFiles([]);
    else setSelectedFiles(files.map((f) => f.name));
  };

  const toggleSelectFile = (name: string) => {
    setSelectedFiles((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  };

  const isEditable = (file: FileItem) => {
    if (file.directory || file.isArchive) return false;
    const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() || "" : "";
    return MONACO_SUPPORTED_EXTENSIONS.has(ext);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.directory) {
      const nextDir = currentDir === "/" ? `/${file.name}` : `${currentDir}/${file.name}`;
      fetchFiles(nextDir);
      updateUrlParams(nextDir, null);
    } else if (isEditable(file) && canReadContent) {
      const filePath = currentDir === "/" ? `/${file.name}` : `${currentDir}/${file.name}`;
      setActiveEditorFile(filePath);
      updateUrlParams(currentDir, filePath);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || !newFileName.trim()) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const targetFilePath = currentDir === "/" ? `/${newFileName.trim()}` : `${currentDir}/${newFileName.trim()}`;
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "write", file: targetFilePath, content: "" })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to create file.");
      setNewFileOpen(false);
      setNewFileName("");
      if (canReadContent) {
        setActiveEditorFile(targetFilePath);
        updateUrlParams(currentDir, targetFilePath);
      } else {
        fetchFiles(currentDir, true);
      }
    } catch (err: any) {
      setModalError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to create file.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || !newFolderName.trim()) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create-folder", name: newFolderName.trim(), directory: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to create folder.");
      setNewFolderName("");
      setNewFolderOpen(false);
      fetchFiles(currentDir, true);
    } catch (err: any) {
      setModalError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to create folder.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRename || !renameValue.trim() || !renameTarget) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "rename", from: renameTarget, to: renameValue.trim(), root: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to rename.");
      setRenameOpen(false);
      fetchFiles(currentDir, true);
    } catch (err: any) {
      setModalError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to rename.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleExecuteMove = async () => {
    if (!canMove || !moveTarget) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "move", from: moveTarget, to: moveBrowserDir, root: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to move item.");
      setMoveOpen(false);
      fetchFiles(currentDir, true);
    } catch (err: any) {
      setModalError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to move item.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopyFile = async (fileName: string) => {
    if (!canCopy) return;
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "copy", file: fileName, root: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to copy file.");
      fetchFiles(currentDir, true);
    } catch (err: any) {
      setUploadError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to copy file.");
    }
  };

  const handleChmod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPermissions || !chmodTarget || !chmodValue) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "chmod", file: chmodTarget, mode: chmodValue, root: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to update permissions.");
      setChmodOpen(false);
      fetchFiles(currentDir, true);
    } catch (err: any) {
      setModalError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to update permissions.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!canDownload) return;
    const filePath = currentDir === "/" ? `/${fileName}` : `${currentDir}/${fileName}`;
    const token = Cookies.get("token");
    try {
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files?action=download-url&file=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok || !data.url || !data.token) throw new Error(data.error || "Failed to generate download authorization.");

      const downloadRes = await fetch(data.url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.token}`
        }
      });

      if (!downloadRes.ok) {
        let errData: any = {};
        try {
          errData = await downloadRes.json();
        } catch {}
        throw new Error(errData.error || "Failed to download file from daemon.");
      }

      const blob = await downloadRes.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setUploadError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Download failed.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) return;
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const file = uploadedFiles[0];

    setUploadProgress(0);
    setUploadError(null);

    const token = Cookies.get("token");
    let uploadUrl = "";
    let uploadToken = "";
    let maxLimitMB = 100;

    try {
      const linkRes = await apiRequest(
        `api/v1/client/servers/${serverId}/files?action=upload-url&directory=${encodeURIComponent(currentDir)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const linkText = await linkRes.text();
      let linkData: any = {};
      try {
        linkData = JSON.parse(linkText);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!linkRes.ok || !linkData.url || !linkData.token) throw new Error(linkData.error || "Failed to request direct upload link.");

      uploadUrl = linkData.url;
      uploadToken = linkData.token;
      maxLimitMB = linkData.maxSizeMB || 100;
    } catch (err: any) {
      setUploadProgress(null);
      setUploadError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Could not retrieve upload destination.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const maxBytes = maxLimitMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadProgress(null);
      setUploadError(`File "${file.name}" exceeds the node upload limit of ${maxLimitMB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("directory", currentDir);
    formData.append("files", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${uploadToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        fetchFiles(currentDir, true);
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          setUploadError(res.error || "The daemon isn't responding to the internal requests. Please try again in a few moments.");
        } catch {
          setUploadError("The daemon isn't responding to the internal requests. Please try again in a few moments.");
        }
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setUploadError("The daemon isn't responding to the internal requests. Please try again in a few moments.");
    };

    xhr.send(formData);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", files: selectedFiles, root: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to delete files.");
      setDeleteConfirmOpen(false);
      fetchFiles(currentDir, true);
    } catch (err: any) {
      setModalError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to delete files.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleArchive = async (targets: string[] = selectedFiles) => {
    if (!canArchive || !targets || targets.length === 0) return;
    setIsArchiving(true);
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "archive", files: targets, root: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) setUploadError(data.error || "Failed to archive.");
      else fetchFiles(currentDir, true);
    } catch (err: any) {
      setUploadError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to archive.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async (fileName: string) => {
    if (!canArchive) return;
    try {
      const token = Cookies.get("token");
      const res = await apiRequest(`api/v1/client/servers/${serverId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "unarchive", file: fileName, root: currentDir })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("The daemon isn't responding to the internal requests. Please try again in a few moments.");
      }
      if (!res.ok) setUploadError(data.error || "Failed to unarchive.");
      else fetchFiles(currentDir, true);
    } catch (err: any) {
      setUploadError(err.message?.includes("Failed to fetch") ? "The daemon isn't responding to the internal requests. Please try again in a few moments." : err.message || "Failed to unarchive.");
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeEditorFile) {
    return (
      <FileEditor
        serverId={serverId}
        filePath={activeEditorFile}
        onClose={handleCloseEditor}
        accentColor={accentColor}
        canEdit={canEditFile}
      />
    );
  }

  const pathParts = currentDir.split("/").filter(Boolean);

  return (
    <div className="space-y-4 font-normal select-none w-full max-w-full overflow-x-hidden">
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-colors ${
          isDark ? "border-white/[0.08] bg-[#0c0d12]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="flex items-center flex-nowrap overflow-x-auto no-scrollbar scroll-smooth gap-1 text-xs py-1 max-w-full">
          <button
            onClick={() => {
              fetchFiles("/");
              updateUrlParams("/", null);
            }}
            className={`font-medium whitespace-nowrap transition-colors outline-none focus:outline-none shrink-0 ${
              currentDir === "/"
                ? isDark ? "text-white" : "text-zinc-900"
                : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            /home/container
          </button>

          {pathParts.map((part, index) => {
            const partPath = "/" + pathParts.slice(0, index + 1).join("/");
            const isLast = index === pathParts.length - 1;
            return (
              <React.Fragment key={partPath}>
                <span className={`shrink-0 ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>/</span>
                <button
                  onClick={() => {
                    fetchFiles(partPath);
                    updateUrlParams(partPath, null);
                  }}
                  style={{ color: isLast ? accentColor : undefined }}
                  className={`font-medium whitespace-nowrap transition-colors outline-none focus:outline-none shrink-0 ${
                    isLast
                      ? "font-semibold"
                      : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs outline-none border transition-colors flex-1 lg:w-44 hidden min-[320px]:block ${
              isDark
                ? "bg-[#12141a] border-white/10 text-white focus:border-white/20"
                : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
            }`}
          />

          {canCreate && (
            <>
              <button
                onClick={() => { setModalError(null); setNewFileOpen(true); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all shrink-0 outline-none focus:outline-none ${
                  isDark
                    ? "bg-zinc-900 border-white/10 text-zinc-200 hover:text-white"
                    : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <PlusIcon className="w-4 h-4" />
                <span>New File</span>
              </button>

              <button
                onClick={() => { setModalError(null); setNewFolderOpen(true); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all shrink-0 outline-none focus:outline-none ${
                  isDark
                    ? "bg-zinc-900 border-white/10 text-zinc-200 hover:text-white"
                    : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <FolderPlusIcon className="w-4 h-4" />
                <span>New Folder</span>
              </button>
            </>
          )}

          {canUpload && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}
                className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all hover:opacity-90 shrink-0 outline-none focus:outline-none"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span>Upload</span>
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </>
          )}
        </div>
      </div>
      {uploadProgress !== null && (
        <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? "border-white/10 bg-[#12141a]" : "border-zinc-200 bg-zinc-50"}`}>
          <div className={`flex justify-between text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
            <span>Uploading directly to node daemon...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
            <div style={{ width: `${uploadProgress}%`, backgroundColor: accentColor }} className="h-full transition-all duration-150" />
          </div>
        </div>
      )}
      {uploadError && (
        <div className={`p-3.5 rounded-2xl border text-xs flex justify-between items-center ${
          isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="font-bold ml-3 hover:opacity-75">✕</button>
        </div>
      )}
      {selectedFiles.length > 0 && (
        <div
          style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}
          className="p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs"
        >
          <span className="font-medium truncate" style={{ color: accentColor }}>
            {selectedFiles.length} item(s) selected
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {canArchive && (
              <button
                onClick={() => handleArchive(selectedFiles)}
                disabled={isArchiving}
                className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 disabled:opacity-50 outline-none focus:outline-none ${
                  isDark ? "border-white/10 bg-zinc-900 text-zinc-200" : "border-zinc-200 bg-white text-zinc-800 shadow-sm"
                }`}
              >
                <ArchiveBoxIcon className="w-4 h-4" />
                <span>Archive</span>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { setModalError(null); setDeleteConfirmOpen(true); }}
                className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 outline-none focus:outline-none ${
                  isDark ? "border-rose-500/30 bg-rose-500/20 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className={`rounded-2xl border overflow-hidden shadow-sm transition-colors ${
        isDark ? "border-white/[0.08] bg-[#0c0d12]" : "border-zinc-200 bg-white"
      }`}>
        {loading ? (
          <div className="w-full">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3.5 border-b last:border-b-0 animate-pulse ${
                  isDark ? "border-white/[0.04]" : "border-zinc-100"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-4 h-4 rounded ${isDark ? "bg-white/[0.07]" : "bg-zinc-200"}`} />
                  <div className={`w-5 h-5 rounded-lg ${isDark ? "bg-white/[0.07]" : "bg-zinc-200"}`} />
                  <div
                    className={`h-3 rounded-md ${isDark ? "bg-white/[0.07]" : "bg-zinc-200"}`}
                    style={{ width: `${120 + (i % 3) * 50}px` }}
                  />
                </div>
                <div className="hidden sm:flex items-center gap-10">
                  <div className={`w-12 h-2.5 rounded-md ${isDark ? "bg-white/[0.04]" : "bg-zinc-200"}`} />
                  <div className={`w-12 h-2.5 rounded-md ${isDark ? "bg-white/[0.04]" : "bg-zinc-200"}`} />
                  <div className={`w-20 h-2.5 rounded-md ${isDark ? "bg-white/[0.04]" : "bg-zinc-200"}`} />
                </div>
              </div>
            ))}
          </div>
        ) : daemonError ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
            <p className={`text-xs max-w-sm ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>{daemonError}</p>
            <button
              onClick={() => fetchFiles(currentDir, true)}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm outline-none focus:outline-none"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className={`p-14 text-center text-xs ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            No files or directories found.
          </div>
        ) : (
          <div className="w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[520px] sm:min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-medium select-none ${
                  isDark ? "border-white/[0.06] bg-[#111218] text-zinc-400" : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}>
                  <th className="py-3.5 px-4 w-10">
                    <CustomCheckbox
                      checked={selectedFiles.length === files.length && files.length > 0}
                      onChange={handleSelectAll}
                      accentColor={accentColor}
                      isDark={isDark}
                    />
                  </th>
                  <th className="py-3.5 px-4 min-w-[200px]">Name</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Permissions</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Modified</th>
                  <th className="py-3.5 px-4 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-white/[0.04]" : "divide-zinc-100"}`}>
                {filteredFiles.map((file) => (
                  <tr
                    key={file.name}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, file });
                    }}
                    className={`transition-colors group cursor-pointer outline-none focus:outline-none ${
                      isDark ? "hover:bg-white/[0.02]" : "hover:bg-zinc-50"
                    }`}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <CustomCheckbox
                        checked={selectedFiles.includes(file.name)}
                        onChange={() => toggleSelectFile(file.name)}
                        accentColor={accentColor}
                        isDark={isDark}
                      />
                    </td>
                    <td className="py-3 px-4" onClick={() => handleFileClick(file)}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileTypeIcon name={file.name} isDirectory={file.directory} isArchive={file.isArchive} />
                        <span className={`font-medium truncate max-w-[240px] sm:max-w-md ${
                          isDark ? "text-zinc-200 group-hover:text-white" : "text-zinc-800 group-hover:text-zinc-950"
                        }`}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-4 font-normal whitespace-nowrap ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      {file.directory ? "—" : formatBytes(file.size)}
                    </td>
                    <td className={`py-3 px-4 font-normal whitespace-nowrap hidden md:table-cell ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                      {file.permissions}
                    </td>
                    <td className={`py-3 px-4 font-normal whitespace-nowrap hidden lg:table-cell ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                      {new Date(file.modifiedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({ x: rect.left, y: rect.bottom + 6, file });
                        }}
                        className={`p-1.5 rounded-lg transition-all outline-none focus:outline-none ${
                          isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        <EllipsisVerticalIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          accentColor={accentColor}
          onClose={() => setContextMenu(null)}
          canDownload={canDownload}
          canArchive={canArchive}
          canRename={canRename}
          canMove={canMove}
          canCopy={canCopy}
          canEditPermissions={canEditPermissions}
          canDelete={canDelete}
          onRename={canRename ? () => {
            setRenameTarget(contextMenu.file.name);
            setRenameValue(contextMenu.file.name);
            setModalError(null);
            setRenameOpen(true);
          } : undefined}
          onDelete={canDelete ? () => {
            setSelectedFiles([contextMenu.file.name]);
            setModalError(null);
            setDeleteConfirmOpen(true);
          } : undefined}
          onArchive={canArchive ? () => handleArchive([contextMenu.file.name]) : undefined}
          onUnarchive={canArchive && contextMenu.file.isArchive ? () => handleUnarchive(contextMenu.file.name) : undefined}
          onMove={canMove ? () => openMoveModal(contextMenu.file.name) : undefined}
          onCopy={canCopy ? () => handleCopyFile(contextMenu.file.name) : undefined}
          onDownload={canDownload ? () => handleDownload(contextMenu.file.name) : undefined}
          onPermissions={canEditPermissions ? () => openChmodModal(contextMenu.file) : undefined}
        />
      )}
      <FileModals
        isDark={isDark}
        accentColor={accentColor}
        modalLoading={modalLoading}
        modalError={modalError}
        newFileOpen={newFileOpen}
        setNewFileOpen={setNewFileOpen}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        handleCreateFile={handleCreateFile}
        newFolderOpen={newFolderOpen}
        setNewFolderOpen={setNewFolderOpen}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
        renameOpen={renameOpen}
        setRenameOpen={setRenameOpen}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        handleRename={handleRename}
        chmodOpen={chmodOpen}
        setChmodOpen={setChmodOpen}
        chmodTarget={chmodTarget}
        chmodValue={chmodValue}
        setChmodValue={setChmodValue}
        handleChmod={handleChmod}
        moveOpen={moveOpen}
        setMoveOpen={setMoveOpen}
        moveTarget={moveTarget}
        moveBrowserDir={moveBrowserDir}
        moveFolderList={moveFolderList}
        moveLoadingFolders={moveLoadingFolders}
        fetchMoveFolders={fetchMoveFolders}
        handleExecuteMove={handleExecuteMove}
        deleteConfirmOpen={deleteConfirmOpen}
        setDeleteConfirmOpen={setDeleteConfirmOpen}
        selectedCount={selectedFiles.length}
        handleDeleteSelected={handleDeleteSelected}
      />
    </div>
  );
}
