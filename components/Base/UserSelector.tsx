"use client";

import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { ChevronDownIcon, CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { config, apiRequest } from "@/lib/main";

interface UserOption {
  id: string;
  username: string;
  email: string;
}

interface UserSelectorProps {
  value: string | null;
  onChange: (userId: string, username: string) => void;
  placeholder?: string;
}

export default function UserSelector({
  value,
  onChange,
  placeholder = "Search server owner...",
}: UserSelectorProps) {
  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchUsers = async (searchQuery: string) => {
    const token = Cookies.get("token");
    if (!token) return;

    setLoading(true);
    try {
      const res = await apiRequest(`api/v1/admin/users/search?q=${encodeURIComponent(searchQuery)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      searchUsers(query);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) searchUsers(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-xs font-medium outline-none transition-colors ${
          isDark
            ? "bg-[#07080a] text-white border-white/10 hover:border-white/20"
            : "bg-zinc-50 text-zinc-900 border-zinc-300 hover:border-zinc-400"
        }`}
      >
        <span className="truncate">
          {selectedUser ? `${selectedUser.username} (${selectedUser.email})` : value || placeholder}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 right-0 z-[100000] mt-2 max-h-60 overflow-y-auto rounded-xl border shadow-2xl p-2 space-y-2 ${
          isDark ? "bg-[#0F1014] border-white/10" : "bg-white border-zinc-200"
        }`}>
          <div className="relative flex items-center">
            <MagnifyingGlassIcon className="absolute left-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type min. 3 characters..."
              className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs outline-none ${
                isDark ? "border-white/10 bg-black/40 text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
              }`}
            />
          </div>

          <div className="space-y-1">
            {loading ? (
              <p className="px-3 py-2 text-xs text-zinc-500 text-center">Searching users...</p>
            ) : users.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500 text-center">No users found.</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    onChange(u.id, u.username);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                    value === u.id
                      ? "bg-emerald-500/10 text-emerald-400 font-bold"
                      : isDark ? "text-zinc-200 hover:bg-white/5" : "text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold">{u.username}</span>
                    <span className="text-[10px] text-zinc-500">{u.email}</span>
                  </div>
                  {value === u.id && <CheckIcon className="w-4 h-4 text-emerald-400" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}