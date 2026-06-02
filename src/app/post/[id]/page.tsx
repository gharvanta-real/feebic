"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RightPanel } from "@/components/layout/RightPanel";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { PostCard } from "@/components/features/PostCard";
import type { Post } from "@/lib/mockDb";
import { apiClient } from "@/lib/apiClient";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

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
  isLiked?: boolean;
  isBookmarked?: boolean;
  isUnlocked?: boolean;
  reposted_from_id?: string | null;
  reposted_by?: string | null;
  created_at?: string;
};

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

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const postId = resolvedParams.id;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = async () => {
    try {
      const posts = await apiClient.get<BackendPost[]>("/posts");
      const p = posts.map((post, idx) => normalizePost(post, idx)).find((item) => item.id === postId);
      setPost(p || null);
    } catch {
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchPost();
    }, 0);

    const handlePostsUpdate = () => fetchPost();
    window.addEventListener("ch_posts_updated", handlePostsUpdate);
    return () => window.removeEventListener("ch_posts_updated", handlePostsUpdate);
  }, [postId]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <AppShell>
        <MobileHeader>
          <button
            onClick={() => router.push("/")}
            className="text-text-muted hover:text-primary transition-colors cursor-pointer mr-1"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">arrow_back</span>
          </button>
          <span className="text-sm font-bold text-text-muted select-none">Post Detail</span>
        </MobileHeader>
        <div className="app-page-wide flex p-6 select-none">
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 w-full min-h-screen">
            <span className="material-symbols-outlined text-[64px] text-text-muted animate-pulse">feed</span>
            <h3 className="text-base font-extrabold text-text-main">Post Not Found</h3>
            <p className="text-xs text-text-muted max-w-[280px]">
              This post may have been deleted, reported, or does not exist under your current access tier.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-primary text-white text-xs font-black px-6 py-2 rounded-full shadow hover:opacity-95 cursor-pointer uppercase tracking-wider"
            >
              Back to Home
            </button>
          </div>
          <RightPanel />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Mobile Top Header */}
      <MobileHeader>
        <button
          onClick={() => router.back()}
          className="text-text-muted hover:text-primary transition-colors cursor-pointer mr-1"
        >
          <span className="material-symbols-outlined text-[22px] leading-none">arrow_back</span>
        </button>
        <span className="text-sm font-bold text-text-muted select-none">Post Detail</span>
      </MobileHeader>

      {/* Main Grid Layout */}
      <div className="app-page-wide flex justify-between gap-6">
        
        {/* Post Card viewport */}
        <div className="w-full max-w-[760px] min-h-screen p-4 md:p-5 space-y-5 shrink-0">
          
          {/* Back header row */}
          <div className="flex items-center gap-3 select-none pb-2">
            <button
              onClick={() => router.back()}
              className="text-text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h1 className="text-base font-black text-text-main font-sans tracking-tight">Post Detail</h1>
          </div>

          <PostCard
            post={post}
            onPostUpdate={fetchPost}
            defaultShowComments={true}
          />
        </div>

        {/* Right Panel Sidebar */}
        <RightPanel />
      </div>
    </AppShell>
  );
}
