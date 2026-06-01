"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { mockDb, Creator, Post } from "@/lib/mockDb";
import { PaymentModal } from "@/components/ui/PaymentModal";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, subscriptions, subscribeToCreator, favoriteCreators, toggleFavorite, blockedUsers, toggleBlock, showToast } = useUser();

  const queryUser = searchParams.get("u") || "";
  
  const [profileData, setProfileData] = useState<Creator | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "photos" | "videos" | "likes">("posts");

  // Payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTitle, setPaymentTitle] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Lightbox visual overlay state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchProfile = () => {
    if (!user) return;

    const username = queryUser.replace("@", "").trim();
    const ownUsername = user.username.replace("@", "").trim();

    if (!username || username === ownUsername) {
      // Viewing own profile
      setIsSelf(true);
      setProfileData({
        name: user.displayName,
        username: user.username,
        avatar: user.avatar,
        cover: user.coverPhoto,
        bio: user.bio,
        location: user.location || "Los Angeles, CA",
        website: user.website || "lanarhoades.fans",
        likes: "7.8K",
        subPrice: 14.99,
        verified: user.role === "creator",
        tag: user.role === "creator" ? "Creator" : "Fan",
        fansCount: "1.1K",
        postsCount: "1.2K",
        photosCount: "228",
        videosCount: "356",
        joinedDate: "Sep 2020"
      });
      setPosts(mockDb.getPostsByUser(user.username));
    } else {
      // Viewing someone else's profile
      setIsSelf(false);
      const creator = mockDb.getCreator(username);
      if (creator) {
        setProfileData(creator);
        setPosts(mockDb.getPostsByUser(username));
      } else {
        // Fallback or invalid user
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
    const isUnlocked = mockDb.isUnlocked(post.id);
    return !isSubbed && !isUnlocked;
  };

  const handleSubscribe = () => {
    if (isSubbed) return;
    setPaymentTitle(`Subscribe to @${profileData.username}`);
    setPaymentPrice(profileData.subPrice);
    setSelectedPost(null);
    setIsPaymentOpen(true);
  };

  const handleSubscribeBundle = (months: number, discount: number) => {
    if (isSubbed) return;
    const price = parseFloat((profileData.subPrice * months * (1 - discount / 100)).toFixed(2));
    setPaymentTitle(`Subscribe to @${profileData.username} for ${months} Months`);
    setPaymentPrice(price);
    setSelectedPost(null);
    setIsPaymentOpen(true);
  };

  const handleSubscribeConfirm = () => {
    if (selectedPost) {
      mockDb.unlockContent(selectedPost.id, selectedPost.price);
      showToast(`Successfully unlocked post content!`);
      setSelectedPost(null);
    } else {
      subscribeToCreator(profileData.username, paymentPrice);
      showToast(`Successfully subscribed to @${profileData.username}!`);
    }
    setIsPaymentOpen(false);
    fetchProfile();
  };

  const handleToggleFavorite = () => {
    const res = toggleFavorite(profileData.username);
    showToast(res ? `Added @${profileData.username} to favorites` : `Removed @${profileData.username} from favorites`);
  };

  const handleToggleBlock = () => {
    const res = toggleBlock(profileData.username);
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
    if (activeTab === "posts") {
      return posts;
    } else if (activeTab === "photos") {
      return posts.filter(p => p.mediaType === "image");
    } else if (activeTab === "videos") {
      return posts.filter(p => p.mediaType === "video");
    } else if (activeTab === "likes") {
      return posts.filter(p => mockDb.isPostLiked(p.id));
    }
    return posts;
  };

  const filteredPosts = getFilteredPosts();

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

          {/* Subscription Banner */}
          <div className="px-4 pb-4">
            <div className="bg-[#e8f5ff] dark:bg-primary/8 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[13px] font-black text-text-main font-sans">Subscription</p>
                <p className="text-[11.5px] text-text-muted font-bold mt-0.75">${profileData.subPrice} per month</p>
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

          {/* Subscription Bundles Card Panel */}
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
                    ${(profileData.subPrice * 3 * 0.9).toFixed(2)} total
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
                    ${(profileData.subPrice * 6 * 0.85).toFixed(2)} total
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
                <span>Subscribe for ${profileData.subPrice}/mo</span>
              </button>
            </div>
          ) : (
            <>
              {/* Grid Tabs Toggle Row */}
              <div className="flex border-b border-border select-none bg-surface">
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
              </div>

              {/* Grid Viewport */}
              <div className="p-3.5 select-none">
                {filteredPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-2.5">
                    <span className="material-symbols-outlined text-[44px] text-text-muted">feed</span>
                    <p className="text-xs font-extrabold text-text-main uppercase tracking-wider">No updates listed</p>
                    <p className="text-[11px] text-text-muted max-w-[240px]">This tab has no active media updates published.</p>
                  </div>
                ) : (
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
                              {/* Blurred cover preview */}
                              <img
                                src={post.mediaUrl}
                                alt="Locked content preview"
                                className="h-full w-full object-cover filter blur-[9px] scale-[1.06] opacity-[0.76]"
                              />
                              {/* Lock graphic block */}
                              <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center text-white">
                                <span className="material-symbols-outlined text-[18px] text-white/95 leading-none mb-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  lock
                                </span>
                                <span className="text-[10px] font-black text-white/90 bg-black/40 px-2 py-0.75 rounded-full tracking-wider shadow-sm">
                                  ${post.price}
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
                )}
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
