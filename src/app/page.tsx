"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RightPanel } from "@/components/layout/RightPanel";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { StorySlider } from "@/components/features/StorySlider";
import { PostCard } from "@/components/features/PostCard";
import type { Post, Creator } from "@/lib/mockDb";
import { useUser } from "@/context/UserContext";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

type BackendPost = Partial<Post> & {
  creator_username?: string;
  creator_name?: string;
  creator_avatar?: string;
  media_url?: string;
  media_urls?: string[];
  media_type?: string;
  is_premium?: boolean;
  comments_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_unlocked?: boolean;
  reposted_from_id?: string | null;
  reposted_by?: string | null;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isUnlocked?: boolean;
  created_at?: string;
};

const FEED_PAGE_SIZE = 10;

const normalizePost = (post: BackendPost, index: number): Post => {
  const mediaUrls = post.mediaUrls || post.media_urls || [];
  const createdAt = post.created_at ? new Date(post.created_at) : null;

  return {
    id: post.id || `post-fallback-${index}`,
    creatorUsername: post.creatorUsername || post.creator_username || "",
    creatorName: post.creatorName || post.creator_name || "Felbic Creator",
    creatorAvatar: post.creatorAvatar || post.creator_avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
    isPinned: post.isPinned || false,
    mediaUrl: post.mediaUrl || post.media_url || mediaUrls[0] || "",
    mediaUrls,
    mediaType: post.mediaType || post.media_type || "image",
    content: post.content || "",
    likes: post.likes || 0,
    commentsCount: post.commentsCount || post.comments_count || 0,
    time: post.time || (createdAt ? createdAt.toLocaleDateString() : "Just now"),
    isPremium: post.isPremium || post.is_premium || false,
    price: post.price || 0,
    poll: post.poll || null,
    fundraiser: post.fundraiser || null,
    publishAt: post.publishAt || null,
    repostedFromId: post.repostedFromId || post.reposted_from_id || null,
    repostedBy: post.repostedBy || post.reposted_by || null,
    isLiked: post.isLiked || post.is_liked || false,
    isBookmarked: post.isBookmarked || post.is_bookmarked || false,
    isUnlocked: post.isUnlocked || post.is_unlocked || false,
  } as Post;
};

interface SearchCreator {
  name: string;
  username: string;
  avatar: string;
  fansCount: string;
}

interface BackendCreator {
  id?: string;
  name?: string;
  display_name?: string;
  displayName?: string;
  username: string;
  avatar?: string;
  fans_count?: number;
}

