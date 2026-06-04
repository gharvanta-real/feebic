"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import type { Creator } from "@/lib/mockDb";
import { useUser } from "@/context/UserContext";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { apiClient } from "@/lib/apiClient";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function ExplorePage() {
  const { subscriptions, showToast } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [creators, setCreators] = useState<Creator[]>([]);

  const categories = ["All", "Lifestyle", "Photography", "Cosplay", "Art", "Fitness"];

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
          tag: creator.category || creator.tag || "Lifestyle",
          fansCount: String(creator.fans_count || 0),
          postsCount: String(creator.posts_count || 0),
          photosCount: String(creator.photos_count || 0),
          videosCount: String(creator.videos_count || 0),
        })));
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to load creators");
        setCreators([]);
      }
    };

    fetchCreators();
  }, []);

  // Filter creators dynamically by search query and category
  const filteredCreators = creators.filter((creator) => {
    const matchesSearch =
      creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "All" || creator.tag === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <RoleGuard allowedRoles={["fan"]}>
      <AppShell>
      {/* 1. Mobile Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted mr-1 select-none">Explore</span>
      </MobileHeader>

      {/* 2. Main Page Content */}
      <div className="app-page-shell space-y-6">
          
          {/* Header & Search Bar Widget */}
          <div className="space-y-4 select-none">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-text-main font-sans tracking-tight">Explore Creators</h2>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase">
                {filteredCreators.length} Creators
              </span>
            </div>
            
            <div className="relative flex items-center bg-surface border border-border rounded-2xl px-4 py-3 focus-within:border-primary focus-within:shadow-md transition-all">
              <span className="material-symbols-outlined text-text-muted text-[22px] mr-2">search</span>
              <input
                type="text"
                placeholder="Find creators by name, username or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none placeholder-text-muted text-text-main"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="material-symbols-outlined text-text-muted hover:text-text-main text-[18px] cursor-pointer"
                >
                  close
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Slide Category scroll */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 select-none no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4.5 py-2 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer active:scale-95 border ${
                  activeCategory === cat
                    ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                    : "bg-surface border-border text-text-muted hover:border-text-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dynamic Responsive Creator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredCreators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 select-none">
                <span className="material-symbols-outlined text-[64px] text-text-muted">person_search</span>
                <h3 className="text-base font-extrabold text-text-main">No creators match your search</h3>
                <p className="text-xs text-text-muted max-w-[300px]">
                  Try searching for another tag or clear your query parameters to browse all active profiles.
                </p>
                <button
                  onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredCreators.map((creator) => {
                const isSubbed = subscriptions.includes(creator.username);
                return (
                  <div
                    key={creator.username}
                    className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all duration-300"
                  >
                    {/* Header Banner */}
                    <div
                      className="h-28 md:h-32 bg-cover bg-center select-none relative"
                      style={{ backgroundImage: `url(${creator.cover})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider select-none">
                        {creator.tag}
                      </span>
                    </div>
                    
                    {/* Creator Card Content */}
                    <div className="px-5 pb-5 relative flex-grow flex flex-col justify-between">
                      {/* Avatar Overlay */}
                      <div className="flex justify-between items-end -mt-8 mb-3 select-none">
                        <Link href={`/profile?u=${creator.username}`} className="relative group block">
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-4 border-surface bg-surface shadow-md group-hover:scale-[1.02] transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-surface shadow-sm"></span>
                        </Link>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Base Tier</p>
                            <p className="text-sm font-black text-text-main">
                              {creator.subPrice === 0 ? "FREE" : `₹${creator.subPrice}/mo`}
                            </p>
                          </div>
                          <Link
                            href={`/profile?u=${creator.username}`}
                            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all select-none shadow-sm cursor-pointer ${
                              isSubbed
                                ? "bg-[hsl(var(--text-muted-hsl)/0.08)] text-text-muted hover:bg-[hsl(var(--text-muted-hsl)/0.12)] border border-border"
                                : "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]"
                            }`}
                          >
                            {isSubbed ? "View Page" : "Subscribe"}
                          </Link>
                        </div>
                      </div>

                      {/* Name Details */}
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/profile?u=${creator.username}`} className="group inline-flex items-center gap-1">
                            <h3 className="text-base font-black text-text-main group-hover:text-primary transition-colors">
                              {creator.name}
                            </h3>
                            {creator.verified && (
                              <VerifiedBadge size="md" />
                            )}
                          </Link>
                          <span className="text-xs text-text-muted">•</span>
                          <span className="text-xs text-text-muted font-semibold">@{creator.username}</span>
                        </div>
                        
                        <p className="text-xs text-text-main line-clamp-2 leading-relaxed select-text font-medium whitespace-pre-wrap">
                          {creator.bio}
                        </p>
                      </div>

                      {/* Creator Stats Grid (OnlyFans-style metrics display) */}
                      <div className="grid grid-cols-4 gap-2 pt-3.5 border-t border-border/80 text-center select-none">
                        <div>
                          <p className="text-xs font-extrabold text-text-main leading-none">
                            {creator.postsCount || "24"}
                          </p>
                          <p className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-wider">Posts</p>
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-text-main leading-none">
                            {creator.photosCount || "12"}
                          </p>
                          <p className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-wider">Photos</p>
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-text-main leading-none">
                            {creator.videosCount || "8"}
                          </p>
                          <p className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-wider">Videos</p>
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-text-main leading-none">
                            {creator.likes || "1.2K"}
                          </p>
                          <p className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-wider">Likes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
      </div>
      </AppShell>
    </RoleGuard>
  );
}
