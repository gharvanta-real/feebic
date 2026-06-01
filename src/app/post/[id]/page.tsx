"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RightPanel } from "@/components/layout/RightPanel";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { PostCard } from "@/components/features/PostCard";
import { mockDb, Post } from "@/lib/mockDb";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const postId = resolvedParams.id;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = () => {
    const p = mockDb.getPosts(true).find((item) => item.id === postId);
    if (p) {
      setPost(p);
    } else {
      setPost(null);
    }
    setLoading(false);
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