export default function HomeFeedPage() {
  const { subscriptions, walletBalance, user } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const feedPageRef = useRef(1);

  const [activeTab, setActiveTab] = useState<"For You" | "Following" | "Subscription" | "Trending">("For You");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Search Revamp States
  const [searchTab, setSearchTab] = useState<"all" | "accounts" | "posts" | "videos">("all");
  const [allCreators, setAllCreators] = useState<SearchCreator[]>([]);
  const [allSearchPosts, setAllSearchPosts] = useState<Post[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Custom Filter & Sort States (Tune modal settings)
  const [filterType, setFilterType] = useState<"all" | "photos" | "videos" | "polls" | "fundraisers">("all");
  const [sortBy, setSortBy] = useState<"newest" | "likes" | "comments">("newest");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const activeFilterLabel = filterType === "all" && sortBy === "newest"
    ? "Default"
    : `${filterType === "all" ? "All" : filterType} • ${sortBy}`;

  const applyFeedFilters = useCallback((inputPosts: Post[]) => {
    let filtered = inputPosts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.creatorName.toLowerCase().includes(q) ||
          p.creatorUsername.toLowerCase().includes(q)
      );
    }

    if (activeTab === "Following") {
      filtered = filtered.filter((p) => subscriptions.includes(p.creatorUsername));
    } else if (activeTab === "Subscription") {
      filtered = filtered.filter((p) => p.isPremium);
    } else if (activeTab === "Trending") {
      filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    }

    if (filterType === "photos") {
      filtered = filtered.filter(p => p.mediaType === "image");
    } else if (filterType === "videos") {
      filtered = filtered.filter(p => p.mediaType === "video");
    } else if (filterType === "polls") {
      filtered = filtered.filter(p => p.poll !== null && p.poll !== undefined);
    } else if (filterType === "fundraisers") {
      filtered = filtered.filter(p => p.fundraiser !== null && p.fundraiser !== undefined);
    }

    if (sortBy === "likes") {
      filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    } else if (sortBy === "comments") {
      filtered = [...filtered].sort((a, b) => b.commentsCount - a.commentsCount);
    }

    return filtered;
  }, [activeTab, filterType, searchQuery, sortBy, subscriptions]);

  const fetchFeedPosts = useCallback(async (reset = true) => {
    if (reset) {
      feedPageRef.current = 1;
      setIsFeedLoading(true);
      setFeedError(null);
      setHasMorePosts(true);
    } else {
      setIsLoadingMorePosts(true);
    }

    try {
      const targetPage = reset ? 1 : feedPageRef.current;
      const fetchedPosts = await apiClient.get<BackendPost[]>(`/posts?page=${targetPage}&limit=${FEED_PAGE_SIZE}`);
      const pagePosts = fetchedPosts.map((post, idx) => normalizePost(post, idx + (targetPage - 1) * FEED_PAGE_SIZE));
      const filteredPage = applyFeedFilters(pagePosts);

      setFeedError(null);
      setPosts((prev) => reset ? filteredPage : applyFeedFilters([...prev, ...filteredPage]));
      setHasMorePosts(fetchedPosts.length === FEED_PAGE_SIZE);
      feedPageRef.current = targetPage + 1;
    } catch (err) {
      if (reset) setPosts([]);
      setFeedError(err instanceof Error ? err.message : "Unable to load posts from the API.");
    } finally {
      setIsFeedLoading(false);
      setIsLoadingMorePosts(false);
    }
  }, [applyFeedFilters]);


  useEffect(() => {
    if (user) {
      setTimeout(() => {
        fetchFeedPosts(true);
      }, 0);
    }

    const handlePostsUpdate = () => {
      if (user) {
        fetchFeedPosts(true);
      }
    };
    window.addEventListener("ch_posts_updated", handlePostsUpdate);
    window.addEventListener("ch_blocked_users_updated", handlePostsUpdate);

    return () => {
      window.removeEventListener("ch_posts_updated", handlePostsUpdate);
      window.removeEventListener("ch_blocked_users_updated", handlePostsUpdate);
    };
  }, [user, fetchFeedPosts]);

  useEffect(() => {
    if (!user) return;

    const handleScroll = () => {
      const distanceFromBottom =
        document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (
        distanceFromBottom < 700 &&
        hasMorePosts &&
        !isFeedLoading &&
        !isLoadingMorePosts
      ) {
        fetchFeedPosts(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchFeedPosts, hasMorePosts, isFeedLoading, isLoadingMorePosts, user]);

  useEffect(() => {
    if (!showSearchModal) return;

    const fetchSearchData = async () => {
      setIsSearchLoading(true);
      try {
        const postsData = await apiClient.get<BackendPost[]>("/posts");
        const mappedPosts = postsData.map((post, idx) => normalizePost(post, idx));
        setAllSearchPosts(mappedPosts);

        const creatorsData = await apiClient.get<BackendCreator[]>("/users/creators");
        const mappedCreators = creatorsData.map((creator) => ({
          name: creator.display_name || creator.displayName || creator.name || "Felbic Creator",
          username: creator.username,
          avatar: creator.avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
          fansCount: `${creator.fans_count || 0} fans`,
        }));
        setAllCreators(mappedCreators);
      } catch (err) {
        console.error("Failed to fetch search metadata:", err);
      } finally {
        setIsSearchLoading(false);
      }
    };

    fetchSearchData();
  }, [showSearchModal]);

  return (
    <AppShell>
      {/* 1. Mobile Header with balance badge */}
      <MobileHeader>
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold select-none">
          <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
          <span>₹{walletBalance.toFixed(2)}</span>
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
                <h1 className="text-lg font-black text-text-main font-sans tracking-tight leading-none">
                  Home
                </h1>
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
                  className={`pb-3.5 text-[14px] font-extrabold cursor-pointer transition-all leading-none whitespace-nowrap tab-btn ${
                    activeTab === tab
                      ? "active text-primary"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  {tab} {activeTab === tab ? `(${posts.length})` : ""}
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
            {feedError ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-16 text-center space-y-3">
                <span className="material-symbols-outlined text-[54px] text-red-400">cloud_off</span>
                <h3 className="text-base font-extrabold text-text-main">Feed API unavailable</h3>
                <p className="max-w-[360px] text-xs font-medium text-text-muted">{feedError}</p>
                <button
                  onClick={() => fetchFeedPosts(true)}
                  className="rounded-full bg-primary px-5 py-2 text-xs font-black text-white"
                >
                  Retry
                </button>
              </div>
            ) : isFeedLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="animate-pulse rounded-2xl border border-border bg-surface p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-border" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 rounded bg-border" />
                      <div className="h-2.5 w-20 rounded bg-border" />
                    </div>
                  </div>
                  <div className="h-[300px] rounded-2xl bg-border" />
                  <div className="mt-4 h-3 w-56 rounded bg-border" />
                </div>
              ))
            ) : posts.length === 0 ? (
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
            {isLoadingMorePosts && (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel Sidebar (Hidden on mobile) */}
        <RightPanel />
      </div>
      <Modal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} title="Search Felbic" size="lg">
        <div className="space-y-4 select-none min-h-[480px] flex flex-col">
          {/* Search Input field */}
          <div className="flex items-center rounded-2xl border border-border/80 bg-background/60 px-4.5 py-3 shadow-inner">
            <span className="material-symbols-outlined mr-3 text-[19px] text-primary">search</span>
            <input
              type="text"
              placeholder="Search creators, posts, or videos..."
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

          {/* Search Tabs */}
          <div className="flex border-b border-border/60 text-xs">
            {(["all", "accounts", "posts", "videos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSearchTab(tab)}
                className={`flex-1 pb-2.5 pt-1 font-extrabold text-center cursor-pointer transition-all border-b-2 -mb-px capitalize ${
                  searchTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Results Container */}
          <div className="flex-1 min-h-[400px] max-h-[500px] overflow-y-auto pr-0.5 no-scrollbar space-y-3.5 pt-1">
            {isSearchLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !searchQuery.trim() ? (
              /* Empty State: Suggested Creators */
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider">Suggested Creators</h4>
                <div className="grid grid-cols-2 gap-3">
                  {allCreators.slice(0, 4).map((c) => (
                    <Link
                      key={c.username}
                      href={`/profile?u=${c.username}`}
                      onClick={() => setShowSearchModal(false)}
                      className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface-container/60 p-2.5 hover:border-primary/45 transition-all group animate-fade-in"
                    >
                      <img src={c.avatar} className="w-9 h-9 rounded-full object-cover border border-border group-hover:opacity-90" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-text-main truncate group-hover:text-primary transition-colors">{c.name}</p>
                        <p className="text-[10px] text-text-muted truncate mt-0.5">@{c.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (() => {
              const query = searchQuery.trim().toLowerCase();
              const matchedCreators = allCreators.filter(
                (c) => c.name.toLowerCase().includes(query) || c.username.toLowerCase().includes(query)
              );
              const matchedPosts = allSearchPosts.filter(
                (p) =>
                  p.content.toLowerCase().includes(query) ||
                  p.creatorName.toLowerCase().includes(query) ||
                  p.creatorUsername.toLowerCase().includes(query)
              );
              const matchedVideos = matchedPosts.filter((p) => p.mediaType === "video");

              const hasCreators = matchedCreators.length > 0;
              const hasPosts = matchedPosts.length > 0;
              const hasVideos = matchedVideos.length > 0;

              if (searchTab === "all" && !hasCreators && !hasPosts) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 animate-fade-in">
                    <span className="material-symbols-outlined text-[36px] text-text-muted">search_off</span>
                    <p className="text-xs font-black text-text-main">No results found for &quot;{searchQuery}&quot;</p>
                    <p className="text-[10.5px] text-text-muted max-w-[240px]">Try checking your spelling or search for another keyword.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 animate-fade-in">
                  {/* Creators Section */}
                  {(searchTab === "all" || searchTab === "accounts") && (
                    <div className="space-y-2">
                      {searchTab === "all" && hasCreators && (
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider">Creators</h4>
                      )}
                      {hasCreators ? (
                        <div className="space-y-2">
                          {(searchTab === "all" ? matchedCreators.slice(0, 3) : matchedCreators).map((creator) => (
                            <Link
                              key={creator.username}
                              href={`/profile?u=${creator.username}`}
                              onClick={() => setShowSearchModal(false)}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-border/50 bg-surface/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                  <img src={creator.avatar} className="w-10 h-10 rounded-full object-cover border border-border" />
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-surface rounded-full" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <p className="text-xs font-black text-text-main truncate leading-none group-hover:text-primary transition-colors">{creator.name}</p>
                                    <VerifiedBadge size="xs" />
                                  </div>
                                  <p className="text-[10px] text-text-muted mt-1 font-medium">@{creator.username}</p>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary transition-colors">chevron_right</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        searchTab === "accounts" && (
                          <p className="text-xs font-bold text-text-muted text-center py-6">No matching accounts found.</p>
                        )
                      )}
                    </div>
                  )}

                  {/* Posts Section */}
                  {(searchTab === "all" || searchTab === "posts") && (
                    <div className="space-y-2">
                      {searchTab === "all" && hasPosts && (
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider">Posts</h4>
                      )}
                      {hasPosts ? (
                        <div className="space-y-2">
                          {(searchTab === "all" ? matchedPosts.slice(0, 3) : matchedPosts).map((post) => (
                            <Link
                              key={post.id}
                              href={`/post/${post.id}`}
                              onClick={() => setShowSearchModal(false)}
                              className="flex gap-3 p-3 rounded-2xl border border-border/50 bg-surface/40 hover:border-primary/40 hover:bg-primary/5 transition-all min-w-0 group"
                            >
                              <img src={post.creatorAvatar} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-black text-text-main truncate group-hover:text-primary transition-colors">{post.creatorName}</span>
                                  <span className="text-[9px] text-text-muted truncate">@{post.creatorUsername}</span>
                                  <span className="text-[8px] text-text-muted/60 ml-auto">{post.time}</span>
                                </div>
                                <p className="text-[10.5px] font-medium text-text-muted line-clamp-2 leading-relaxed">
                                  {post.content}
                                </p>
                              </div>
                              {post.mediaUrl && (
                                <div className="relative w-12 h-12 rounded-lg border border-border/60 overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
                                  {post.mediaType === "video" ? (
                                    <>
                                      <video src={post.mediaUrl} className="w-full h-full object-cover opacity-80" muted />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                      </div>
                                    </>
                                  ) : (
                                    <img src={post.mediaUrl} className="w-full h-full object-cover" />
                                  )}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        searchTab === "posts" && (
                          <p className="text-xs font-bold text-text-muted text-center py-6">No matching posts found.</p>
                        )
                      )}
                    </div>
                  )}

                  {/* Videos Section */}
                  {searchTab === "videos" && (
                    <div className="space-y-2">
                      {hasVideos ? (
                        <div className="space-y-2">
                          {matchedVideos.map((post) => (
                            <Link
                              key={post.id}
                              href={`/post/${post.id}`}
                              onClick={() => setShowSearchModal(false)}
                              className="flex gap-3 p-3 rounded-2xl border border-border/50 bg-surface/40 hover:border-primary/40 hover:bg-primary/5 transition-all min-w-0 group"
                            >
                              <img src={post.creatorAvatar} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-black text-text-main truncate group-hover:text-primary transition-colors">{post.creatorName}</span>
                                  <span className="text-[9px] text-text-muted truncate">@{post.creatorUsername}</span>
                                  <span className="text-[8px] text-text-muted/60 ml-auto">{post.time}</span>
                                </div>
                                <p className="text-[10.5px] font-medium text-text-muted line-clamp-2 leading-relaxed">
                                  {post.content}
                                </p>
                              </div>
                              {post.mediaUrl && (
                                <div className="relative w-12 h-12 rounded-lg border border-border/60 overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
                                  <video src={post.mediaUrl} className="w-full h-full object-cover opacity-80" muted />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                  </div>
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-text-muted text-center py-6">No matching video posts found.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
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
