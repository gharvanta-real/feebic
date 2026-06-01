"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RightPanel } from "@/components/layout/RightPanel";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { StorySlider } from "@/components/features/StorySlider";
import { PostCard } from "@/components/features/PostCard";
import { mockDb, Post } from "@/lib/mockDb";
import { useUser } from "@/context/UserContext";
import { Modal } from "@/components/ui/Modal";

export default function HomeFeedPage() {
  const { subscriptions, refreshUserProfile } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"For You" | "Following" | "Subscription" | "Trending">("For You");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Custom Filter & Sort States (Tune modal settings)
  const [filterType, setFilterType] = useState<"all" | "photos" | "videos" | "polls" | "fundraisers">("all");
  const [sortBy, setSortBy] = useState<"newest" | "likes" | "comments">("newest");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const activeFilterLabel = filterType === "all" && sortBy === "newest"
    ? "Default"
    : `${filterType === "all" ? "All" : filterType} • ${sortBy}`;

  const fetchFeedPosts = () => {
    const allPosts = mockDb.getPosts();
    const blocked = mockDb.getBlockedUsers();
    
    // Filter out blocked creators
    let filtered = allPosts.filter((p) => !blocked.includes(p.creatorUsername));

    // Handle search filtering if active
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.creatorName.toLowerCase().includes(q) ||
          p.creatorUsername.toLowerCase().includes(q)
      );
    }

    // Handle sub-tab filtering
    if (activeTab === "Following") {
      filtered = filtered.filter((p) => subscriptions.includes(p.creatorUsername));
    } else if (activeTab === "Subscription") {
      filtered = filtered.filter((p) => p.isPremium);
    } else if (activeTab === "Trending") {
      // Sort by likes descending
      filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    }

    // Custom Category/Type filtering (via tune modal)
    if (filterType === "photos") {
      filtered = filtered.filter(p => p.mediaType === "image");
    } else if (filterType === "videos") {
      filtered = filtered.filter(p => p.mediaType === "video");
    } else if (filterType === "polls") {
      filtered = filtered.filter(p => p.poll !== null && p.poll !== undefined);
    } else if (filterType === "fundraisers") {
      filtered = filtered.filter(p => p.fundraiser !== null && p.fundraiser !== undefined);
    }

    // Custom Sorting (via tune modal)
    if (sortBy === "likes") {
      filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    } else if (sortBy === "comments") {
      filtered = [...filtered].sort((a, b) => b.commentsCount - a.commentsCount);
    }

    setPosts(filtered);
  };

  useEffect(() => {
    refreshUserProfile();
    setTimeout(() => {
      fetchFeedPosts();
    }, 0);

    const handlePostsUpdate = () => fetchFeedPosts();
    window.addEventListener("ch_posts_updated", handlePostsUpdate);
    window.addEventListener("ch_blocked_users_updated", handlePostsUpdate);

    return () => {
      window.removeEventListener("ch_posts_updated", handlePostsUpdate);
      window.removeEventListener("ch_blocked_users_updated", handlePostsUpdate);
    };
  }, [activeTab, subscriptions, searchQuery, filterType, sortBy]);

  return (
    <AppShell>
      {/* 1. Mobile Header with balance badge */}
      <MobileHeader>
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold select-none">
          <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
          <span>${mockDb.getWalletBalance().toFixed(2)}</span>
        </div>
      </MobileHeader>

      {/* 2. Main Two-Column Layout Grid */}
      <div className="mx-auto flex min-h-screen w-full max-w-[1240px] justify-center gap-6 bg-background px-4 md:px-6">
        {/* Core Feed Column */}
        <div className="w-full max-w-[780px] min-h-screen space-y-5 max-md:mt-14 shrink-0 pb-8">
          
          {/* Header Row */}
          <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 pt-4 pb-3 bg-background/95 backdrop-blur-md border-b border-border/60 select-none">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[24px] font-black text-text-main font-sans tracking-tight leading-none">
                  Home
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-text-muted">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{posts.length} posts</span>
                  <span className="rounded-full bg-surface border border-border px-2.5 py-1">{activeFilterLabel}</span>
                </div>
              </div>
            
              {/* Header Icons */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setShowSearchModal(!showSearchModal)}
                  className={`grid h-9 w-9 place-items-center rounded-full transition-all cursor-pointer ${
                    showSearchModal || searchQuery
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:text-primary hover:bg-primary/5"
                  }`}
                  title="Search posts"
                >
                  <span className="material-symbols-outlined text-[22px]">search</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stories Slider container */}
          <StorySlider />

          {/* Category Tabs sub-navigation bar (100% Screenshot replica) */}
          <div className="flex items-center justify-between border-b border-border/60 pb-0 select-none">
            <div className="flex flex-1 gap-7 overflow-x-auto no-scrollbar">
              {(["For You", "Following", "Subscription", "Trending"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 pb-3.5 text-[14px] font-extrabold cursor-pointer transition-all leading-none whitespace-nowrap ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-text-muted hover:text-text-main"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowFilterModal(true)}
              className={`ml-2 shrink-0 pb-3.5 transition-colors cursor-pointer ${filterType !== "all" || sortBy !== "newest" ? "text-primary" : "text-text-muted hover:text-text-main"}`}
              title="Feed Filters"
            >
              <span className="material-symbols-outlined text-[19px]">tune</span>
            </button>
          </div>

          {/* Posts Feed Grid */}
          <div className="space-y-5 pt-1">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-surface py-20 text-center space-y-3">
                <span className="material-symbols-outlined text-[54px] text-text-muted">feed</span>
                <h3 className="text-base font-extrabold text-text-main">No posts found</h3>
                <p className="text-xs text-text-muted max-w-[280px]">
                  Explore other categories or change your search filter to populate your feed!
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostUpdate={fetchFeedPosts}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel Sidebar (Hidden on mobile) */}
        <RightPanel />
      </div>
      <Modal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} title="Search Posts">
        <div className="space-y-4 select-none">
          <div className="flex items-center rounded-2xl border border-primary/20 bg-background px-4 py-3">
            <span className="material-symbols-outlined mr-3 text-[19px] text-primary">search</span>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-text-main outline-none placeholder-text-muted"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="material-symbols-outlined ml-2 cursor-pointer text-[16px] text-text-muted hover:text-text-main"
                title="Clear search"
              >
                close
              </button>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchModal(false);
              }}
              className="rounded-full px-4.5 py-2 text-xs font-bold text-text-muted transition-colors hover:text-text-main cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => setShowSearchModal(false)}
              className="rounded-full bg-primary px-6 py-2 text-xs font-black text-white transition-all hover:opacity-95 cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>
      </Modal>
      {/* Feed Filter & Sort Options Drawer Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Feed Display Settings">
        <div className="space-y-5 select-none pt-1">
          
          {/* Content Type Filter */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">Filter Content Type</label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: "All Posts" },
                { key: "photos", label: "Photos" },
                { key: "videos", label: "Videos" },
                { key: "polls", label: "Polls" },
                { key: "fundraisers", label: "Fundraisers" }
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilterType(opt.key)}
                  className={`px-4.5 py-2 rounded-full text-xs font-black transition-all border active:scale-95 cursor-pointer ${
                    filterType === opt.key
                      ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                      : "bg-surface border-border text-text-muted hover:border-text-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sorting Option */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">Sort Feed By</label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "newest", label: "Newest First" },
                { key: "likes", label: "Most Liked" },
                { key: "comments", label: "Most Commented" }
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-4.5 py-2 rounded-full text-xs font-black transition-all border active:scale-95 cursor-pointer ${
                    sortBy === opt.key
                      ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                      : "bg-surface border-border text-text-muted hover:border-text-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button
              onClick={() => {
                setFilterType("all");
                setSortBy("newest");
                setShowFilterModal(false);
              }}
              className="px-4.5 py-2 bg-transparent text-text-muted hover:text-text-main text-xs font-bold rounded-full transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setShowFilterModal(false)}
              className="px-6 py-2 bg-primary text-white hover:opacity-95 text-xs font-black rounded-full transition-all cursor-pointer shadow-md"
            >
              Apply Settings
            </button>
          </div>

        </div>
      </Modal>
    </AppShell>
  );
}
