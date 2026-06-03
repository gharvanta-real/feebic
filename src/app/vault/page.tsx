"use client";

import React, { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import type { VaultItem } from "@/lib/mockDb";
import { apiClient } from "@/lib/apiClient";
import { uploadToCloudinary, validateVideoFile } from "@/lib/cloudinaryClient";


export default function CreatorVaultPage() {
  const { showToast, user } = useUser();
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "image" | "video" | "unused">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [viewingItem, setViewingItem] = useState<VaultItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchVault = async () => {
    if (user?.role !== "creator") {
      setVaultItems([]);
      return;
    }

    try {
      const data = await apiClient.get<any[]>("/vault");
      const mapped = data.map((item) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        type: item.type,
        size: item.size,
        usageCount: item.usage_count || 0,
        date: item.date
      }));
      setVaultItems(mapped);
    } catch (err) {
      setVaultItems([]);
      showToast(err instanceof Error ? err.message : "Failed to load vault");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media asset?")) return;
    try {
      await apiClient.delete(`/vault/${id}`);
      showToast("Media asset deleted successfully");
      await fetchVault();
    } catch (err: any) {
      showToast(err.message || "Failed to delete asset");
    }
  };


  useEffect(() => {
    setTimeout(() => {
      fetchVault();
    }, 0);

    const handleVaultUpdate = () => fetchVault();
    window.addEventListener("ch_vault_updated", handleVaultUpdate);
    return () => window.removeEventListener("ch_vault_updated", handleVaultUpdate);
  }, [user?.role]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleUploadFile = async (file?: File) => {
    if (user?.role !== "creator") {
      showToast("Only creators can upload to the media vault");
      return;
    }
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showToast("Upload an image or video file");
      return;
    }

    if (file.type.startsWith("video/")) {
      showToast("Validating video file...");
      const check = await validateVideoFile(file, {
        maxDurationSeconds: 600, // 10 minutes
        maxSizeBytes: 100 * 1024 * 1024, // 100 MB
      });
      if (!check.isValid) {
        showToast(check.error || "Invalid video file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file, user.username, "vault");
      await apiClient.post("/vault", {
        name: file.name,
        url: uploaded.secure_url,
        type: uploaded.resource_type === "video" ? "video" : "image",
        size: formatSize(uploaded.bytes || file.size)
      });
      showToast(`Uploaded ${file.name} to Vault`);
      await fetchVault();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload to Vault");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  const getFilteredItems = () => {
    switch (activeTab) {
      case "image":
        return vaultItems.filter((i) => i.type === "image");
      case "video":
        return vaultItems.filter((i) => i.type === "video");
      case "unused":
        return vaultItems.filter((i) => i.usageCount === 0);
      default:
        return vaultItems;
    }
  };

  const filteredItems = getFilteredItems();

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <AppShell>
        {/* Mobile Header */}
        <MobileHeader>
          <span className="text-sm font-bold text-text-muted select-none">Vault</span>
        </MobileHeader>

        {/* Main Content (Touching Sidebar) */}
        <div className="app-page-shell space-y-6 animate-fade-in">
            
            {/* Header section with Upload Trigger */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-border gap-4 select-none">
              <div className="space-y-0.5">
                <h1 className="text-lg font-black text-text-main font-sans tracking-tight font-sans">Media Vault</h1>
                <p className="text-xs text-text-muted font-medium">Total of {vaultItems.length} secure digital assets stored</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => handleUploadFile(event.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-primary hover:bg-primary-hover text-white active:scale-95 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    <span>Syncing file...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px] leading-none">upload</span>
                    <span>Upload Media</span>
                  </>
                )}
              </button>
            </div>

            {/* Media Filter Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-0 select-none bg-transparent">
              <div className="flex gap-6 overflow-x-auto no-scrollbar w-full">
                {([
                  { key: "all", label: "All Items", icon: "folder" },
                  { key: "image", label: "Photos", icon: "image" },
                  { key: "video", label: "Videos", icon: "play_circle" },
                  { key: "unused", label: "Unused", icon: "assignment_late" }
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`text-[14px] font-extrabold pb-3.5 cursor-pointer transition-all border-b-2 leading-none relative flex items-center gap-1.5 shrink-0 ${
                      activeTab === tab.key
                        ? "border-primary text-primary font-black"
                        : "border-transparent text-text-muted hover:text-text-main"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px] leading-none" style={{ fontVariationSettings: activeTab === tab.key ? "'FILL' 1" : undefined }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Vault responsive grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 select-none">
              {filteredItems.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-3 select-none">
                  <span className="material-symbols-outlined text-[64px] text-text-muted">folder_zip</span>
                  <h3 className="text-base font-extrabold text-text-main">No files found</h3>
                  <p className="text-xs text-text-muted max-w-[280px]">
                    No files found under this criteria. Try uploading new photos or videos to start indexing your vault.
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-primary/40 hover:shadow-md transition-all group"
                  >
                    {/* Media Preview Box */}
                    <div
                      onClick={() => setViewingItem(item)}
                      className="h-32 bg-surface-container relative border-b border-border overflow-hidden cursor-pointer"
                    >
                      {item.type === "video" ? (
                        <div className="relative w-full h-full">
                          <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                            <span className="material-symbols-outlined text-white/90 text-[22px] drop-shadow">play_circle</span>
                          </div>
                        </div>
                      ) : (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover pointer-events-none transition-transform duration-300 group-hover:scale-105" />
                      )}
                      
                      {/* Media type icon overlay */}
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 pointer-events-none">
                        <span className="material-symbols-outlined text-[10px]">
                          {item.type === "video" ? "videocam" : "image"}
                        </span>
                        <span>{item.type}</span>
                      </span>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-3.5 space-y-2 flex-grow flex flex-col justify-between">
                      <p className="text-xs font-black text-text-main truncate cursor-pointer hover:underline" onClick={() => setViewingItem(item)} title={item.name}>
                        {item.name}
                      </p>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-text-muted font-bold">
                          <span>{item.date}</span>
                          <span>{item.size}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black tracking-wide border-t border-border/60 pt-1.5 uppercase">
                          <span className={item.usageCount > 0 ? "text-primary" : "text-text-muted"}>
                            Usage: {item.usageCount} times
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="text-red-500 hover:text-red-600 flex items-center gap-0.5 cursor-pointer uppercase font-bold"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* View Modal */}
            {viewingItem && (
              <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/85 p-4 backdrop-blur-[2px] animate-fade-in">
                <div className="absolute inset-0 cursor-pointer" onClick={() => setViewingItem(null)} />
                <div className="relative max-w-3xl w-full max-h-[85vh] bg-surface border border-border rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-scale-in">
                  {/* Header */}
                  <div className="p-4 border-b border-border flex justify-between items-center bg-surface select-none">
                    <h3 className="text-sm font-black text-text-main truncate max-w-[80%]">{viewingItem.name}</h3>
                    <button 
                      onClick={() => setViewingItem(null)}
                      className="text-text-muted hover:text-primary transition-colors cursor-pointer flex items-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                  {/* Content */}
                  <div className="flex-grow flex items-center justify-center p-4 bg-black/10 overflow-auto">
                    {viewingItem.type === "video" ? (
                      <video src={viewingItem.url} controls autoPlay className="max-w-full max-h-[60vh] rounded-lg shadow-sm" />
                    ) : (
                      <img src={viewingItem.url} alt={viewingItem.name} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm" />
                    )}
                  </div>
                  {/* Footer info */}
                  <div className="p-4 border-t border-border bg-surface text-xs text-text-muted flex justify-between items-center select-none font-bold">
                    <span>Uploaded: {viewingItem.date}</span>
                    <span>Size: {viewingItem.size}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
      </AppShell>
    </RoleGuard>
  );
}
