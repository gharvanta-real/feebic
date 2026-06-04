"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/admin/Badge";
import { ConfirmModal, PrimaryBtn } from "@/components/admin/controls";
import { adminContentApi, FlaggedPost } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function ContentModerationPage() {
  const { showToast } = useAdminAuth();
  const [posts, setPosts] = useState<FlaggedPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [activeTab, setActiveTab] = useState<"all" | "image" | "video" | "text" | "high_risk">("all");
  const [sortBy, setSortBy] = useState<"ai_score" | "date">("ai_score");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Confirmation Modal state
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    decision: string;
    label: string;
  } | null>(null);
  const [actioning, setActioning] = useState(false);

  // Bulk action confirmation state
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulking, setBulking] = useState(false);

  const fetchFlaggedContent = async () => {
    setLoading(true);
    try {
      const data = await adminContentApi.getFlagged();
      setPosts(data || []);
    } catch {
      showToast("Failed to load moderation queue", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlaggedContent();
  }, []);

  // Compute Moderation Queue Stats
  const stats = useMemo(() => {
    const total = posts.length;
    const pending = posts.filter((p) => p.decision === "pending" || !p.decision).length;
    const highRisk = posts.filter((p) => p.aiScore > 80).length;
    return { total, pending, highRisk };
  }, [posts]);

  // Filtered & Sorted Queue
  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts];

    // Filter
    if (activeTab === "image") {
      result = result.filter((p) => p.mediaType === "image");
    } else if (activeTab === "video") {
      result = result.filter((p) => p.mediaType === "video");
    } else if (activeTab === "text") {
      result = result.filter((p) => p.mediaType === "text");
    } else if (activeTab === "high_risk") {
      result = result.filter((p) => p.aiScore > 80);
    }

    // Sort
    if (sortBy === "ai_score") {
      result.sort((a, b) => b.aiScore - a.aiScore);
    } else if (sortBy === "date") {
      result.sort((a, b) => b.id.localeCompare(a.id)); // Using ID as timestamp proxy
    }

    return result;
  }, [posts, activeTab, sortBy]);

  // Apply Action to Post
  const handleModerateSubmit = async () => {
    if (!confirmAction) return;
    setActioning(true);
    try {
      await adminContentApi.moderate(confirmAction.id, confirmAction.decision);
      showToast(`Content action set to: ${confirmAction.label}`);
      setPosts((prev) => prev.filter((p) => p.id !== confirmAction.id));
      setSelectedIds((prev) => prev.filter((id) => id !== confirmAction.id));
      setConfirmAction(null);
    } catch {
      showToast("Failed to record content decision", "error");
    } finally {
      setActioning(false);
    }
  };

  // Bulk Action Apply
  const handleBulkSubmit = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setBulking(true);
    try {
      await Promise.all(selectedIds.map((id) => adminContentApi.moderate(id, bulkAction)));
      showToast(`Moderated ${selectedIds.length} posts with action: ${bulkAction}`);
      setPosts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      setBulkAction(null);
    } catch {
      showToast("Failed to complete bulk operations", "error");
    } finally {
      setBulking(false);
    }
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    const listIds = filteredAndSortedPosts.map((p) => p.id);
    const allSelected = listIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !listIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...listIds])]);
    }
  };

  const isAllSelected = useMemo(() => {
    if (filteredAndSortedPosts.length === 0) return false;
    return filteredAndSortedPosts.every((p) => selectedIds.includes(p.id));
  }, [filteredAndSortedPosts, selectedIds]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Moderation Hub"
        sub="Audit user-generated posts flagged by automated platform filters or user reports. Validate AI scores and take swift enforcement action."
        actions={
          <button
            onClick={fetchFlaggedContent}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 rounded-full transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh Queue
          </button>
        }
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[var(--color-text-muted)] tracking-wider">Total Reports</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.total}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-cyan-600 dark:text-cyan-400">inventory_2</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[var(--color-text-muted)] tracking-wider">Awaiting Review</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.pending}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-amber-700 dark:text-amber-400">hourglass_empty</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[var(--color-text-muted)] tracking-wider">Critical High Risk</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.highRisk}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-red-600 dark:text-red-400">error</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Tabs */}
        <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-full p-1 self-start md:self-auto">
          {(["all", "image", "video", "text", "high_risk"] as const).map((tab) => {
            const labels = {
              all: "All Queue",
              image: "Images",
              video: "Videos",
              text: "Text Excerpts",
              high_risk: "High AI Risk",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider transition cursor-pointer ${
                  activeTab === tab
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--border)]/15 hover:text-[var(--color-text-main)]"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Sort & Bulk Control */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 text-xs font-semibold text-[var(--color-text-main)] outline-none cursor-pointer"
          >
            <option value="ai_score" className="bg-[var(--surface)] text-[var(--color-text-main)]">Sort by AI Threat Score</option>
            <option value="date" className="bg-[var(--surface)] text-[var(--color-text-main)]">Sort by Incident Date</option>
          </select>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-1 text-xs text-[var(--color-text-main)]">
              <span className="font-bold text-[var(--color-primary)]">{selectedIds.length} Selected</span>
              <button
                onClick={() => setBulkAction("approved")}
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black tracking-wider px-2 py-1 rounded hover:bg-emerald-500/30 cursor-pointer"
              >
                Approve
              </button>
              <button
                onClick={() => setBulkAction("hidden")}
                className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-black tracking-wider px-2 py-1 rounded hover:bg-red-500/30 cursor-pointer"
              >
                Hide
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Queue Cards */}
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : filteredAndSortedPosts.length === 0 ? (
        <EmptyState icon="policy" message="Moderation queue is empty" sub="All user-reported content has been audited." />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAllToggle}
              className="h-4 w-4 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--color-primary)] outline-none focus:ring-0 cursor-pointer"
            />
            <span className="text-[10px] font-black tracking-widest text-[var(--color-text-muted)] select-none">
              Select all items on this page
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredAndSortedPosts.map((post) => {
              const selected = selectedIds.includes(post.id);
              let scoreColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
              if (post.aiScore > 80) scoreColor = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
              else if (post.aiScore > 50) scoreColor = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";

              return (
                <div
                  key={post.id}
                  className={`bg-[var(--surface)] border rounded-2xl p-5 transition flex flex-col gap-4 relative overflow-hidden ${
                    selected ? "border-[var(--color-primary)] bg-[var(--color-primary)]/[0.02]" : "border-[var(--border)]"
                  }`}
                >
                  {/* Select Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleSelectToggle(post.id)}
                    className="absolute top-5 right-5 h-4.5 w-4.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--color-primary)] focus:ring-0 cursor-pointer z-10"
                  />

                  {/* Creator Info */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 text-[var(--color-primary)] font-black text-sm">
                      {post.creatorUsername[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--color-text-main)] leading-none">@{post.creatorUsername}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                        Reported by: <span className="font-mono text-[var(--color-text-main)] font-semibold">@{post.reportedBy}</span>
                      </p>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-3.5 min-h-[96px] flex flex-col justify-center">
                    {post.mediaType === "image" ? (
                      <div className="flex gap-4">
                        <img
                          src={post.mediaUrl}
                          alt="Reported content"
                          className="h-16 w-16 object-cover rounded-lg border border-[var(--border)] shrink-0 bg-[var(--surface)]"
                        />
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed italic">{post.content || "Image post (no text content)"}</p>
                      </div>
                    ) : post.mediaType === "video" ? (
                      <div className="flex gap-4">
                        <div className="h-16 w-16 rounded-lg border border-[var(--border)] shrink-0 bg-[var(--surface)] flex items-center justify-center relative">
                          <span className="material-symbols-outlined text-[20px] text-[var(--color-text-main)]">play_circle</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed italic">{post.content || "Video post (no description)"}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--color-text-main)] leading-relaxed font-medium">{post.content}</p>
                    )}
                  </div>

                  {/* Report details & AI gauges */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Report Category Reason</p>
                      <p className="font-bold text-[var(--color-text-main)] mt-1 capitalize leading-snug">{post.reason.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">AI Automated Threat Score</p>
                      <span className={`inline-flex font-black text-[10px] tracking-wider border rounded-full px-2 py-0.5 mt-1 ${scoreColor}`}>
                        {post.aiScore}% Risk
                      </span>
                    </div>
                  </div>

                  {/* AI breakdowns progress bars */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">AI Categorical Assessment Breakdown</p>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <div className="flex justify-between text-[9px] font-semibold mb-0.5 text-[var(--color-text-muted)]">
                          <span>Nudity / Explicit</span>
                          <span className="text-[var(--color-text-main)] font-bold">{post.aiBreakdown.nudity}%</span>
                        </div>
                        <div className="h-1 bg-[var(--border)]/30 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400" style={{ width: `${post.aiBreakdown.nudity}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] font-semibold mb-0.5 text-[var(--color-text-muted)]">
                          <span>Violence / Gore</span>
                          <span className="text-[var(--color-text-main)] font-bold">{post.aiBreakdown.violence}%</span>
                        </div>
                        <div className="h-1 bg-[var(--border)]/30 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-400" style={{ width: `${post.aiBreakdown.violence}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] font-semibold mb-0.5 text-[var(--color-text-muted)]">
                          <span>Spam / Malicious</span>
                          <span className="text-[var(--color-text-main)] font-bold">{post.aiBreakdown.spam}%</span>
                        </div>
                        <div className="h-1 bg-[var(--border)]/30 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${post.aiBreakdown.spam}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] font-semibold mb-0.5 text-[var(--color-text-muted)]">
                          <span>Copyright Infringement</span>
                          <span className="text-[var(--color-text-main)] font-bold">{post.aiBreakdown.copyright}%</span>
                        </div>
                        <div className="h-1 bg-[var(--border)]/30 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400" style={{ width: `${post.aiBreakdown.copyright}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-5 gap-2 border-t border-[var(--border)]/50 pt-4 mt-1">
                    <button
                      onClick={() => setConfirmAction({ id: post.id, decision: "approved", label: "Approve Content" })}
                      className="h-8 rounded-lg text-[9px] font-black tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: post.id, decision: "age_gate", label: "Apply Age-gate Restrict" })}
                      className="h-8 rounded-lg text-[9px] font-black tracking-wider bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/20 transition cursor-pointer"
                    >
                      Age Gate
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: post.id, decision: "shadowbanned", label: "Shadowban Creator Post" })}
                      className="h-8 rounded-lg text-[9px] font-black tracking-wider bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 transition cursor-pointer"
                    >
                      Shadow
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: post.id, decision: "hidden", label: "Hide Content Post" })}
                      className="h-8 rounded-lg text-[9px] font-black tracking-wider bg-[var(--surface)] hover:bg-[var(--border)]/15 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--border)] transition cursor-pointer"
                    >
                      Hide
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: post.id, decision: "deleted", label: "Purge & Delete Post" })}
                      className="h-8 rounded-lg text-[9px] font-black tracking-wider bg-red-500/10 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/20 transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ConfirmModal: Single post action */}
      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleModerateSubmit}
        loading={actioning}
        title="Confirm Moderation Decision"
        message={`Are you sure you want to apply the decision: "${confirmAction?.label}" to this flagged post? This action takes effect immediately and updates database records.`}
        confirmLabel={confirmAction?.label || "Apply Decision"}
        confirmVariant={confirmAction?.decision === "deleted" || confirmAction?.decision === "hidden" ? "danger" : "primary"}
      />

      {/* ConfirmModal: Bulk action */}
      <ConfirmModal
        open={!!bulkAction}
        onClose={() => setBulkAction(null)}
        onConfirm={handleBulkSubmit}
        loading={bulking}
        title="Confirm Bulk Moderation"
        message={`Are you sure you want to apply the decision "${bulkAction}" to all ${selectedIds.length} selected flagged posts in bulk?`}
        confirmLabel="Apply Bulk Decisions"
        confirmVariant={bulkAction === "hidden" ? "danger" : "primary"}
      />
    </div>
  );
}
