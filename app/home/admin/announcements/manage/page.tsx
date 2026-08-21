"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import Loading from "@/components/Base/Loading";
import MDHandler from "@/components/Design/MDHandler";
import { config, apiRequest } from "@/lib/main";
import {
  ArrowLeftIcon,
  PhotoIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

function getBannerUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }
  const baseUrl = config.apiBaseUrl.endsWith("/")
    ? config.apiBaseUrl.slice(0, -1)
    : config.apiBaseUrl;
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
}

function uploadWithProgress(
  url: string,
  formData: FormData,
  token: string,
  onProgress: (percent: number) => void
): Promise<{ ok: boolean; status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const baseUrl = config.apiBaseUrl.endsWith("/")
      ? config.apiBaseUrl.slice(0, -1)
      : config.apiBaseUrl;
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}/${url.replace(/^\//, "")}`;

    xhr.open("PUT", fullUrl);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {}
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };

    xhr.onerror = () => reject(new Error("Network error occurred."));
    xhr.ontimeout = () => reject(new Error("Upload timed out."));
    xhr.send(formData);
  });
}

export default function EditAnnouncementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const annId = searchParams.get("ann_id") || searchParams.get("id");

  const isDark = config.theme === "dark";
  const accentColor = config.accentColor || "#00f2fe";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!annId) {
      setError("Missing announcement ID.");
      setLoading(false);
      return;
    }

    const fetchAnnouncement = async () => {
      const token = Cookies.get("token");
      if (!token) {
        setError("Unauthorized access.");
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest(`api/v1/admin/announcements?ann_id=${annId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setError("Failed to fetch announcement details.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        const ann = data.announcement;
        if (ann) {
          setTitle(ann.title || "");
          setDescription(ann.description || "");
          setCurrentImage(ann.image || null);
        }
      } catch {
        setError("Network error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [annId]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImagePreview(reader.result as string);
      setRemoveImage(false);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setNewImagePreview(null);
    setCurrentImage(null);
    setRemoveImage(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!annId) return;

    setSubmitting(true);
    setError(null);
    setUploadProgress(0);

    const token = Cookies.get("token") || "";
    const formData = new FormData();
    formData.append("id", annId);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("removeImage", removeImage ? "true" : "false");

    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await uploadWithProgress(
        "api/v1/admin/announcements",
        formData,
        token,
        (percent) => setUploadProgress(percent)
      );

      if (!res.ok) {
        setError(res.data?.error || "Failed to update announcement.");
        setSubmitting(false);
        setUploadProgress(null);
        return;
      }

      setUploadProgress(100);
      router.push("/home/admin/announcements");
    } catch (err: any) {
      setError(err?.message || "Network error occurred.");
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!annId || !confirm("Are you sure you want to delete this announcement?")) return;

    setDeleting(true);
    const token = Cookies.get("token");

    try {
      const res = await apiRequest("api/v1/admin/announcements", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: annId }),
      });

      if (res.ok) {
        router.push("/home/admin/announcements");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete announcement.");
      }
    } catch {
      setError("Network error occurred deleting announcement.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading width={32} height={32} />
      </div>
    );
  }

  const activeImage = newImagePreview || getBannerUrl(currentImage);

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-1 sm:px-0">
      <div className="flex items-center gap-2 mb-1">
        <Link
          href="/home/admin/announcements"
          className={`text-xs font-semibold flex items-center gap-1 ${
            isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4 stroke-[2]" />
          <span>Back to Announcements</span>
        </Link>
      </div>

      <div className="flex flex-col min-[880px]:flex-row min-[880px]:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            Manage Announcement
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Update title, markdown content, or replace banner graphic.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`self-start min-[880px]:self-auto px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
          }`}
        >
          {showPreview ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          <span>{showPreview ? "Edit Mode" : "Live Preview"}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`p-6 sm:p-7 rounded-2xl border space-y-5 shadow-sm ${isDark ? "border-white/[0.06] bg-[#0F1014]" : "border-zinc-200 bg-white"}`}>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Announcement Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${
                isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Banner Image
            </label>

            {activeImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 group h-48 w-full bg-zinc-900">
                <img src={activeImage} alt="Banner" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-rose-500/80 text-white backdrop-blur-md opacity-90 hover:opacity-100 transition-all"
                  title="Remove Image"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <label className={`hidden min-[330px]:flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                  isDark ? "border-white/10 bg-white/[0.01] hover:bg-white/[0.03]" : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
                }`}>
                  <PhotoIcon className="w-8 h-8 text-zinc-500 mb-2" />
                  <span className={`text-xs font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    Click to upload new banner
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, WEBP, GIF, SVG supported</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>

                <div className="flex flex-col items-center gap-2 min-[330px]:hidden">
                  <label className={`flex items-center justify-center w-14 h-14 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                    isDark ? "border-white/10 bg-white/[0.01] hover:bg-white/[0.03] text-zinc-300" : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                  }`}>
                    <PlusIcon className="w-6 h-6 stroke-[2.5]" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <div className={`text-center p-2 rounded-xl border text-[10px] w-full ${isDark ? "bg-white/[0.02] border-white/5 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"}`}>
                    <p className="font-semibold">Allowed: PNG, JPG, WEBP, GIF</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              Content (Markdown Supported)
            </label>

            {!showPreview ? (
              <textarea
                required
                rows={7}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none leading-relaxed ${
                  isDark ? "border-white/10 bg-[#07080a] text-white" : "border-zinc-300 bg-zinc-50 text-zinc-900"
                }`}
              />
            ) : (
              <div className={`p-5 rounded-2xl border ${isDark ? "border-white/10 bg-[#07080a]" : "border-zinc-300 bg-zinc-50"}`}>
                {description ? (
                  <MDHandler content={description} />
                ) : (
                  <span className="text-xs text-zinc-500 italic">No content typed yet.</span>
                )}
              </div>
            )}
          </div>
        </div>
        {uploadProgress !== null && (
          <div className={`p-4 rounded-2xl border transition-all space-y-2 ${isDark ? "bg-[#0F1014] border-white/10" : "bg-white border-zinc-200"}`}>
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>Saving Announcement...</span>
              <span style={{ color: accentColor }} className="font-mono">{uploadProgress}%</span>
            </div>
            <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
              <div
                className="h-full transition-all duration-200 ease-out rounded-full"
                style={{ width: `${uploadProgress}%`, backgroundColor: accentColor }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: accentColor }}
            className="w-full sm:flex-1 py-3 rounded-xl font-bold text-xs text-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
          >
            {submitting ? <Loading width={16} height={16} color="#000000" /> : "Save Changes"}
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? <Loading width={14} height={14} color="#f87171" /> : <TrashIcon className="w-4 h-4" />}
            <span>Delete Announcement</span>
          </button>
        </div>
      </form>
    </div>
  );
}