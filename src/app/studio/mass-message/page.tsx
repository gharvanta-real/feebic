"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useUser } from "@/context/UserContext";
import { mockDb, CustomList, VaultItem } from "@/lib/mockDb";
import { Modal } from "@/components/ui/Modal";

export default function MassMessagePage() {
  const router = useRouter();
  const { showToast } = useUser();

  // Composer state
  const [targetList, setTargetList] = useState("all");
  const [content, setContent] = useState("");
  const [isPPV, setIsPPV] = useState(false);
  const [price, setPrice] = useState("14.99");
  
  // Attached files
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [fileName, setFileName] = useState("");

  // Selectors
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setCustomLists(mockDb.getCustomLists());
      setVaultItems(mockDb.getVaultItems());
    }, 0);
  }, []);

  const handleSelectVaultItem = (item: VaultItem) => {
    setMediaUrl(item.url);
    setMediaType(item.type);
    setFileName(item.name);
    setIsVaultOpen(false);
    showToast(`Attached ${item.name} from Vault`);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl) {
      showToast("Please enter message text or attach a file.");
      return;
    }

    setIsBroadcasting(true);
    const lockPrice = isPPV ? parseFloat(price) || 14.99 : 0;

    setTimeout(() => {
      setIsBroadcasting(false);
      mockDb.broadcastMessage(
        content.trim(),
        mediaUrl,
        mediaType,
        isPPV,
        lockPrice,
        targetList
      );
      
      showToast("Mass message broadcast completed successfully!");
      router.push("/chat");
    }, 1500);
  };

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <AppShell>
        {/* Mobile Header */}
        <MobileHeader>
          <span className="text-sm font-bold text-text-muted select-none">Broadcast</span>
        </MobileHeader>

        {/* Main Composer Page Grid */}
        <div className="app-page-shell space-y-6 animate-fade-in">
          
          <div className="space-y-1 select-none flex justify-between items-center">
            <div>
              <h1 className="text-lg font-black text-text-main font-sans tracking-tight">Mass Broadcast Message</h1>
              <p className="text-xs text-text-muted font-medium">Send locked PPV media vlogs or updates to all fans or selected groups simultaneously.</p>
            </div>
            
            <button
              onClick={() => router.back()}
              className="text-xs font-bold text-text-muted hover:text-text-main border border-border px-3 py-1.5 rounded-full bg-surface cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleBroadcast} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-5">
            
            {/* Target Audience selection row */}
            <div className="select-none border-b border-border/60 pb-4">
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 ml-1">Target Audience Recipients</label>
              <select
                value={targetList}
                onChange={(e) => setTargetList(e.target.value)}
                disabled={isBroadcasting}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs font-semibold outline-none text-text-main"
              >
                <option value="all">All Subscribers (VIP Tippers, Close Friends & Fans)</option>
                <option value="favorites">Favorites List</option>
                {customLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    List: {list.name} ({list.usernames.length} fans)
                  </option>
                ))}
              </select>
            </div>

            {/* Main Message Text Composer */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 ml-1 select-none">Message Body Content</label>
              <textarea
                required
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isBroadcasting}
                placeholder="Write a message to broadcast (e.g. Check out my new beach photo set! Unlock to view behind the scenes...)"
                className="w-full p-4 bg-background border border-border rounded-2xl text-xs font-medium outline-none focus:border-primary text-text-main placeholder-text-muted resize-none leading-relaxed"
              />
            </div>

            {/* Attached media display */}
            {mediaUrl && (
              <div className="bg-background border border-border p-3.5 rounded-xl flex items-center justify-between gap-3 animate-fade-in select-none">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[28px] text-primary">
                    {mediaType === "video" ? "videocam" : "image"}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-text-main truncate max-w-[280px]">{fileName}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">{mediaType} attachment linked</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMediaUrl(""); setFileName(""); }}
                  disabled={isBroadcasting}
                  className="text-red-500 hover:text-red-600 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}

            {/* PPV Pricing options */}
            <div className="border-t border-border/60 pt-4 space-y-4 select-none">
              
              {/* PPV Toggle */}
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-xs font-bold text-text-main">Pay-Per-View (PPV) Lock</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">Toggle this on to lock this message attachments behind an unlock fee.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPPV(!isPPV)}
                  disabled={isBroadcasting}
                  className={`relative h-6 w-11 cursor-pointer rounded-full border p-[2px] transition-colors ${
                    isPPV ? "bg-accent border-accent" : "bg-gray-200 dark:bg-border"
                  }`}
                >
                  <div
                    className={`h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
                      isPPV ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Price input */}
              {isPPV && (
                <div className="bg-background border border-border p-4 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Set PPV Unlock Price (USD)</label>
                  <div className="relative flex items-center bg-surface border border-border rounded-xl px-4 py-2 focus-within:border-primary transition-all">
                    <span className="text-xs font-bold text-text-muted mr-1">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={isBroadcasting}
                      className="w-full text-xs font-bold bg-transparent outline-none text-text-main"
                    />
                    <span className="text-[10px] font-bold text-text-muted">USD</span>
                  </div>
                </div>
              )}

            </div>

            {/* Composer Footer Actions */}
            <div className="border-t border-border/60 pt-4 flex items-center justify-between select-none">
              
              {/* Attachment Triggers */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsVaultOpen(true)}
                  disabled={isBroadcasting}
                  className="text-text-muted hover:text-primary transition-colors flex items-center justify-center cursor-pointer p-1"
                  title="Browse Vault Media"
                >
                  <span className="material-symbols-outlined text-[22px]">folder_special</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Local file selector simulation opened")}
                  disabled={isBroadcasting}
                  className="text-text-muted hover:text-primary transition-colors flex items-center justify-center cursor-pointer p-1"
                  title="Upload from Local"
                >
                  <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                </button>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isBroadcasting || (!content.trim() && !mediaUrl)}
                className="bg-primary text-white hover:opacity-95 active:scale-95 disabled:opacity-50 text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10"
              >
                {isBroadcasting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    <span>Broadcasting DMs...</span>
                  </>
                ) : (
                  <>
                    <span>Send Broadcast</span>
                    <span className="material-symbols-outlined text-[15px] leading-none font-bold">campaign</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Vault Selector Modal */}
        <Modal isOpen={isVaultOpen} onClose={() => setIsVaultOpen(false)} title="Select Broadcast Media">
          <div className="max-h-[320px] overflow-y-auto pr-1 no-scrollbar space-y-2 select-none pt-1">
            {vaultItems.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">Your Vault is empty.</p>
            ) : (
              vaultItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectVaultItem(item)}
                  className="w-full p-2.5 bg-background border border-border hover:border-primary rounded-xl flex items-center gap-3 transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  {item.type === "video" ? (
                    <span className="material-symbols-outlined text-[24px] text-primary shrink-0">videocam</span>
                  ) : (
                    <span className="material-symbols-outlined text-[24px] text-primary shrink-0">image</span>
                  )}
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-bold text-text-main truncate leading-none mb-1">{item.name}</p>
                    <p className="text-[9px] text-text-muted leading-none">{item.size} • {item.date}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Modal>

      </AppShell>
    </RoleGuard>
  );
}
