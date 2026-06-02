"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import type { VaultItem } from "@/lib/mockDb";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/apiClient";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";
import { VideoPlayer } from "@/components/features/VideoPlayer";

type DraftPoll = {
  question: string;
  options: { text: string; votes: number }[];
  votedOptionIndex: number | null;
};

export default function CreatePostPage() {
  const router = useRouter();
  const { user, showToast } = useUser();

  // Composer States
  const [content, setContent] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState("9.99");
  
  // Attached media states
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [fileName, setFileName] = useState("");
  const [mediaPreview, setMediaPreview] = useState(""); // data URL for preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Schedule states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [minScheduleDate, setMinScheduleDate] = useState("");

  useEffect(() => {
    if (isScheduled) {
      setMinScheduleDate(new Date(Date.now() + 60000).toISOString().slice(0, 16));
    }
  }, [isScheduled]);

  // Vault picker modal state
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);

  // Interactive Poll States
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  useEffect(() => {
    if (user?.role !== "creator") return;

    const fetchVault = async () => {
      try {
        const data = await apiClient.get<any[]>("/vault");
        setVaultItems(data.map((item) => ({
          id: item.id,
          name: item.name,
          url: item.url,
          type: item.type,
          size: item.size,
          usageCount: item.usage_count || 0,
          date: item.date,
        })));
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to load vault");
      }
    };

    fetchVault();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const type = isVideo ? "video" : "image";

    setMediaType(type);
    setFileName(file.name);
    setSelectedFile(file);

    // Create a data URL for preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setMediaPreview(result);
      setMediaUrl("");
    };
    reader.readAsDataURL(file);
    showToast(`${type === "video" ? "Video" : "Image"} attached: ${file.name}`);
  };

  const handleSelectVaultItem = (item: VaultItem) => {
    setMediaUrl(item.url);
    setMediaType(item.type);
    setFileName(item.name);
    setMediaPreview(item.url);
    setSelectedFile(null);
    setIsVaultOpen(false);
    showToast(`Attached ${item.name} from Vault`);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    } else {
      showToast("Maximum 5 poll choices allowed");
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const updated = [...pollOptions];
      updated.splice(index, 1);
      setPollOptions(updated);
    } else {
      showToast("Minimum 2 choices required for a poll");
    }
  };

  const handleOptionChange = (val: string, index: number) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishing) return;

    const normalizedExternalUrl = externalUrl.trim();
    const composedContent = [content.trim(), normalizedExternalUrl].filter(Boolean).join("\n");

    if (!composedContent.trim() && !mediaPreview) {
      showToast("Add text or media before publishing");
      return;
    }

    const priceNum = isPremium ? parseFloat(price) || 9.99 : 0;

    // Build poll object if toggled and valid
    let finalPoll: DraftPoll | null = null;
    if (hasPoll && pollQuestion.trim()) {
      const activeOptions = pollOptions.filter(o => o.trim() !== "");
      if (activeOptions.length >= 2) {
        finalPoll = {
          question: pollQuestion.trim(),
          options: activeOptions.map(opt => ({ text: opt.trim(), votes: 0 })),
          votedOptionIndex: null
        };
      } else {
        showToast("Please provide at least 2 non-empty options for the poll");
        return;
      }
    }
    
    if (isScheduled && scheduleDate) {
      showToast("Scheduled publishing will be connected in the next real-data slice");
      return;
    }

    setIsPublishing(true);
    try {
      let uploadedUrl = mediaUrl;
      if (selectedFile) {
        showToast("Uploading media to Cloudinary...");
        const uploaded = await uploadToCloudinary(selectedFile);
        uploadedUrl = uploaded.secure_url;
      }

      await apiClient.post("/posts", {
        content: composedContent,
        media_urls: uploadedUrl ? [uploadedUrl] : [],
        media_type: uploadedUrl ? mediaType : "",
        is_premium: isPremium,
        price: priceNum,
        poll: finalPoll,
      });

      showToast("Post published successfully!");
      setTimeout(() => {
        router.push("/");
      }, 600);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <AppShell>
        {/* Mobile Header */}
        <MobileHeader>
          <span className="text-sm font-bold text-text-muted select-none">Compose</span>
        </MobileHeader>

        {/* Main Grid */}
        <div className="app-page-shell">
          <div className="w-full min-h-screen p-4 md:p-6 space-y-6 max-md:mt-14 animate-fade-in">
            
            <div className="space-y-1 select-none flex justify-between items-center">
              <div>
                <h1 className="text-lg font-black text-text-main font-sans tracking-tight">Create Post</h1>
                <p className="text-xs text-text-muted font-medium">Draft updates, add files, setup PPV prices, or run audience polls.</p>
              </div>
              
              <button
                onClick={() => router.back()}
                className="text-xs font-bold text-text-muted hover:text-text-main border border-border px-3 py-1.5 rounded-full bg-surface"
              >
                Cancel
              </button>
            </div>

            {/* Premium Post Editor Card */}
            <form onSubmit={handlePublish} className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              
              {/* Creator details header */}
              {user && (
                <div className="p-4 border-b border-border/60 bg-surface/50 flex items-center gap-3 select-none">
                  <img
                    src={user.avatar}
                    alt="Creator Avatar"
                    className="h-10 w-10 rounded-full object-cover border border-border"
                  />
                  <div>
                    <p className="text-xs font-black text-text-main">{user.displayName}</p>
                    <p className="text-[10px] text-text-muted font-bold">Posting to @{user.username}</p>
                  </div>
                </div>
              )}

              {/* Text Description Textarea */}
              <div className="p-4">
                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={2000}
                  placeholder="Write a caption. Use @username mentions or paste links like https://example.com..."
                  className="w-full text-xs font-medium bg-transparent outline-none text-text-main placeholder-text-muted resize-none leading-relaxed"
                />
                <div className="flex justify-end">
                  <span className={`text-[10px] font-bold ${content.length > 1800 ? "text-accent" : "text-text-muted"}`}>
                    {content.length}/2000
                  </span>
                </div>
              </div>

              {/* Preview Containers Section */}
              <div className="px-4 space-y-3">
                <div className="bg-background border border-border rounded-xl px-4 py-3">
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 select-none">
                    Optional Link
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://your-site.com or creator page"
                    className="w-full bg-transparent text-xs font-semibold text-text-main outline-none placeholder-text-muted"
                  />
                </div>

                {/* 1. Media Preview Area */}
                {mediaPreview && (
                  <div className="bg-background border border-border rounded-xl overflow-hidden animate-fade-in">
                    {mediaType === "video" ? (
                      <VideoPlayer src={mediaPreview} className="max-h-[260px] w-full" />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full max-h-[240px] object-cover" />
                    )}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                          {mediaType === "video" ? "videocam" : "image"}
                        </span>
                        <p className="text-[10px] font-bold text-text-muted truncate">{fileName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setMediaUrl(""); setFileName(""); setMediaPreview(""); setSelectedFile(null); }}
                        className="text-red-500 hover:text-red-600 text-[10px] font-bold cursor-pointer shrink-0 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Poll Builder Area */}
                {hasPoll && (
                  <div className="bg-background border border-border p-4 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center select-none">
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">poll</span>
                        <span>Audience Poll Editor</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setHasPoll(false)}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        Delete Poll
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Ask a question (e.g. Which cosplay outfit next?)"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary text-text-main"
                    />

                    <div className="space-y-2">
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            required
                            placeholder={`Choice ${idx + 1}...`}
                            value={opt}
                            onChange={(e) => handleOptionChange(e.target.value, idx)}
                            className="flex-grow px-3.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium outline-none focus:border-primary text-text-main"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(idx)}
                              className="material-symbols-outlined text-text-muted hover:text-red-500 text-[18px] cursor-pointer"
                            >
                              delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {pollOptions.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddPollOption}
                        className="text-[10px] font-black text-primary hover:underline flex items-center gap-0.5 select-none"
                      >
                        <span className="material-symbols-outlined text-[13px] font-bold">add</span>
                        <span>Add Poll Option</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 3. PPV Price configuration */}
                {isPremium && (
                  <div className="bg-background border border-border p-4 rounded-xl space-y-3 animate-fade-in select-none">
                    <div>
                      <h3 className="text-xs font-bold text-text-main">Pay-Per-View (PPV) Pricing</h3>
                      <p className="text-[10px] text-text-muted mt-0.5">Subscribers and visitors must pay the unlock fee to view the post media.</p>
                    </div>

                    <div className="relative flex items-center bg-surface border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-all">
                      <span className="text-xs font-bold text-text-muted mr-1">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full text-xs font-bold bg-transparent outline-none text-text-main"
                      />
                      <span className="text-[10px] font-bold text-text-muted select-none">INR</span>
                    </div>
                  </div>
                )}

                {/* 4. Scheduling configuration */}
                {isScheduled && (
                  <div className="bg-background border border-border p-4 rounded-xl space-y-3 animate-fade-in select-none">
                    <div>
                      <h3 className="text-xs font-bold text-text-main">Schedule Publication Date</h3>
                      <p className="text-[10px] text-text-muted mt-0.5">Select a future date and time to automatically publish this post.</p>
                    </div>

                    <input
                      type="datetime-local"
                      required
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={minScheduleDate}
                      className="w-full px-4 py-2 bg-surface border border-border rounded-xl focus:border-primary transition-all text-xs font-bold outline-none text-text-main"
                    />
                  </div>
                )}
              </div>

              {/* Bottom Composer Toolbar */}
              <div className="p-4 border-t border-border mt-2 flex items-center justify-between select-none">
                <div className="flex gap-3">
                  {/* File upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-text-muted hover:text-primary transition-colors flex items-center justify-center cursor-pointer"
                    title="Upload photo or video"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Vault selector trigger */}
                  <button
                    type="button"
                    onClick={() => setIsVaultOpen(true)}
                    className="text-text-muted hover:text-primary transition-colors flex items-center justify-center cursor-pointer"
                    title="Select file from Vault"
                  >
                    <span className="material-symbols-outlined text-[18px]">folder_special</span>
                  </button>

                  {/* Poll trigger toggle */}
                  <button
                    type="button"
                    onClick={() => setHasPoll(!hasPoll)}
                    className={`transition-colors flex items-center justify-center cursor-pointer ${
                      hasPoll ? "text-primary" : "text-text-muted hover:text-primary"
                    }`}
                    title="Add interactive poll"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={hasPoll ? { fontVariationSettings: "'FILL' 1" } : undefined}>poll</span>
                  </button>

                  {/* Premium Lock trigger toggle */}
                  <button
                    type="button"
                    onClick={() => setIsPremium(!isPremium)}
                    className={`transition-colors flex items-center justify-center cursor-pointer ${
                      isPremium ? "text-accent animate-pulse" : "text-text-muted hover:text-accent"
                    }`}
                    title="Add Pay-Per-View lock pricing"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={isPremium ? { fontVariationSettings: "'FILL' 1" } : undefined}>lock</span>
                  </button>

                  {/* Post scheduling toggle */}
                  <button
                    type="button"
                    onClick={() => setIsScheduled(!isScheduled)}
                    className={`transition-colors flex items-center justify-center cursor-pointer ${
                      isScheduled ? "text-primary animate-pulse" : "text-text-muted hover:text-primary"
                    }`}
                    title="Schedule post publication"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={isScheduled ? { fontVariationSettings: "'FILL' 1" } : undefined}>schedule</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isPublishing}
                  className={`bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-full transition-all shadow-md flex items-center gap-1.5 ${
                    isPublishing ? "cursor-wait opacity-70" : "cursor-pointer"
                  }`}
                >
                  <span>{isPublishing ? "Publishing..." : "Publish"}</span>
                  <span className="material-symbols-outlined text-[15px] font-black">{isPublishing ? "hourglass_empty" : "send"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Vault Selector Modal */}
        <Modal isOpen={isVaultOpen} onClose={() => setIsVaultOpen(false)} title="Attach from Vault">
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
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">videocam</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">image</span>
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
