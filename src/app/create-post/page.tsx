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

type AttachedMedia = {
  file: File | null;
  url: string;
  type: "image" | "video" | "audio";
  name: string;
  preview: string;
};

export default function CreatePostPage() {
  const router = useRouter();
  const { user, showToast } = useUser();

  // Wizard Step
  const [step, setStep] = useState(1);

  // STEP 1 STATE: Details & Monetization
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [audienceType, setAudienceType] = useState<"all" | "list">("all");
  const [targetListId, setTargetListId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState("499.00");
  
  // Fundraiser Settings
  const [hasFundraiser, setHasFundraiser] = useState(false);
  const [fundraiserTitle, setFundraiserTitle] = useState("");
  const [fundraiserGoal, setFundraiserGoal] = useState("5000");

  // STEP 2 STATE: Content Files
  const [attachedFiles, setAttachedFiles] = useState<AttachedMedia[]>([]);
  const [teaserFile, setTeaserFile] = useState<File | null>(null);
  const [teaserUrl, setTeaserUrl] = useState("");
  const [teaserType, setTeaserType] = useState<"image" | "video">("image");
  const [teaserName, setTeaserName] = useState("");
  const [teaserPreview, setTeaserPreview] = useState("");

  // STEP 3 STATE: Poll, Scheduling, and Review
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [minScheduleDate, setMinScheduleDate] = useState("");

  // Simulator Toggle
  const [simulatorView, setSimulatorView] = useState<"locked" | "unlocked">("locked");

  // Load backend items
  const [lists, setLists] = useState<{ id: string; name: string; usernames: string[] }[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultTarget, setVaultTarget] = useState<"main" | "teaser">("main");
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const teaserInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isScheduled) {
      setMinScheduleDate(new Date(Date.now() + 60000).toISOString().slice(0, 16));
    }
  }, [isScheduled]);

  // Load initial configurations from database API
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

    const fetchLists = async () => {
      try {
        const data = await apiClient.get<any[]>("/lists");
        setLists(data);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to load custom lists");
      }
    };

    fetchVault();
    fetchLists();
  }, [user]);

  // File Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map((file) => {
      const type = file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : "image";

      return {
        file,
        url: "",
        type: type as "image" | "video" | "audio",
        name: file.name,
        preview: URL.createObjectURL(file),
      };
    });

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    showToast(`Attached ${files.length} file(s)`);
  };

  const handleRemoveAttachedFile = (index: number) => {
    const updated = [...attachedFiles];
    updated.splice(index, 1);
    setAttachedFiles(updated);
  };

  const handleTeaserSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith("video/") ? "video" : "image";
    setTeaserFile(file);
    setTeaserType(type);
    setTeaserName(file.name);
    setTeaserPreview(URL.createObjectURL(file));
    setTeaserUrl("");
    showToast(`Teaser preview attached: ${file.name}`);
  };

  const handleRemoveTeaser = () => {
    setTeaserFile(null);
    setTeaserUrl("");
    setTeaserName("");
    setTeaserPreview("");
  };

  const openVaultPicker = (target: "main" | "teaser") => {
    setVaultTarget(target);
    setIsVaultOpen(true);
  };

  const handleSelectVaultItem = (item: VaultItem) => {
    if (vaultTarget === "main") {
      setAttachedFiles((prev) => [
        ...prev,
        {
          file: null,
          url: item.url,
          type: item.type as "image" | "video" | "audio",
          name: item.name,
          preview: item.url,
        },
      ]);
      showToast(`Attached ${item.name} from Vault`);
    } else {
      setTeaserUrl(item.url);
      setTeaserType(item.type === "video" ? "video" : "image");
      setTeaserName(item.name);
      setTeaserPreview(item.url);
      setTeaserFile(null);
      showToast(`Attached ${item.name} as teaser preview`);
    }
    setIsVaultOpen(false);
  };

  // Poll Handlers
  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    } else {
      showToast("Maximum 5 choices allowed");
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const updated = [...pollOptions];
      updated.splice(index, 1);
      setPollOptions(updated);
    } else {
      showToast("Minimum 2 choices required");
    }
  };

  const handleOptionChange = (val: string, index: number) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  // Step Validation & Stepper Navigation
  const validateStep1 = () => {
    if (!content.trim()) {
      showToast("Please write a post caption");
      return false;
    }
    if (audienceType === "list" && !targetListId) {
      showToast("Please choose a custom fan list");
      return false;
    }
    if (isPremium && (!price || parseFloat(price) <= 0)) {
      showToast("Please specify a lock price greater than 0");
      return false;
    }
    if (hasFundraiser) {
      if (!fundraiserTitle.trim()) {
        showToast("Please provide a title for the fundraiser");
        return false;
      }
      if (!fundraiserGoal || parseFloat(fundraiserGoal) <= 0) {
        showToast("Please provide a fundraiser goal greater than 0");
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    if (attachedFiles.length === 0 && !content.trim()) {
      showToast("Provide either some caption text or attach media file(s)");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Publish handler
  const handlePublish = async () => {
    if (isPublishing) return;

    // Check poll requirements
    let finalPoll: DraftPoll | null = null;
    if (hasPoll && pollQuestion.trim()) {
      const activeOptions = pollOptions.filter((o) => o.trim() !== "");
      if (activeOptions.length >= 2) {
        finalPoll = {
          question: pollQuestion.trim(),
          options: activeOptions.map((opt) => ({ text: opt.trim(), votes: 0 })),
          votedOptionIndex: null,
        };
      } else {
        showToast("Please provide at least 2 non-empty options for the poll");
        return;
      }
    }

    // Check fundraiser requirements
    let finalFundraiser = null;
    if (hasFundraiser && fundraiserTitle.trim() && fundraiserGoal) {
      finalFundraiser = {
        title: fundraiserTitle.trim(),
        goal: parseFloat(fundraiserGoal) || 5000,
        current: 0,
      };
    }

    // Schedule check
    if (isScheduled && !scheduleDate) {
      showToast("Please select a date and time for scheduled posting");
      return;
    }

    setIsPublishing(true);
    try {
      // 1. Upload main media files (if any are local file structures)
      showToast("Uploading attachments to Cloudinary...");
      const uploadedUrls: string[] = [];
      let lastMediaType = "image";

      for (const media of attachedFiles) {
        if (media.file) {
          const uploaded = await uploadToCloudinary(media.file);
          uploadedUrls.push(uploaded.secure_url);
          lastMediaType = media.type;
        } else if (media.url) {
          uploadedUrls.push(media.url);
          lastMediaType = media.type;
        }
      }

      // 2. Upload teaser file (if any)
      let finalTeaserUrl = teaserUrl;
      if (teaserFile) {
        showToast("Uploading teaser preview to Cloudinary...");
        const uploadedTeaser = await uploadToCloudinary(teaserFile);
        finalTeaserUrl = uploadedTeaser.secure_url;
      }

      // Prepare final content with tags appended
      let finalContent = content.trim();
      if (tags.trim()) {
        const formattedTags = tags
          .split(",")
          .map((t) => {
            const cleaned = t.trim();
            if (!cleaned) return "";
            return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
          })
          .filter(Boolean)
          .join(" ");
        finalContent = `${finalContent}\n\n${formattedTags}`;
      }

      const priceNum = isPremium ? parseFloat(price) || 499.0 : 0.0;

      // Submit post to Go server
      await apiClient.post("/posts", {
        content: finalContent,
        media_urls: uploadedUrls,
        media_type: uploadedUrls.length > 0 ? lastMediaType : "",
        is_premium: isPremium,
        price: priceNum,
        poll: finalPoll,
        fundraiser: finalFundraiser,
        teaser_url: isPremium ? finalTeaserUrl : "", // Teaser is only valid if locked
        publish_at: isScheduled ? scheduleDate : "",
        target_list_id: audienceType === "list" ? targetListId : "",
      });

      showToast(isScheduled ? "Post scheduled successfully!" : "Post published successfully!");
      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <AppShell>
        <MobileHeader>
          <span className="text-sm font-bold text-text-muted select-none">Create Wizard</span>
        </MobileHeader>

        <div className="app-page-shell">
          <div className="w-full min-h-screen p-4 md:p-6 space-y-6 max-md:mt-14 animate-fade-in max-w-4xl mx-auto">
            
            {/* Header Title bar */}
            <div className="flex justify-between items-center select-none">
              <div>
                <h1 className="text-xl font-black text-text-main tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">design_services</span>
                  <span>Redesign Post Composer</span>
                </h1>
                <p className="text-xs text-text-muted font-medium">3-step wizard with premium OnlyFans settings.</p>
              </div>
              <button
                onClick={() => router.back()}
                className="text-xs font-bold text-text-muted hover:text-text-main border border-border px-4 py-2 rounded-full bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 select-none shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6 w-full justify-around md:justify-start">
                
                {/* Step 1 Bubble */}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step === 1
                        ? "bg-primary text-white ring-4 ring-primary/20 scale-110"
                        : step > 1
                        ? "bg-success text-white"
                        : "bg-background border border-border text-text-muted"
                    }`}
                  >
                    {step > 1 ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      "1"
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-text-main leading-none">Details</p>
                    <p className="text-[9px] text-text-muted mt-0.5 leading-none">Monetization & Tags</p>
                  </div>
                </div>

                {/* Arrow Divider */}
                <span className="material-symbols-outlined text-[18px] text-text-muted hidden md:block select-none">arrow_forward</span>

                {/* Step 2 Bubble */}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step === 2
                        ? "bg-primary text-white ring-4 ring-primary/20 scale-110"
                        : step > 2
                        ? "bg-success text-white"
                        : "bg-background border border-border text-text-muted"
                    }`}
                  >
                    {step > 2 ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      "2"
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-text-main leading-none">Content</p>
                    <p className="text-[9px] text-text-muted mt-0.5 leading-none">Media & Teasers</p>
                  </div>
                </div>

                {/* Arrow Divider */}
                <span className="material-symbols-outlined text-[18px] text-text-muted hidden md:block select-none">arrow_forward</span>

                {/* Step 3 Bubble */}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step === 3
                        ? "bg-primary text-white ring-4 ring-primary/20 scale-110"
                        : "bg-background border border-border text-text-muted"
                    }`}
                  >
                    "3"
                  </div>
                  <div>
                    <p className="text-xs font-black text-text-main leading-none">Review</p>
                    <p className="text-[9px] text-text-muted mt-0.5 leading-none">Polls, Schedule & Live Card</p>
                  </div>
                </div>

              </div>

              {/* Step indicator tag */}
              <div className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-background border border-border rounded-full text-text-muted select-none">
                Step {step} of 3
              </div>
            </div>

            {/* Core Wizard Body */}
            <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[460px]">
              
              {/* Creator details header */}
              {user && (
                <div className="p-4 border-b border-border bg-surface/50 flex items-center gap-3 select-none">
                  <img
                    src={user.avatar || "/default-avatar.png"}
                    alt="Creator Avatar"
                    className="h-9 w-9 rounded-full object-cover border border-border"
                  />
                  <div>
                    <p className="text-xs font-black text-text-main leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-text-muted font-bold mt-0.5">Drafting to @{user.username}</p>
                  </div>
                </div>
              )}

              {/* STEP 1: DETAILS & MONETIZATION */}
              {step === 1 && (
                <div className="p-5 md:p-6 space-y-5 flex-grow">
                  
                  {/* Caption input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider select-none">
                      Caption Description *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={2000}
                      placeholder="What is this post about? Include links or tell your fans what to expect..."
                      className="w-full text-xs font-medium bg-background border border-border rounded-xl p-4 outline-none focus:border-primary text-text-main placeholder-text-muted resize-none leading-relaxed transition-all"
                    />
                    <div className="flex justify-between items-center select-none text-[10px] text-text-muted font-bold">
                      <span>Make it descriptive to increase unlocks!</span>
                      <span className={content.length > 1800 ? "text-accent" : ""}>
                        {content.length}/2000
                      </span>
                    </div>
                  </div>

                  {/* Tags input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider select-none">
                      Post Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g. cosplay, preview, vip, backstages"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs font-bold outline-none text-text-main"
                    />
                    <p className="text-[9px] text-text-muted select-none">Tags help group your content. They will be formatted as clickable hashtags.</p>
                  </div>

                  <hr className="border-border/60" />

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Audience targeting section */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-black text-text-main flex items-center gap-1.5 select-none">
                          <span className="material-symbols-outlined text-[16px] text-primary">groups</span>
                          <span>Audience Targeting</span>
                        </h3>
                        <p className="text-[10px] text-text-muted select-none mt-0.5">Limit visibility to specific lists of fans.</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAudienceType("all")}
                          className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            audienceType === "all"
                              ? "bg-primary/5 border-primary text-primary"
                              : "border-border hover:border-text-muted text-text-main"
                          }`}
                        >
                          All Followers
                        </button>
                        <button
                          type="button"
                          onClick={() => setAudienceType("list")}
                          className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            audienceType === "list"
                              ? "bg-primary/5 border-primary text-primary"
                              : "border-border hover:border-text-muted text-text-main"
                          }`}
                        >
                          Custom List
                        </button>
                      </div>

                      {audienceType === "list" && (
                        <div className="space-y-1.5 animate-fade-in">
                          <select
                            value={targetListId}
                            onChange={(e) => setTargetListId(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:border-primary text-xs font-bold text-text-main outline-none"
                          >
                            <option value="">-- Choose custom list --</option>
                            {lists.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.usernames.length} members)
                              </option>
                            ))}
                          </select>
                          {lists.length === 0 && (
                            <p className="text-[9px] text-accent font-bold select-none">
                              You haven't created any custom fan lists. Head to lists page to setup custom target circles.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* PPV settings section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black text-text-main flex items-center gap-1.5 select-none">
                            <span className="material-symbols-outlined text-[16px] text-accent">lock</span>
                            <span>Pay-Per-View (PPV) Lock</span>
                          </h3>
                          <p className="text-[10px] text-text-muted select-none mt-0.5">Require payment to view full media files.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPremium(!isPremium)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isPremium ? "bg-accent" : "bg-border"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isPremium ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {isPremium && (
                        <div className="space-y-2 animate-fade-in select-none">
                          <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider leading-none">
                            Lock Price (INR)
                          </label>
                          <div className="relative flex items-center bg-background border border-border rounded-xl px-3.5 py-2 focus-within:border-primary transition-all">
                            <span className="text-xs font-black text-text-muted mr-1.5">₹</span>
                            <input
                              type="number"
                              step="1"
                              min="99"
                              required
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              className="w-full text-xs font-black bg-transparent outline-none text-text-main"
                              placeholder="499"
                            />
                            <span className="text-[10px] font-black text-text-muted">INR</span>
                          </div>
                          <p className="text-[9px] text-text-muted">Recommended: ₹499 - ₹1,499. Lock requires Step 2 media previews.</p>
                        </div>
                      )}
                    </div>

                  </div>

                  <hr className="border-border/60" />

                  {/* Fundraiser Settings Section */}
                  <div className="bg-background/40 border border-border/80 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="select-none">
                        <h3 className="text-xs font-black text-text-main flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">campaign</span>
                          <span>Launch Tip Goal / Fundraiser</span>
                        </h3>
                        <p className="text-[10px] text-text-muted mt-0.5">Collect goal contributions from fans on this post.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHasFundraiser(!hasFundraiser)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          hasFundraiser ? "bg-primary" : "bg-border"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            hasFundraiser ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {hasFundraiser && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider select-none">
                            Fundraiser Goal Title
                          </label>
                          <input
                            type="text"
                            required
                            value={fundraiserTitle}
                            onChange={(e) => setFundraiserTitle(e.target.value)}
                            placeholder="e.g. Cosplay Outfit Fund, Special Vlog Setup"
                            className="w-full px-3.5 py-2 bg-background border border-border rounded-xl focus:border-primary text-xs font-bold text-text-main outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider select-none">
                            Target Amount (₹)
                          </label>
                          <div className="relative flex items-center bg-background border border-border rounded-xl px-3 py-1.5 focus-within:border-primary transition-all">
                            <span className="text-xs font-bold text-text-muted mr-1">₹</span>
                            <input
                              type="number"
                              min="1"
                              step="100"
                              required
                              value={fundraiserGoal}
                              onChange={(e) => setFundraiserGoal(e.target.value)}
                              className="w-full text-xs font-bold bg-transparent outline-none text-text-main"
                              placeholder="5000"
                            />
                            <span className="text-[10px] font-bold text-text-muted select-none">INR</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* STEP 2: CONTENT & TEASERS */}
              {step === 2 && (
                <div className="p-5 md:p-6 space-y-6 flex-grow">
                  
                  {/* Primary Media zone */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center select-none">
                      <div>
                        <h3 className="text-xs font-black text-text-main flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">perm_media</span>
                          <span>Primary Post Media *</span>
                        </h3>
                        <p className="text-[10px] text-text-muted mt-0.5">Upload photos, videos or audio clips to include in the post feed.</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => openVaultPicker("main")}
                        className="text-[10px] font-black text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">folder_special</span>
                        <span>Pick from Vault</span>
                      </button>
                    </div>

                    {/* Files picker grid zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-background/20 hover:bg-background/40 transition-all select-none"
                    >
                      <span className="material-symbols-outlined text-[32px] text-text-muted">add_to_photos</span>
                      <p className="text-xs font-bold text-text-main text-center">Click to attach photos, videos, or audio</p>
                      <p className="text-[9px] text-text-muted text-center max-w-[320px]">
                        Supports high-quality images and video formats. Multiple files can be attached to form a media carousel.
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    {/* Previews grid of main media */}
                    {attachedFiles.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                        {attachedFiles.map((media, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border border-border bg-background group aspect-video flex items-center justify-center">
                            {media.type === "video" ? (
                              <VideoPlayer src={media.preview} className="w-full h-full object-cover" />
                            ) : media.type === "audio" ? (
                              <div className="flex flex-col items-center justify-center p-3 text-center w-full">
                                <span className="material-symbols-outlined text-primary text-[24px]">audiotrack</span>
                                <p className="text-[9px] font-bold text-text-muted truncate w-full mt-1">{media.name}</p>
                              </div>
                            ) : (
                              <img src={media.preview} alt="Attached Preview" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAttachedFile(idx);
                                }}
                                className="h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer shadow"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                              {media.type}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="border-border/60" />

                  {/* Teaser free media (Conditionally visible if isPremium) */}
                  {isPremium ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex justify-between items-center select-none">
                        <div>
                          <h3 className="text-xs font-black text-text-main flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-accent">visibility</span>
                            <span>Free Teaser Preview (Recommended)</span>
                          </h3>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            Subscribers/fans will view this teaser for free before paying the ₹{price} price.
                          </p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => openVaultPicker("teaser")}
                          className="text-[10px] font-black text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">folder_special</span>
                          <span>Pick from Vault</span>
                        </button>
                      </div>

                      {teaserPreview ? (
                        <div className="relative border border-border rounded-xl overflow-hidden bg-background aspect-video max-w-sm mx-auto flex items-center justify-center">
                          {teaserType === "video" ? (
                            <VideoPlayer src={teaserPreview} className="w-full h-full object-cover" />
                          ) : (
                            <img src={teaserPreview} alt="Teaser Preview" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-2 right-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={handleRemoveTeaser}
                              className="h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer shadow"
                              title="Remove Teaser"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-success text-white text-[9px] font-black px-2 py-0.5 rounded-full select-none shadow">
                            FREE TEASER PREVIEW
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => teaserInputRef.current?.click()}
                          className="border-2 border-dashed border-accent/20 hover:border-accent/40 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-background/10 hover:bg-background/25 transition-all select-none"
                        >
                          <span className="material-symbols-outlined text-[24px] text-accent">add_photo_alternate</span>
                          <p className="text-xs font-bold text-text-main text-center">Add Teaser Photo or Video</p>
                          <p className="text-[9px] text-text-muted text-center max-w-[280px]">
                            If omitted, fans will only see a blurred lock screen overlay with no media previews.
                          </p>
                        </div>
                      )}
                      <input
                        ref={teaserInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleTeaserSelect}
                      />
                    </div>
                  ) : (
                    <div className="p-4 bg-background/30 rounded-2xl border border-border/80 flex items-start gap-3 select-none">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
                      <div>
                        <p className="text-xs font-bold text-text-main">Public Feed Post (Free)</p>
                        <p className="text-[10px] text-text-muted leading-relaxed mt-0.5">
                          Since PPV lock is disabled in Step 1, all your followers will be able to see the full post content and media instantly upon release.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* STEP 3: POLLS, SCHEDULING, AND SIMULATOR REVIEW */}
              {step === 3 && (
                <div className="p-5 md:p-6 space-y-6 flex-grow">
                  
                  {/* Grid for settings (Poll & schedule) and Live Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    
                    {/* Columns 1-2: Additions panels */}
                    <div className="lg:col-span-2 space-y-5">
                      
                      {/* Poll Block */}
                      <div className="bg-background/40 border border-border/80 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="select-none">
                            <h3 className="text-xs font-black text-text-main flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">poll</span>
                              <span>Create Audience Poll</span>
                            </h3>
                            <p className="text-[10px] text-text-muted mt-0.5">Add interactive voting choices to engage fans.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHasPoll(!hasPoll)}
                            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-border"
                            style={hasPoll ? { backgroundColor: "var(--color-primary, #00aff0)" } : undefined}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                hasPoll ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {hasPoll && (
                          <div className="space-y-3 animate-fade-in">
                            <input
                              type="text"
                              required
                              placeholder="Poll question (e.g. Which costume next?)"
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold outline-none focus:border-primary text-text-main"
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
                                    className="flex-grow px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-medium outline-none focus:border-primary text-text-main"
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
                                className="text-[10px] font-black text-primary hover:underline flex items-center gap-0.5 select-none cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px] font-bold">add</span>
                                <span>Add Choice option</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Scheduling Block */}
                      <div className="bg-background/40 border border-border/80 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="select-none">
                            <h3 className="text-xs font-black text-text-main flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                              <span>Schedule Release</span>
                            </h3>
                            <p className="text-[10px] text-text-muted mt-0.5">Automate publishing at a future date and time.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsScheduled(!isScheduled)}
                            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-border"
                            style={isScheduled ? { backgroundColor: "var(--color-primary, #00aff0)" } : undefined}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isScheduled ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {isScheduled && (
                          <div className="space-y-2 animate-fade-in">
                            <input
                              type="datetime-local"
                              required
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              min={minScheduleDate}
                              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs font-bold outline-none text-text-main"
                            />
                            <p className="text-[9px] text-text-muted select-none">
                              Note: Scheduled posts are hidden from fan feeds until the release time arrives.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Columns 3-5: Live Feed Simulator */}
                    <div className="lg:col-span-3 space-y-4">
                      
                      <div className="flex justify-between items-center select-none">
                        <p className="text-[10px] text-text-muted font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-primary animate-pulse">preview</span>
                          <span>Live Feed Simulator (Preview)</span>
                        </p>
                        
                        {isPremium && (
                          <div className="flex bg-background border border-border rounded-full p-0.5">
                            <button
                              type="button"
                              onClick={() => setSimulatorView("locked")}
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all cursor-pointer ${
                                simulatorView === "locked"
                                  ? "bg-accent text-white"
                                  : "text-text-muted hover:text-text-main"
                              }`}
                            >
                              Locked View
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimulatorView("unlocked")}
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all cursor-pointer ${
                                simulatorView === "unlocked"
                                  ? "bg-success text-white"
                                  : "text-text-muted hover:text-text-main"
                              }`}
                            >
                              Unlocked View
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Mock PostCard Container */}
                      <div className="border border-border/80 bg-surface rounded-3xl p-4 md:p-5 space-y-4 shadow-sm select-none">
                        
                        {/* Stepper indicators inside Card for scheduler */}
                        {isScheduled && scheduleDate && (
                          <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            <span>Scheduled for {new Date(scheduleDate).toLocaleString()}</span>
                          </div>
                        )}

                        {/* Profile Header */}
                        <div className="flex items-center gap-3">
                          <img
                            src={user?.avatar || "/default-avatar.png"}
                            alt="Creator Avatar"
                            className="h-10 w-10 rounded-full object-cover border border-border"
                          />
                          <div>
                            <div className="flex items-center gap-0.5">
                              <p className="text-xs font-black text-text-main leading-none">{user?.displayName}</p>
                              <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            </div>
                            <p className="text-[10px] text-text-muted mt-0.5">@{user?.username} • Just now</p>
                          </div>
                        </div>

                        {/* Caption Text */}
                        <div>
                          <p className="text-xs leading-relaxed text-text-main font-medium whitespace-pre-wrap">
                            {content}
                          </p>
                          {tags.trim() && (
                            <p className="text-xs text-primary font-bold mt-2">
                              {tags
                                .split(",")
                                .map((t) => `#${t.trim()}`)
                                .join(" ")}
                            </p>
                          )}
                        </div>

                        {/* Interactive Poll inside Simulator */}
                        {hasPoll && pollQuestion.trim() && (
                          <div className="border border-border rounded-2xl p-4 space-y-2.5 bg-background/20">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{pollQuestion}</p>
                            <div className="space-y-1.5">
                              {pollOptions
                                .filter((opt) => opt.trim() !== "")
                                .map((opt, idx) => (
                                  <div
                                    key={idx}
                                    className="w-full border border-border px-3.5 py-2 rounded-xl text-xs font-semibold text-text-main bg-surface flex justify-between items-center"
                                  >
                                    <span>{opt}</span>
                                    <span className="text-[10px] font-black text-text-muted">0%</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Fundraiser inside Simulator */}
                        {hasFundraiser && fundraiserTitle.trim() && (
                          <div className="border border-border rounded-2xl p-4 space-y-2 bg-background/20">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-black text-text-muted uppercase tracking-wider">Fundraiser: {fundraiserTitle}</span>
                              <span className="font-black text-primary">₹0 / ₹{fundraiserGoal}</span>
                            </div>
                            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: "0%" }} />
                            </div>
                          </div>
                        )}

                        {/* Media Zone Simulator */}
                        <div className="relative rounded-2xl overflow-hidden border border-border bg-background aspect-video flex items-center justify-center select-none">
                          
                          {/* Case A: Locked View (PPV active and subscriber hasn't paid) */}
                          {isPremium && simulatorView === "locked" ? (
                            <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-5">
                              
                              {/* Background Blurred teaser or fallback */}
                              {teaserPreview ? (
                                <img
                                  src={teaserPreview}
                                  alt="Blurred Preview Backdrop"
                                  className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-30 pointer-events-none scale-105"
                                />
                              ) : attachedFiles[0] ? (
                                <img
                                  src={attachedFiles[0].preview}
                                  alt="Blurred Backdrop"
                                  className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-20 pointer-events-none scale-105"
                                />
                              ) : null}
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

                              {/* Watermark security overlay */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-10">
                                <span className="text-[14px] font-black uppercase tracking-widest text-white transform -rotate-12 whitespace-nowrap">
                                  feebic.in/@{user?.username}
                                </span>
                              </div>

                              <div className="relative z-10 flex flex-col items-center gap-3 p-2">
                                <span className="material-symbols-outlined text-[24px] text-white">lock</span>
                                <h4 className="text-xs font-black text-white">Premium Content Locked</h4>
                                
                                {teaserPreview ? (
                                  <div className="border border-white/20 rounded-xl overflow-hidden w-40 aspect-video shadow-md relative bg-black">
                                    {teaserType === "video" ? (
                                      <VideoPlayer src={teaserPreview} className="w-full h-full object-cover" />
                                    ) : (
                                      <img src={teaserPreview} alt="Teaser Small" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute bottom-1 left-1.5 bg-success text-white text-[7px] font-black px-1.5 py-0.5 rounded">
                                      FREE TEASER
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[9px] text-white/80 max-w-[220px] leading-relaxed">
                                    Unlock this post to access {attachedFiles.length || 1} exclusive file(s).
                                  </p>
                                )}

                                <button
                                  type="button"
                                  className="bg-primary text-white text-[10px] font-black uppercase tracking-wider px-5 py-2 rounded-full cursor-not-allowed flex items-center gap-1.5 shadow-sm mt-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">lock_open</span>
                                  <span>Unlock for ₹{price}</span>
                                </button>
                              </div>

                            </div>
                          ) : (
                            /* Case B: Unlocked View or non-PPV post */
                            <div className="w-full h-full relative">
                              {attachedFiles.length > 0 ? (
                                <div className="w-full h-full relative bg-black">
                                  {attachedFiles[0].type === "video" ? (
                                    <VideoPlayer src={attachedFiles[0].preview} className="w-full h-full object-contain" />
                                  ) : attachedFiles[0].type === "audio" ? (
                                    <div className="h-full w-full flex flex-col items-center justify-center bg-background/50 p-4 text-center">
                                      <span className="material-symbols-outlined text-primary text-[36px] animate-bounce">volume_up</span>
                                      <p className="text-xs font-black text-text-main mt-2">Audio track preview</p>
                                      <p className="text-[10px] text-text-muted">{attachedFiles[0].name}</p>
                                    </div>
                                  ) : (
                                    <img
                                      src={attachedFiles[0].preview}
                                      alt="Main file"
                                      className="w-full h-full object-cover"
                                    />
                                  )}

                                  {attachedFiles.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[8px] font-black px-2 py-0.5 rounded-full select-none shadow">
                                      1/{attachedFiles.length}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center p-8 select-none">
                                  <span className="material-symbols-outlined text-text-muted text-[32px]">text_fields</span>
                                  <p className="text-xs font-bold text-text-muted mt-1">Text-only post layout</p>
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Likes Comments Action Bar Mock */}
                        <div className="flex gap-4 border-t border-border/50 pt-3 text-text-muted text-[10px] font-bold select-none px-1">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">favorite</span>
                            <span>0</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                            <span>0</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">ios_share</span>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* Bottom Wizard Navigation Control Toolbar */}
              <div className="p-4 border-t border-border bg-surface/80 flex items-center justify-between select-none mt-auto">
                <div>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isPublishing}
                      className="px-5 py-2.5 border border-border hover:border-text-muted rounded-full text-xs font-black text-text-main transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Back</span>
                    </button>
                  )}
                </div>

                <div>
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-full transition-all shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next Step</span>
                      <span className="material-symbols-outlined text-[16px] font-black">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className={`bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-black uppercase tracking-wider px-7 py-2.5 rounded-full transition-all shadow flex items-center gap-1.5 ${
                        isPublishing ? "cursor-wait opacity-70" : "cursor-pointer"
                      }`}
                    >
                      <span>{isPublishing ? "Publishing..." : isScheduled ? "Schedule Release" : "Publish Now"}</span>
                      <span className="material-symbols-outlined text-[16px] font-black">
                        {isPublishing ? "hourglass_empty" : "send"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Vault Selector Modal */}
        <Modal isOpen={isVaultOpen} onClose={() => setIsVaultOpen(false)} title={`Attach to ${vaultTarget === "main" ? "Primary Media" : "Teaser Preview"}`}>
          <div className="max-h-[340px] overflow-y-auto pr-1 no-scrollbar space-y-2 select-none pt-1">
            {vaultItems.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">Your Creator Vault is currently empty.</p>
            ) : (
              vaultItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectVaultItem(item)}
                  className="w-full p-3 bg-background border border-border hover:border-primary rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer active:scale-[0.98]"
                >
                  {item.type === "video" ? (
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">videocam</span>
                  ) : item.type === "audio" ? (
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">audiotrack</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">image</span>
                  )}
                  
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-bold text-text-main truncate leading-none mb-1">{item.name}</p>
                    <p className="text-[9px] text-text-muted leading-none">{item.size} • {item.date}</p>
                  </div>
                  
                  <span className="material-symbols-outlined text-[16px] text-text-muted">add_circle</span>
                </button>
              ))
            )}
          </div>
        </Modal>

      </AppShell>
    </RoleGuard>
  );
}
