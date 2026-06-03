"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import type { Creator, Post } from "@/lib/mockDb";
import { apiClient } from "@/lib/apiClient";
import { PaymentModal } from "@/components/ui/PaymentModal";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { PostCard } from "@/components/features/PostCard";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, subscriptions, subscribeToCreator, favoriteCreators, toggleFavorite, blockedUsers, toggleBlock, showToast, walletBalance } = useUser();

  const queryUser = searchParams.get("u") || "";
  
  const [profileData, setProfileData] = useState<Creator | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "photos" | "videos" | "likes" | "queue" | "saved" | "subscriptions">("posts");

  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);

  // Payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTitle, setPaymentTitle] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Lightbox visual overlay state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mountTime, setMountTime] = useState<number>(0);

  useEffect(() => {
    setMountTime(Date.now());
  }, []);

  type BackendPost = Partial<Post> & {
    creator_username?: string;
    creator_name?: string;
    creator_avatar?: string;
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

  const normalizePost = (post: BackendPost, index: number): Post => {
    const mediaUrls = post.mediaUrls || post.media_urls || [];
    const createdAt = post.created_at ? new Date(post.created_at) : null;

    return {
      id: post.id || `post-fallback-${index}`,
      creatorUsername: post.creatorUsername || post.creator_username || "",
      creatorName: post.creatorName || post.creator_name || "Felbic Creator",
      creatorAvatar: post.creatorAvatar || post.creator_avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
      isPinned: post.isPinned || false,
      mediaUrl: post.mediaUrl || mediaUrls[0] || "",
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

  const mapCreatorProfile = (profile: any): Creator => ({
    name: profile.display_name || profile.displayName || profile.name || "Felbic Creator",
    username: profile.username,
    avatar: profile.avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
    cover: profile.cover_photo || profile.coverPhoto || profile.cover || "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
    bio: profile.bio || "",
    location: profile.location || "",
    website: profile.website || "",
    likes: String(profile.likes_count || 0),
    subPrice: profile.sub_price || profile.subPrice || 0,
    verified: true,
    tag: "Creator",
    fansCount: String(profile.fans_count || 0),
    postsCount: String(profile.posts_count || 0),
    photosCount: String(profile.photos_count || 0),
    videosCount: String(profile.videos_count || 0),
    joinedDate: "2026",
  });

  const fetchProfile = async () => {
    if (!user) return;

    const username = queryUser.replace("@", "").trim();
    const ownUsername = user.username.replace("@", "").trim();
    const targetUsername = !username || username === ownUsername ? ownUsername : username;

    let targetPosts: Post[] = [];
    try {
      const allPosts = (await apiClient.get<BackendPost[]>("/posts")).map((post, idx) => normalizePost(post, idx));
      targetPosts = allPosts.filter((p) => p.creatorUsername === targetUsername);
      setPosts(targetPosts);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load profile posts");
      setPosts([]);
    }

    if (targetUsername === ownUsername) {
      // Viewing own profile
      setIsSelf(true);
      const isCreator = user.role === "creator";
      setProfileData({
        name: user.displayName,
        username: user.username,
        avatar: user.avatar,
        cover: user.coverPhoto,
        bio: user.bio,
        location: user.location || "Los Angeles, CA",
        website: user.website || "lanarhoades.fans",
        likes: String(targetPosts.reduce((sum, p) => sum + (p.likes || 0), 0)),
        subPrice: 0,
        verified: isCreator,
        tag: isCreator ? "Creator" : "Fan",
        fansCount: "0",
        postsCount: String(targetPosts.length),
        photosCount: String(targetPosts.filter((p) => p.mediaType === "image").length),
        videosCount: String(targetPosts.filter((p) => p.mediaType === "video").length),
        joinedDate: "Sep 2020"
      });

      if (!isCreator) {
        // Fetch bookmarks for Fan
        try {
          const bms = await apiClient.get<BackendPost[]>("/posts/bookmarks");
          setSavedPosts(bms.map((post, idx) => normalizePost(post, idx)));
        } catch (err) {
          console.error("Failed to load bookmarks", err);
        }

        // Fetch subscriptions for Fan
        try {
          const subs = await apiClient.get<any[]>("/users/subscriptions");
          setMySubscriptions(subs.map(s => ({
            username: s.username,
            name: s.name || s.displayName,
            avatar: s.avatar,
            price: s.price || s.subPrice || 0,
            status: s.status,
            expiryDate: s.expiryDate || (s.expires_at ? new Date(s.expires_at).toLocaleDateString() : ""),
            autoRenew: Boolean(s.autoRenew),
          })));
        } catch (err) {
          console.error("Failed to load subscriptions", err);
        }
      }
    } else {
      // Viewing someone else's profile
      setIsSelf(false);
      try {
        const creator = await apiClient.get<any>(`/users/creator/${targetUsername}`);
        setProfileData(mapCreatorProfile(creator));
      } catch {
        showToast("User profile not found");
        router.push("/");
      }
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchProfile();
    }, 0);
  }, [queryUser, user]);

  useEffect(() => {
    if (profileData && profileData.tag === "Fan" && activeTab === "posts") {
      setActiveTab("saved" as any);
    }
  }, [profileData]);

  if (!profileData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const isSubbed = subscriptions.includes(profileData.username);
  const isFav = favoriteCreators.includes(profileData.username);
  const isRestricted = blockedUsers.includes(profileData.username);

  const isPostLocked = (post: Post) => {
    if (isSelf) return false;
    if (!post.isPremium) return false;
    const isUnlocked = Boolean((post as Post & { isUnlocked?: boolean }).isUnlocked);
    return !isSubbed && !isUnlocked;
  };

  const handleSubscribe = () => {
    if (isSubbed) return;
    setPaymentTitle(`Subscribe to @${profileData.username}`);
    const priceVal = profileData.discountActive
      ? parseFloat((profileData.subPrice * (1 - (profileData.discountPercent || 0) / 100)).toFixed(2))
      : profileData.subPrice;
    setPaymentPrice(priceVal);
    setSelectedPost(null);
    setIsPaymentOpen(true);
  };

  const handleSubscribeBundle = (months: number, discount: number) => {
    if (isSubbed) return;
    const basePrice = profileData.discountActive
      ? profileData.subPrice * (1 - (profileData.discountPercent || 0) / 100)
      : profileData.subPrice;
    const priceVal = parseFloat((basePrice * months * (1 - discount / 100)).toFixed(2));
    setPaymentTitle(`Subscribe to @${profileData.username} for ${months} Months`);
    setPaymentPrice(priceVal);
    setSelectedPost(null);
    setIsPaymentOpen(true);
  };

  const handleSubscribeConfirm = async (_tipMessage?: string, paymentSource: "wallet" | "card" = "wallet") => {
    if (paymentSource !== "wallet") {
      showToast("Card checkout is disabled in real-dev mode. Add wallet funds and retry.");
      return;
    }

    if (selectedPost) {
      try {
        await apiClient.post(`/posts/${selectedPost.id}/unlock`);
        showToast(`Successfully unlocked post content!`);
        setSelectedPost(null);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to unlock post");
        return;
      }
    } else {
      const ok = await subscribeToCreator(profileData.username, paymentPrice);
      if (!ok) return;
    }
    setIsPaymentOpen(false);
    fetchProfile();
  };

  const handleToggleFavorite = async () => {
    const res = await toggleFavorite(profileData.username);
    showToast(res ? `Added @${profileData.username} to favorites` : `Removed @${profileData.username} from favorites`);
  };

  const handleToggleBlock = async () => {
    const res = await toggleBlock(profileData.username);
    showToast(res ? `@${profileData.username} has been blocked` : `@${profileData.username} has been unblocked`);
    if (res) router.push("/");
  };

  const handlePostClick = (post: Post) => {
    if (isPostLocked(post)) {
      setSelectedPost(post);
      setPaymentTitle(`Unlock premium content by @${profileData.username}`);
      setPaymentPrice(post.price);
      setIsPaymentOpen(true);
    } else {
      setSelectedImage(post.mediaUrl);
    }
  };

  const getFilteredPosts = () => {
    const now = mountTime || Date.now();
    if (activeTab === "queue") {
      return posts.filter(p => p.publishAt && new Date(p.publishAt).getTime() > now);
    }
    const published = posts.filter(p => !p.publishAt || new Date(p.publishAt).getTime() <= now);
    
    if (activeTab === "posts") {
      return published;
    } else if (activeTab === "photos") {
      return published.filter(p => p.mediaType === "image");
    } else if (activeTab === "videos") {
      return published.filter(p => p.mediaType === "video");
    } else if (activeTab === "likes") {
      return published.filter(p => (p as any).isLiked);
    }
    return published;
  };

  const filteredPosts = getFilteredPosts();

  const renderTabButtons = () => {
    if (profileData.tag === "Fan") {
      return (
        <>
          <button
            onClick={() => setActiveTab("saved" as any)}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors cursor-pointer border-b-2 leading-none gap-1.5 ${
              activeTab === "saved" ? "border-primary text-primary" : "border-transparent text-text-muted"
            }`}
          >
            <span className="material-symbols-outlined text-[19px] font-medium" style={activeTab === "saved" ? { fontVariationSettings: "'FILL' 1" } : undefined}>bookmark</span>
            <span className="text-[9px] font-black tracking-wider uppercase">SAVED</span>
          </button>
          <button
            onClick={() => setActiveTab("subscriptions" as any)}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors cursor-pointer border-b-2 leading-none gap-1.5 ${
              activeTab === "subscriptions" ? "border-primary text-primary" : "border-transparent text-text-muted"
            }`}
          >
            <span className="material-symbols-outlined text-[19px] font-medium" style={activeTab === "subscriptions" ? { fontVariationSettings: "'FILL' 1" } : undefined}>card_membership</span>
            <span className="text-[9px] font-black tracking-wider uppercase">SUBSCRIPTIONS</span>
          </button>
        </>
      );
    }

    return (
      <>
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors cursor-pointer border-b-2 leading-none gap-1.5 ${
            activeTab === "posts" ? "border-primary text-primary" : "border-transparent text-text-muted"
          }`}
        >
          <span className="material-symbols-outlined text-[19px] font-medium" style={activeTab === "posts" ? { fontVariationSettings: "'FILL' 1" } : undefined}>grid_view</span>
          <span className="text-[9px] font-black tracking-wider uppercase">POSTS</span>
        </button>
        <button
          onClick={() => setActiveTab("photos")}
          className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors cursor-pointer border-b-2 leading-none gap-1.5 ${
            activeTab === "photos" ? "border-primary text-primary" : "border-transparent text-text-muted"
          }`}
        >
          <span className="material-symbols-outlined text-[19px] font-medium" style={activeTab === "photos" ? { fontVariationSettings: "'FILL' 1" } : undefined}>image</span>
          <span className="text-[9px] font-black tracking-wider uppercase">PHOTOS</span>
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors cursor-pointer border-b-2 leading-none gap-1.5 ${
            activeTab === "videos" ? "border-primary text-primary" : "border-transparent text-text-muted"
          }`}
        >
          <span className="material-symbols-outlined text-[19px] font-medium" style={activeTab === "videos" ? { fontVariationSettings: "'FILL' 1" } : undefined}>play_circle</span>
          <span className="text-[9px] font-black tracking-wider uppercase">VIDEOS</span>
        </button>
        <button
          onClick={() => setActiveTab("likes")}
          className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors cursor-pointer border-b-2 leading-none gap-1.5 ${
            activeTab === "likes" ? "border-primary text-primary" : "border-transparent text-text-muted"
          }`}
        >
          <span className="material-symbols-outlined text-[19px] font-medium" style={activeTab === "likes" ? { fontVariationSettings: "'FILL' 1" } : undefined}>favorite</span>
          <span className="text-[9px] font-black tracking-wider uppercase">LIKES</span>
        </button>
        {isSelf && (
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors cursor-pointer border-b-2 leading-none gap-1.5 ${
              activeTab === "queue" ? "border-primary text-primary" : "border-transparent text-text-muted"
            }`}
          >
            <span className="material-symbols-outlined text-[19px] font-medium" style={activeTab === "queue" ? { fontVariationSettings: "'FILL' 1" } : undefined}>schedule</span>
            <span className="text-[9px] font-black tracking-wider uppercase">QUEUE</span>
          </button>
        )}
      </>
    );
  };

  const renderTabContent = () => {
    if (profileData.tag === "Fan") {
      if (activeTab === "saved") {
        if (savedPosts.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-2.5">
              <span className="material-symbols-outlined text-[44px] text-text-muted">bookmarks</span>
              <p className="text-xs font-extrabold text-text-main uppercase tracking-wider">No saved posts</p>
              <p className="text-[11px] text-text-muted max-w-[240px]">Posts you bookmark will appear here.</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {savedPosts.map((post) => {
              const locked = isPostLocked(post);
              return (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post)}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-surface-container border border-border/40 transition-transform duration-200 hover:scale-[1.015]"
                >
                  {locked ? (
                    <>
                      <img
                        src={post.mediaUrl}
                        alt="Locked preview"
                        className="h-full w-full object-cover filter blur-[9px] scale-[1.06] opacity-[0.76]"
                      />
                      <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[18px] text-white/95 leading-none mb-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                          lock
                        </span>
                        <span className="text-[10px] font-black text-white/90 bg-black/40 px-2 py-0.75 rounded-full tracking-wider shadow-sm">
                          ₹{post.price}
                        </span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt="Saved post"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      } else {
        if (mySubscriptions.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-2.5">
              <span className="material-symbols-outlined text-[44px] text-text-muted">card_membership</span>
              <p className="text-xs font-extrabold text-text-main uppercase tracking-wider">No subscriptions</p>
              <p className="text-[11px] text-text-muted max-w-[240px]">You are not subscribed to any creators yet.</p>
            </div>
          );
        }
        return (
          <div className="space-y-3 max-w-xl mx-auto">
            {mySubscriptions.map((sub: any) => (
              <Link
                key={sub.username}
                href={`/profile?u=${sub.username}`}
                className="bg-surface border border-border rounded-2xl p-4 flex justify-between items-center gap-4 hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={sub.avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png"}
                    alt={sub.name}
                    className="h-10 w-10 rounded-full object-cover border border-border"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-text-main leading-none">{sub.name || sub.displayName}</span>
                      <VerifiedBadge size="sm" />
                    </div>
                    <span className="text-[10px] text-text-muted mt-1 block">@{sub.username}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-primary/10 text-primary font-black px-3.5 py-1 rounded-full uppercase tracking-wider text-center">
                  {sub.status || "active"}
                </span>
              </Link>
            ))}
          </div>
        );
      }
    }

    if (activeTab === "queue") {
      if (filteredPosts.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2.5">
            <span className="material-symbols-outlined text-[44px] text-text-muted animate-pulse">schedule</span>
            <p className="text-xs font-extrabold text-text-main uppercase tracking-wider">Empty queue</p>
            <p className="text-[11px] text-text-muted max-w-[240px]">You have no scheduled updates in your queue.</p>
          </div>
        );
      }
      return (
        <div className="space-y-5">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostUpdate={fetchProfile}
            />
          ))}
        </div>
      );
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2.5">
          <span className="material-symbols-outlined text-[44px] text-text-muted">feed</span>
          <p className="text-xs font-extrabold text-text-main uppercase tracking-wider">No updates listed</p>
          <p className="text-[11px] text-text-muted max-w-[240px]">This tab has no active updates published.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {filteredPosts.map((post) => {
          const locked = isPostLocked(post);
          return (
            <div
              key={post.id}
              onClick={() => handlePostClick(post)}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-surface-container border border-border/40 transition-transform duration-200 hover:scale-[1.015]"
            >
              {locked ? (
                <>
                  <img
                    src={post.mediaUrl}
                    alt="Locked content preview"
                    className="h-full w-full object-cover filter blur-[9px] scale-[1.06] opacity-[0.76]"
                  />
                  <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[18px] text-white/95 leading-none mb-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                      lock
                    </span>
                    <span className="text-[10px] font-black text-white/90 bg-black/40 px-2 py-0.75 rounded-full tracking-wider shadow-sm">
                      ₹{post.price}
                    </span>
                  </div>
                </>
              ) : (
                <img
                  src={post.mediaUrl}
                  alt="Feed content item"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

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
        <span className="text-sm font-bold text-text-muted select-none">Profile</span>
      </MobileHeader>

      {/* Profile Container */}
      <div className="app-page-shell app-page-flush pb-12 bg-background animate-fade-in overflow-hidden">
          
          {/* Top Info Bar (100% Parity matching Image 1) */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border select-none">
            <h1 className="text-sm font-black text-text-main tracking-wider uppercase font-sans">
              MY PROFILE
            </h1>
            <button
              onClick={() => router.push("/settings")}
              className="text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">settings</span>
            </button>
          </div>

          {/* Cover Photo Block */}
          <div className="p-4 pb-0 relative">
            <div
              className="h-44 w-full bg-cover bg-center rounded-2xl relative select-none shadow-sm"
              style={{ backgroundImage: `url(${profileData.cover})` }}
            >
              <button className="absolute top-3 right-3 h-6 w-6 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[15px] font-bold">info</span>
              </button>
            </div>

            {/* Overlapping Avatar & Actions line */}
            <div className="flex justify-between items-end px-3 -mt-9 mb-3 relative z-10 select-none">
              <div className="relative h-[82px] w-[82px]">
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="h-[82px] w-[82px] rounded-full object-cover border-[3.5px] border-surface bg-surface shadow-sm"
                />
                <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-green-500 border-[2.5px] border-surface shadow-sm"></span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                {isSelf ? (
                  <>
                    <button
                      onClick={() => router.push("/settings/edit-profile")}
                      className="border border-border text-text-main hover:bg-black/5 dark:hover:bg-white/5 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none"
                    >
                      EDIT PROFILE
                    </button>
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(window.location.href);
                          showToast("Profile link copied to clipboard!");
                        }
                      }}
                      className="h-8 w-8 rounded-full border border-border text-text-muted hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleToggleBlock}
                      className={`h-8 w-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                        isRestricted 
                          ? "border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          : "border-border text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                      title="Block User"
                    >
                      <span className="material-symbols-outlined text-[18px]">block</span>
                    </button>

                    <button
                      onClick={handleToggleFavorite}
                      className={`h-8 w-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                        isFav 
                          ? "border-accent bg-[hsl(var(--accent-hsl)/0.05)] text-accent animate-pulse"
                          : "border-border text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                      title="Add to Favorites"
                    >
                      <span className="material-symbols-outlined text-[18px]" style={isFav ? { fontVariationSettings: "'FILL' 1" } : undefined}>favorite</span>
                    </button>

                    {isSubbed && (
                      <Link
                        href={`/chat?u=${profileData.username}`}
                        className="h-8 w-8 rounded-full border border-border text-text-muted hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                        title="Message Creator"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                      </Link>
                    )}

                    {isSubbed && profileData.callsEnabled && (
                      <>
                        <Link
                          href={`/chat?u=${profileData.username}&call=audio`}
                          className="h-8 w-8 rounded-full border border-border text-text-muted hover:border-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-colors shrink-0"
                          title="Audio Call Creator"
                        >
                          <span className="material-symbols-outlined text-[18px]">phone</span>
                        </Link>
                        <Link
                          href={`/chat?u=${profileData.username}&call=video`}
                          className="h-8 w-8 rounded-full border border-border text-text-muted hover:border-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-colors shrink-0"
                          title="Video Call Creator"
                        >
                          <span className="material-symbols-outlined text-[18px]">videocam</span>
                        </Link>
                      </>
                    )}

                    <button
                      onClick={handleSubscribe}
                      className={`px-5 py-2 rounded-full text-xs transition-all cursor-pointer ${
                        isSubbed
                          ? "bg-black/5 dark:bg-white/5 text-text-muted border border-border font-semibold"
                          : "bg-primary text-white hover:opacity-95 shadow-md font-bold"
                      }`}
                    >
                      {isSubbed ? "Subscribed" : profileData.subPrice === 0 ? "Subscribe Free" : "Subscribe"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Legal / Biography details */}
          <div className="px-7 pb-4">
            <div className="flex items-center gap-1">
              <h2 className="text-lg font-black text-text-main leading-none">
                {profileData.name}
              </h2>
              {profileData.verified && (
                <VerifiedBadge size="md" />
              )}
            </div>
            <p className="text-[11.5px] text-text-muted mt-1 select-all font-semibold">@{profileData.username}</p>

            <p className="text-[13px] text-text-main pt-3 leading-relaxed whitespace-pre-wrap select-text font-medium">
              {profileData.bio}
            </p>

            {/* Location & Join Date Row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-text-muted pt-3.5 font-bold">
              {profileData.location && (
                <span className="flex items-center gap-0.75">
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  {profileData.location}
                </span>
              )}
              <span className="flex items-center gap-0.75">
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                Joined {profileData.joinedDate || "Sep 2020"}
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          {profileData.tag === "Fan" ? (
            <div className="px-6 py-3.5 border-t border-border flex justify-between items-center text-center select-none">
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">{mySubscriptions.length}</p>
                <p className="text-[9px] font-bold text-primary mt-1 tracking-wider">SUBSCRIBED</p>
              </div>
              <div className="h-5 w-[1px] bg-border" />
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">{savedPosts.length}</p>
                <p className="text-[9px] font-bold text-text-muted mt-1 tracking-wider">SAVED</p>
              </div>
              <div className="h-5 w-[1px] bg-border" />
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">₹{walletBalance.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-text-muted mt-1 tracking-wider">BALANCE</p>
              </div>
            </div>
          ) : (
            <div className="px-6 py-3.5 border-t border-border flex justify-between items-center text-center select-none">
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">{profileData.postsCount || "1.2K"}</p>
                <p className="text-[9px] font-bold text-primary mt-1 tracking-wider">POSTS</p>
              </div>
              <div className="h-5 w-[1px] bg-border" />
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">{profileData.photosCount || "228"}</p>
                <p className="text-[9px] font-bold text-text-muted mt-1 tracking-wider">PHOTOS</p>
              </div>
              <div className="h-5 w-[1px] bg-border" />
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">{profileData.videosCount || "356"}</p>
                <p className="text-[9px] font-bold text-text-muted mt-1 tracking-wider">VIDEOS</p>
              </div>
              <div className="h-5 w-[1px] bg-border" />
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">{profileData.likes || "7.8K"}</p>
                <p className="text-[9px] font-bold text-text-muted mt-1 tracking-wider">LIKES</p>
              </div>
              <div className="h-5 w-[1px] bg-border" />
              <div className="flex-1">
                <p className="text-[14.5px] font-black text-text-main leading-none">{profileData.fansCount || "1.1K"}</p>
                <p className="text-[9px] font-bold text-text-muted mt-1 tracking-wider">FANS</p>
              </div>
            </div>
          )}

          {/* Subscription Banner */}
          {!isSelf && profileData.tag !== "Fan" && (
            <div className="px-4 pb-4">
              <div className="bg-[#e8f5ff] dark:bg-primary/8 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[13px] font-black text-text-main font-sans">Subscription</p>
                  {profileData.discountActive ? (
                    <p className="text-[11.5px] font-bold mt-0.75 text-success">
                      <span className="line-through text-text-muted mr-1.5">₹{profileData.subPrice}</span>
                      <span>₹{(profileData.subPrice * (1 - (profileData.discountPercent || 0) / 100)).toFixed(2)} per month</span>
                      <span className="bg-success text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full ml-2 select-none tracking-wider">
                        {profileData.discountPercent}% OFF
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-text-muted font-bold mt-0.75">₹{profileData.subPrice} per month</p>
                  )}
                </div>
                <button
                  onClick={handleSubscribe}
                  className={`text-xs px-6 py-2.5 rounded-full transition-all cursor-pointer shadow-sm ${
                    isSubbed
                      ? "bg-black/5 dark:bg-white/5 text-text-muted border border-border/80 font-semibold cursor-default select-none"
                      : "bg-primary hover:bg-primary-hover text-white font-black"
                  }`}
                >
                  {isSubbed ? "Subscribed" : "Subscribe"}
                </button>
              </div>
            </div>
          )}

          {/* Subscription Bundles Card Panel */}
          {!isSelf && profileData.tag !== "Fan" && (
            <div className="px-4 pb-5 space-y-2.5 select-none">
              <h3 className="text-[10px] font-black text-text-muted tracking-widest uppercase pl-1">
                SUBSCRIPTION BUNDLES
              </h3>
              <div className="border border-border rounded-2xl divide-y divide-border overflow-hidden bg-surface shadow-sm">
                {/* 3 Months */}
                <div className="p-3.5 flex items-center justify-between hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                  <div>
                    <p className="text-[12.5px] font-extrabold text-text-main">3 MONTHS (10% off)</p>
                    <p className="text-[11px] text-text-muted font-semibold mt-0.75">
                      ₹{((profileData.discountActive 
                        ? profileData.subPrice * (1 - (profileData.discountPercent || 0) / 100)
                        : profileData.subPrice) * 3 * 0.9).toFixed(2)} total
                    </p>
                  </div>
                  <button
                    onClick={() => handleSubscribeBundle(3, 10)}
                    className={`text-xs px-5 py-2 rounded-full transition-all cursor-pointer ${
                      isSubbed
                        ? "bg-black/5 dark:bg-white/5 text-text-muted border border-border/80 font-semibold cursor-default select-none"
                        : "border border-primary text-primary hover:bg-primary/5 font-black"
                    }`}
                  >
                    {isSubbed ? "Subscribed" : "Subscribe"}
                  </button>
                </div>

                {/* 6 Months */}
                <div className="p-3.5 flex items-center justify-between hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                  <div>
                    <p className="text-[12.5px] font-extrabold text-text-main">6 MONTHS (15% off)</p>
                    <p className="text-[11px] text-text-muted font-semibold mt-0.75">
                      ₹{((profileData.discountActive 
                        ? profileData.subPrice * (1 - (profileData.discountPercent || 0) / 100)
                        : profileData.subPrice) * 6 * 0.85).toFixed(2)} total
                    </p>
                  </div>
                  <button
                    onClick={() => handleSubscribeBundle(6, 15)}
                    className={`text-xs px-5 py-2 rounded-full transition-all cursor-pointer ${
                      isSubbed
                        ? "bg-black/5 dark:bg-white/5 text-text-muted border border-border/80 font-semibold cursor-default select-none"
                        : "border border-primary text-primary hover:bg-primary/5 font-black"
                    }`}
                  >
                    {isSubbed ? "Subscribed" : "Subscribe"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {profileData.subPrice > 0 && !isSubbed && !isSelf ? (
            /* Premium Subscription Lock Screen */
            <div className="p-8 text-center bg-surface border-t border-border select-none py-16 flex flex-col items-center space-y-4">
              <span className="material-symbols-outlined text-[54px] text-text-muted select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-black text-text-main">
                  Subscribe to see @{profileData.username}&apos;s posts
                </h3>
                <p className="text-xs text-text-muted max-w-[280px] mx-auto leading-relaxed font-semibold">
                  Subscribe to this profile to unlock all posts, photos, videos, and communicate with the creator.
                </p>
              </div>
              <button
                onClick={handleSubscribe}
                className="bg-primary hover:bg-primary-hover active:scale-95 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-primary/10 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>
                  Subscribe for ₹
                  {profileData.discountActive
                    ? (profileData.subPrice * (1 - (profileData.discountPercent || 0) / 100)).toFixed(2)
                    : profileData.subPrice}
                  /mo
                </span>
              </button>
            </div>
          ) : (
            <>
              {/* Grid Tabs Toggle Row */}
              <div className="flex border-b border-border select-none bg-surface">
                {renderTabButtons()}
              </div>

              {/* Grid Viewport */}
              <div className="p-3.5 select-none">
                {renderTabContent()}
              </div>
            </>
          )}
      </div>

      {/* Tipping / Post unlocks / Subscription Payment modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedPost(null);
        }}
        title={paymentTitle}
        price={paymentPrice}
        onConfirm={handleSubscribeConfirm}
      />

      {/* Lightbox Modal overlay */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
          <img
            src={selectedImage}
            alt="Expanded gallery view"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-fade-in"
          />
        </div>
      )}
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-text-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
