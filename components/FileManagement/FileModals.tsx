"use client";

import React from "react";
import ModalMenu from "@/components/Base/ModalMenu";
import Loading from "@/components/Base/Loading";
import {
  FolderIcon,
  ChevronRightIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { FileItem } from "./FileContextMenu";

interface FileModalsProps {
  isDark: boolean;
  accentColor: string;
  modalLoading: boolean;
  modalError: string | null;
  newFileOpen: boolean;
  setNewFileOpen: (open: boolean) => void;
  newFileName: string;
  setNewFileName: (v: string) => void;
  handleCreateFile: (e: React.FormEvent) => void;
  newFolderOpen: boolean;
  setNewFolderOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  handleCreateFolder: (e: React.FormEvent) => void;
  renameOpen: boolean;
  setRenameOpen: (open: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  handleRename: (e: React.FormEvent) => void;
  chmodOpen: boolean;
  setChmodOpen: (open: boolean) => void;
  chmodTarget: string;
  chmodValue: string;
  setChmodValue: (v: string) => void;
  handleChmod: (e: React.FormEvent) => void;
  moveOpen: boolean;
  setMoveOpen: (open: boolean) => void;
  moveTarget: string;
  moveBrowserDir: string;
  moveFolderList: FileItem[];
  moveLoadingFolders: boolean;
  fetchMoveFolders: (dir: string) => void;
  handleExecuteMove: () => void;
  deleteConfirmOpen: boolean;
  setDeleteConfirmOpen: (open: boolean) => void;
  selectedCount: number;
  handleDeleteSelected: () => void;
}

export default function FileModals(props: FileModalsProps) {
  const { isDark, accentColor, modalLoading, modalError } = props;

  return (
    <>
      <ModalMenu isOpen={props.newFileOpen} onClose={() => props.setNewFileOpen(false)}>
        <form onSubmit={props.handleCreateFile} className="p-6 space-y-4">
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Create New File</h3>
          {modalError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}
          <input
            type="text"
            placeholder="e.g. index.js, app.py"
            value={props.newFileName}
            onChange={(e) => props.setNewFileName(e.target.value)}
            className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
              isDark ? "bg-zinc-900 border-white/10 text-white focus:border-white/30" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
            }`}
            autoFocus
          />
          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => props.setNewFileOpen(false)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading || !props.newFileName.trim()}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm"
            >
              {modalLoading ? "Creating..." : "Create & Edit"}
            </button>
          </div>
        </form>
      </ModalMenu>
      <ModalMenu isOpen={props.newFolderOpen} onClose={() => props.setNewFolderOpen(false)}>
        <form onSubmit={props.handleCreateFolder} className="p-6 space-y-4">
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Create New Folder</h3>
          {modalError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}
          <input
            type="text"
            placeholder="Folder Name"
            value={props.newFolderName}
            onChange={(e) => props.setNewFolderName(e.target.value)}
            className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
              isDark ? "bg-zinc-900 border-white/10 text-white focus:border-white/30" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
            }`}
            autoFocus
          />
          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => props.setNewFolderOpen(false)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading || !props.newFolderName.trim()}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm"
            >
              {modalLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </ModalMenu>
      <ModalMenu isOpen={props.renameOpen} onClose={() => props.setRenameOpen(false)}>
        <form onSubmit={props.handleRename} className="p-6 space-y-4">
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Rename Item</h3>
          {modalError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}
          <input
            type="text"
            placeholder="New Name"
            value={props.renameValue}
            onChange={(e) => props.setRenameValue(e.target.value)}
            className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
              isDark ? "bg-zinc-900 border-white/10 text-white focus:border-white/30" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
            }`}
            autoFocus
          />
          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => props.setRenameOpen(false)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading || !props.renameValue.trim()}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm"
            >
              {modalLoading ? "Renaming..." : "Rename"}
            </button>
          </div>
        </form>
      </ModalMenu>
      <ModalMenu isOpen={props.chmodOpen} onClose={() => props.setChmodOpen(false)}>
        <form onSubmit={props.handleChmod} className="p-6 space-y-4">
          <div>
            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Change Permissions</h3>
            <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Update file mode for <span className="font-semibold">{props.chmodTarget}</span> (e.g. 755, 644)
            </p>
          </div>
          {modalError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}
          <input
            type="text"
            placeholder="Mode (e.g. 755)"
            value={props.chmodValue}
            maxLength={4}
            onChange={(e) => props.setChmodValue(e.target.value)}
            className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
              isDark ? "bg-zinc-900 border-white/10 text-white focus:border-white/30" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400"
            }`}
            autoFocus
          />
          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => props.setChmodOpen(false)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading || !props.chmodValue.trim()}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm"
            >
              {modalLoading ? "Saving..." : "Save Permissions"}
            </button>
          </div>
        </form>
      </ModalMenu>
      <ModalMenu isOpen={props.moveOpen} onClose={() => props.setMoveOpen(false)}>
        <div className="p-6 space-y-4">
          <div>
            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Move File</h3>
            <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Select the destination directory for <span className="font-semibold">{props.moveTarget}</span>
            </p>
          </div>

          {modalError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-medium ${
            isDark ? "bg-zinc-900/90 border-white/10 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
          }`}>
            <span className="truncate">{props.moveBrowserDir === "/" ? "/home/container" : `/home/container${props.moveBrowserDir}`}</span>
            {props.moveBrowserDir !== "/" && (
              <button
                onClick={() => {
                  const parts = props.moveBrowserDir.split("/").filter(Boolean);
                  parts.pop();
                  const upDir = "/" + parts.join("/");
                  props.fetchMoveFolders(upDir === "" ? "/" : upDir);
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-sans flex items-center gap-1 transition-all ${
                  isDark ? "border-white/10 bg-zinc-800 text-zinc-300 hover:text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <ArrowUturnLeftIcon className="w-3 h-3" />
                <span>Up</span>
              </button>
            )}
          </div>

          <div className={`rounded-xl border max-h-48 overflow-y-auto divide-y ${
            isDark ? "bg-[#090a0f] border-white/10 divide-white/[0.04]" : "bg-zinc-50 border-zinc-200 divide-zinc-200/60"
          }`}>
            {props.moveLoadingFolders ? (
              <div className="p-6 flex justify-center">
                <Loading width={24} height={24} color={accentColor} />
              </div>
            ) : props.moveFolderList.length === 0 ? (
              <div className={`p-6 text-center text-xs ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                No subdirectories inside this folder.
              </div>
            ) : (
              props.moveFolderList.map((folder) => (
                <button
                  key={folder.name}
                  onClick={() => {
                    const targetSubdir = props.moveBrowserDir === "/" ? `/${folder.name}` : `${props.moveBrowserDir}/${folder.name}`;
                    props.fetchMoveFolders(targetSubdir);
                  }}
                  className={`w-full p-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                    isDark ? "hover:bg-white/5 text-zinc-300" : "hover:bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  <ChevronRightIcon className="w-3.5 h-3.5 opacity-50" />
                </button>
              ))
            )}
          </div>

          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => props.setMoveOpen(false)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={props.handleExecuteMove}
              disabled={modalLoading}
              style={{ backgroundColor: accentColor, color: "#000" }}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm"
            >
              {modalLoading ? "Moving..." : `Move Here (${props.moveBrowserDir === "/" ? "Root" : props.moveBrowserDir.split("/").pop()})`}
            </button>
          </div>
        </div>
      </ModalMenu>
      <ModalMenu isOpen={props.deleteConfirmOpen} onClose={() => props.setDeleteConfirmOpen(false)}>
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-rose-500">Delete Items</h3>
          {modalError && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}
          <p className={`text-xs ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
            Are you sure you want to permanently delete <strong>{props.selectedCount}</strong> item(s)? This action cannot be undone.
          </p>
          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => props.setDeleteConfirmOpen(false)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? "border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={props.handleDeleteSelected}
              disabled={modalLoading}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 shadow-sm"
            >
              {modalLoading ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </div>
      </ModalMenu>
    </>
  );
}