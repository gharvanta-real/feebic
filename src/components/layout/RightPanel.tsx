"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import type { Creator } from "@/lib/mockDb";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { apiClient } from "@/lib/apiClient";

export const RightPanel: React.FC = () => {
  const { user, subscriptions, subscribeToCreator, showToast } = useUser();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [topPostsTab, setTopPostsTab] = useState<"All" | "Paid" | "Free">("All");

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const data = await apiClient.get<any[]>("/users/creators");
        setCreators(data.map((creator) => ({
          name: creator.display_name || creator.displayName || creator.name || "Felbic Creator",
          username: creator.username,
          avatar: creator.avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
          cover: creator.cover_photo || creator.coverPhoto || creator.cover || "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
          bio: creator.bio || "",
          location: creator.location || "",
          website: creator.website || "",
          likes: String(creator.likes_count || creator.likes || 0),
          subPrice: creator.sub_price || creator.subPrice || 0,
          verified: true,
          tag: creator.tag || "Creator",
          fansCount: `${creator.fans_count || 0} fans`,
          postsCount: String(creator.posts_count || 0),
          photosCount: String(creator.photos_count || 0),
          videosCount: String(creator.videos_count || 0),
        })));
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to load creator suggestions");
      }
    };

    fetchCreators();
  }, [subscriptions]);

  const handleSubscribeClick = (username: string, subPrice: number) => {
    if (user?.role !== "fan") {
      showToast("Switch to Visitor mode to subscribe to creators.");
      return;
    }
    subscribeToCreator(username, subPrice);
  };

  const visibleCreators = creators.filter((creator) => creator.username !== user?.username);

  return (
    <aside className="w-[340px] bg-transparent pb-4 pt-[92px] space-y-4 sticky top-0 self-start max-[1320px]:hidden z-40 shrink-0">
      
      {/* 1. Trending Creators Section (100% Screenshot replica) */}
      <div className="bg-surface border border-border/60 rounded-3xl p-4.5 space-y-4 select-none">
        <div className="flex justify-between items-center pb-2 border-b border-border/60">
          <h2 className="text-[13px] font-black text-text-main tracking-wide">
            Trending Creators
          </h2>
          <Link href={user?.role === "fan" ? "/explore" : "/studio"} className="text-[11px] text-primary font-bold hover:underline">
            View all
          </Link>
        </div>

        <div className="space-y-3.5">
          {visibleCreators.slice(0, 5).map((creator) => {
            const isSubbed = subscriptions.includes(creator.username);
            return (
              <div key={creator.username} className="flex items-center justify-between gap-2.5">
                <Link href={`/profile?u=${creator.username}`} className="flex items-center gap-2.5 group min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="h-10.5 w-10.5 rounded-full object-cover border border-border group-hover:opacity-95 transition-opacity"
                    />
                    {/* Green online status dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border-2 border-surface rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-0.5">
                      <p className="text-[12.5px] font-extrabold text-text-main truncate group-hover:text-primary transition-colors leading-none">
                        {creator.name}
                      </p>
                      {creator.verified && (
                        <VerifiedBadge size="xs" />
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted truncate mt-1">
                      @{creator.username}
                    </p>
                    <p className="text-[9.5px] text-text-muted/80 font-bold truncate mt-1">
                      {creator.fansCount}
                    </p>
                  </div>
                </Link>

                {user?.role === "fan" && (
                  <button
                    onClick={() => handleSubscribeClick(creator.username, creator.subPrice)}
                    disabled={isSubbed}
                    className={`text-[10.5px] px-3.5 py-1.5 rounded-full shrink-0 transition-all cursor-pointer ${
                      isSubbed
                        ? "bg-[hsl(var(--text-muted-hsl)/0.08)] text-text-muted border border-border/60 cursor-default select-none font-semibold"
                        : "border border-primary text-primary hover:bg-primary hover:text-white active:scale-95 font-bold"
                    }`}
                  >
                    {isSubbed ? "Subscribed" : "Subscribe"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Top Posts Widget (100% Screenshot replica - fully interactive!) */}
      <div className="bg-surface border border-border/60 rounded-3xl p-4.5 space-y-4 select-none">
        <div className="flex justify-between items-center pb-1">
          <h2 className="text-[13px] font-black text-text-main tracking-wide">
            Top Posts
          </h2>
          <Link href={user?.role === "fan" ? "/explore" : "/studio"} className="text-[11px] text-primary font-bold hover:underline">
            View all
          </Link>
        </div>

        {/* Tab Filters */}
        <div className="grid grid-cols-3 border-b border-border/60">
          {(["All", "Paid", "Free"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTopPostsTab(tab)}
              className={`pb-2 text-[10.5px] font-extrabold cursor-pointer transition-all border-b-2 -mb-px ${
                topPostsTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {visibleCreators.slice(0, 3).map((creator) => ({ username: creator.username, price: creator.subPrice, creator }))
            .filter((c) => {
              if (topPostsTab === "Paid") return c.price > 0;
              if (topPostsTab === "Free") return c.price === 0;
              return true;
            })
            .map((item, index) => {
              const creatorInfo = item.creator;
              
              return (
                <div key={item.username} className="flex items-center gap-3 rounded-2xl border border-border/45 bg-background/60 px-3 py-2.5">
                  <div className="w-5 shrink-0 text-center text-[11px] font-black text-text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <Link href={`/profile?u=${item.username}`} className="group flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="relative shrink-0">
                      <img
                        src={creatorInfo.avatar}
                        alt={creatorInfo.name}
                        className="h-9.5 w-9.5 rounded-full object-cover border border-border group-hover:opacity-95 transition-opacity"
                      />
                      <div className="absolute bottom-0 right-0 h-2 w-2 bg-emerald-500 border border-surface rounded-full" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-0.5">
                        <p className="truncate text-[11.5px] font-black leading-none text-text-main group-hover:text-primary">
                          {creatorInfo.name}
                        </p>
                        {creatorInfo.verified && (
                          <VerifiedBadge size="xs" />
                        )}
                      </div>
                      <p className="mt-1 truncate text-[9.5px] font-semibold text-text-muted">
                        @{creatorInfo.username}
                      </p>
                    </div>
                  </Link>

                  {user?.role === "fan" && (
                    <button 
                      onClick={() => handleSubscribeClick(item.username, item.price)}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-3 py-1.5 text-[10.5px] font-bold text-primary transition-all hover:bg-primary hover:text-white active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                      <span>₹{item.price.toFixed(2)}</span>
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 3. Footer platform links */}
      <div className="px-4 text-[10px] text-text-muted space-y-1 select-none">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-center font-medium">
          <Link href="/settings" className="hover:underline">About</Link>
          <span>•</span>
          <Link href="/settings/security" className="hover:underline">Privacy</Link>
          <span>•</span>
          <Link href="/settings/payments" className="hover:underline">Terms</Link>
          <span>•</span>
          <Link href="/settings/email" className="hover:underline">Help</Link>
        </div>
        <p className="text-center font-bold text-text-muted/60 mt-1">© 2026 Felbic Technologies Pvt. Ltd.</p>
      </div>
    </aside>
  );
};
