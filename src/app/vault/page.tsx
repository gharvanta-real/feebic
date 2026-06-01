"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { mockDb, VaultItem } from "@/lib/mockDb";

export default function CreatorVaultPage() {
  const { showToast } = useUser();
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "image" | "video" | "unused">("all");
  const [isUploading, setIsUploading] = useState(false);

  const fetchVault = () => {
    setVaultItems(mockDb.getVaultItems());
  };

  useEffect(() => {
    setTimeout(() => {
      fetchVault();
    }, 0);

    const handleVaultUpdate = () => fetchVault();
    window.addEventListener("ch_vault_updated", handleVaultUpdate);
    return () => window.removeEventListener("ch_vault_updated", handleVaultUpdate);
  }, []);

  const handleMockUpload = () => {
    setIsUploading(true);
    showToast("Opening system file explorer...");

    const presets = [
      { name: "Backstage outfit teaser.jpg", url: "/assets/0c0bf4c58678d852ea7588ef1045309e.png", type: "image" },
      { name: "Promotional loop teaser.mp4", url: "/assets/65c7978e64c060567de19aa63c97dfe7.png", type: "video" },
      { name: "Exclusive photoset snapshot.jpg", url: "/assets/33835d122eba2ad097de797e914a7b1b.png", type: "image" },
      { name: "Workout motivation clip.mp4", url: "/assets/efcfd91838f89a7a1dcef9eac6ec0b56.png", type: "video" }
    ];

    const random = presets[Math.floor(Math.random() * presets.length)];

    setTimeout(() => {
      setIsUploading(false);
      mockDb.addVaultItem(random.name, random.url, random.type);
      showToast(`Uploaded ${random.name} to Vault!`);
    }, 1500);
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

              <button
                onClick={handleMockUpload}
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
                    <div className="h-32 bg-surface-container relative border-b border-border overflow-hidden">
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
                      <p className="text-xs font-black text-text-main truncate" title={item.name}>
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
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
      </AppShell>
    </RoleGuard>
  );
}
