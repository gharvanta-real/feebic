"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { apiClient } from "@/lib/apiClient";

interface TopFan {
  name: string;
  username: string;
  avatar: string;
  totalContributed: number;
  joinedDate: string;
}

interface TopPost {
  title: string;
  earnings: number;
  likes: number;
  type: string;
}

export default function CreatorStudioPage() {
  const { user } = useUser();
  
  // Studio stats loaded from local storage
  const [earnings, setEarnings] = useState("14280.50");
  const [subscribers, setSubscribers] = useState("1248");
  const [postCount, setPostCount] = useState("48");
  const [directTips, setDirectTips] = useState("0.00");
  const [totalLikes, setTotalLikes] = useState("0");
  const [totalComments, setTotalComments] = useState("0");
  const [isBankLinked, setIsBankLinked] = useState(false);
  const [topFans, setTopFans] = useState<TopFan[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const refreshAnalytics = async () => {
      const [wallet, posts, creator, bank] = await Promise.all([
        apiClient.get<{ transactions: { amount: number; type: string; title: string }[] }>("/wallet"),
        apiClient.get<any[]>("/posts"),
        apiClient.get<any>(`/users/creator/${user.username}`),
        apiClient.get<{ linked?: boolean }>("/wallet/bank").catch(() => ({ linked: false })),
      ]);

      const creatorPosts = posts.filter((post) => (post.creator_username || post.creatorUsername) === user.username);
      const positiveTransactions = wallet.transactions.filter((tx) => tx.amount > 0);
      const tipTransactions = positiveTransactions.filter((tx) => tx.type === "tip");
      const gross = positiveTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const tips = tipTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      setEarnings(gross.toFixed(2));
      setSubscribers(String(creator.fans_count || 0));
      setPostCount(String(creatorPosts.length));
      setDirectTips(tips.toFixed(2));
      setTotalLikes(creatorPosts.reduce((sum, post) => sum + (post.likes || 0), 0).toLocaleString());
      setTotalComments(creatorPosts.reduce((sum, post) => sum + (post.comments_count || post.commentsCount || 0), 0).toLocaleString());
      setTopFans(creator.top_fans || []);
      setTopPosts(
        creatorPosts
          .map((post) => ({
            title: post.content || "Untitled post",
            earnings: post.is_unlocked || post.isUnlocked ? post.price || 0 : 0,
            likes: post.likes || 0,
            type: post.media_type || post.mediaType || "image",
          }))
          .sort((a, b) => b.likes - a.likes)
          .slice(0, 5)
      );
      setIsBankLinked(!!bank?.linked);
    };

    window.setTimeout(() => {
      refreshAnalytics().catch(() => {});
    }, 0);
    window.addEventListener("ch_posts_updated", refreshAnalytics);
    window.addEventListener("ch_post_liked", refreshAnalytics);
    window.addEventListener("ch_comment_added", refreshAnalytics);
    window.addEventListener("ch_creator_analytics_updated", refreshAnalytics);
    window.addEventListener("ch_subscriptions_updated", refreshAnalytics);
    window.addEventListener("ch_wallet_updated", refreshAnalytics);

    return () => {
      window.removeEventListener("ch_posts_updated", refreshAnalytics);
      window.removeEventListener("ch_post_liked", refreshAnalytics);
      window.removeEventListener("ch_comment_added", refreshAnalytics);
      window.removeEventListener("ch_creator_analytics_updated", refreshAnalytics);
      window.removeEventListener("ch_subscriptions_updated", refreshAnalytics);
      window.removeEventListener("ch_wallet_updated", refreshAnalytics);
    };
  }, [user]);

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <AppShell>
        {/* Mobile Header */}
        <MobileHeader>
          <span className="text-sm font-bold text-text-muted select-none">Studio</span>
        </MobileHeader>

        {/* Main Content (Touching Sidebar) */}
        <div className="app-page-shell space-y-6 animate-fade-in">
            
            <div className="space-y-1 select-none">
              <h1 className="text-lg font-black text-text-main font-sans tracking-tight">Creator Studio</h1>
              <p className="text-xs text-text-muted font-medium">Analyze your channel payout balances, subscriber metrics, and content performance.</p>
            </div>

            {/* Core Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {/* Earnings Widget */}
              <div className="bg-surface border border-border p-4.5 rounded-2xl shadow-sm space-y-1 relative overflow-hidden">
                <p className="text-[9px] text-text-muted font-black uppercase tracking-wider">Gross Payouts</p>
                <h3 className="text-lg font-black text-success">₹{earnings}</h3>
                <p className="text-[9px] text-text-muted font-semibold leading-none">85% Creator split share</p>
                <span className="absolute bottom-2 right-2 material-symbols-outlined text-[24px] text-success/15" style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
              </div>

              {/* Subscribers Widget */}
              <div className="bg-surface border border-border p-4.5 rounded-2xl shadow-sm space-y-1 relative overflow-hidden">
                <p className="text-[9px] text-text-muted font-black uppercase tracking-wider">Active Subs</p>
                <h3 className="text-lg font-black text-primary">{subscribers}</h3>
                <p className="text-[9px] text-text-muted font-semibold leading-none">+12.4% growth this month</p>
                <span className="absolute bottom-2 right-2 material-symbols-outlined text-[24px] text-primary/15" style={{ fontVariationSettings: "'FILL' 1" }}>
                  group
                </span>
              </div>

              {/* Tips Widget */}
              <div className="bg-surface border border-border p-4.5 rounded-2xl shadow-sm space-y-1 relative overflow-hidden">
                <p className="text-[9px] text-text-muted font-black uppercase tracking-wider">Direct Tips</p>
                <h3 className="text-lg font-black text-text-main">₹{directTips}</h3>
                <p className="text-[9px] text-text-muted font-semibold leading-none">{totalComments} comments across posts</p>
                <span className="absolute bottom-2 right-2 material-symbols-outlined text-[24px] text-text-main/10" style={{ fontVariationSettings: "'FILL' 1" }}>
                  wallet
                </span>
              </div>

              {/* Posts Published Widget */}
              <div className="bg-surface border border-border p-4.5 rounded-2xl shadow-sm space-y-1 relative overflow-hidden">
                <p className="text-[9px] text-text-muted font-black uppercase tracking-wider">Total Posts</p>
                <h3 className="text-lg font-black text-text-main">{postCount} updates</h3>
                <p className="text-[9px] text-text-muted font-semibold leading-none">{totalLikes} total likes</p>
                <span className="absolute bottom-2 right-2 material-symbols-outlined text-[24px] text-text-main/10" style={{ fontVariationSettings: "'FILL' 1" }}>
                  grid_view
                </span>
              </div>
            </div>

            {/* High fidelity SVG earnings split chart */}
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4 select-none">
              <h2 className="text-xs font-black text-text-muted uppercase tracking-widest pb-2 border-b border-border flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">show_chart</span>
                <span>Earnings Progression Trend</span>
              </h2>

              <div className="relative h-44 w-full flex items-end">
                <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M0 80 Q 20 60, 40 40 T 80 20 T 100 10 L 100 100 L 0 100 Z"
                    fill="url(#gradient)"
                    className="opacity-15"
                  />
                  <path
                    d="M0 80 Q 20 60, 40 40 T 80 20 T 100 10"
                    fill="none"
                    stroke="hsl(var(--primary-hsl))"
                    strokeWidth="2.5"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary-hsl))" />
                      <stop offset="100%" stopColor="hsl(var(--primary-hsl))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="relative z-10 w-full flex justify-between px-2 text-[9px] text-text-muted pt-32 font-bold uppercase tracking-wider">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </div>

            {/* Two Column details panel (Top Fans & Top Posts) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Top Supporting Fans */}
              <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4 select-none">
                <h2 className="text-xs font-black text-text-muted uppercase tracking-widest pb-2 border-b border-border flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-accent">stars</span>
                  <span>Top Supporters</span>
                </h2>

                <div className="space-y-4">
                  {topFans.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center">Supporter data appears after subscriptions, tips, unlocks, or fundraiser contributions.</p>
                  ) : topFans.map((fan) => (
                    <div key={fan.username} className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={fan.avatar}
                          alt={fan.name}
                          className="h-9 w-9 rounded-full object-cover border border-border"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-text-main truncate leading-none mb-0.75">{fan.name}</p>
                          <p className="text-[10px] text-text-muted truncate">@{fan.username}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-success leading-none mb-0.75">₹{fan.totalContributed.toFixed(2)}</p>
                        <p className="text-[8px] text-text-muted uppercase tracking-wider font-bold">Total Tipped</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Earning Posts */}
              <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4 select-none">
                <h2 className="text-xs font-black text-text-muted uppercase tracking-widest pb-2 border-b border-border flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
                  <span>Top Earning Posts</span>
                </h2>

                <div className="space-y-4">
                  {topPosts.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center">Publish content and receive engagement to populate post analytics.</p>
                  ) : topPosts.map((post, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-black text-text-main truncate" title={post.title}>
                          {post.title}
                        </p>
                        <p className="text-[8px] text-text-muted uppercase tracking-wider font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">
                            {post.type === "video" ? "videocam" : "image"}
                          </span>
                          <span>{post.likes} Likes</span>
                        </p>
                      </div>
                      <p className="text-xs font-black text-success shrink-0">₹{post.earnings.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bank Linking Reminder widget */}
            {!isBankLinked && (
              <div className="bg-[hsl(var(--accent-hsl)/0.08)] border border-[hsl(var(--accent-hsl)/0.2)] p-4 rounded-xl flex gap-3 items-center select-none justify-between">
                <div className="flex gap-2.5 items-center">
                  <span className="material-symbols-outlined text-accent text-[26px]">account_balance</span>
                  <div>
                    <p className="font-black text-xs text-accent leading-none mb-1">Direct Bank Payouts Incomplete</p>
                    <p className="text-[10px] text-text-muted leading-none">Link a routing routing account statements to initiate automatic weekly withdrawals.</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = "/settings/monetization"}
                  className="bg-accent text-white hover:opacity-95 active:scale-95 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full transition-all shrink-0 cursor-pointer shadow"
                >
                  Link Account
                </button>
              </div>
            )}
      </div>
      </AppShell>
    </RoleGuard>
  );
}
