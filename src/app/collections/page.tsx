"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { mockDb, Post } from "@/lib/mockDb";
import { PostCard } from "@/components/features/PostCard";
import { PaymentModal } from "@/components/ui/PaymentModal";

export default function BookmarkedCollectionsPage() {
  const { refreshUserProfile, subscriptions, showToast } = useUser();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "photos" | "videos" | "locked">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Lightbox & Checkout states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTitle, setPaymentTitle] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const fetchBookmarks = () => {
    setBookmarkedPosts(mockDb.getBookmarkedPosts());
  };

  useEffect(() => {
    refreshUserProfile();
    setTimeout(() => {
      fetchBookmarks();
    }, 0);

    const handleBookmarkChange = () => fetchBookmarks();
    window.addEventListener("ch_bookmark_changed", handleBookmarkChange);
    return () => window.removeEventListener("ch_bookmark_changed", handleBookmarkChange);
  }, []);

  const isPostLocked = (post: Post) => {
    if (!post.isPremium) return false;
    const isUnlocked = mockDb.isUnlocked(post.id);
    const isSubbed = subscriptions.includes(post.creatorUsername);
    return !isSubbed && !isUnlocked;
  };

  const handleMediaClick = (post: Post) => {
    if (isPostLocked(post)) {
      setSelectedPost(post);
      setPaymentTitle(`Unlock premium content by @${post.creatorUsername}`);
      setPaymentPrice(post.price);
      setIsPaymentOpen(true);
    } else {
      setSelectedImage(post.mediaUrl);
    }
  };

  const handlePaymentConfirm = () => {
    if (selectedPost) {
      mockDb.unlockContent(selectedPost.id, selectedPost.price);
      showToast(`Successfully unlocked post content!`);
      setSelectedPost(null);
    }
    setIsPaymentOpen(false);
    fetchBookmarks();
  };

  const getFilteredBookmarks = () => {
    switch (activeTab) {
      case "photos":
        return bookmarkedPosts.filter((p) => p.mediaType === "image");
      case "videos":
        return bookmarkedPosts.filter((p) => p.mediaType === "video");
      case "locked":
        return bookmarkedPosts.filter((p) => p.isPremium);
      default:
        return bookmarkedPosts;
    }
  };

  const filteredBookmarks = getFilteredBookmarks();

  return (
    <AppShell>
      {/* Mobile Top Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted select-none">Bookmarks</span>
      </MobileHeader>

      {/* Main Content (Touching Sidebar) */}
      <div className="app-page-shell space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-border gap-4 select-none">
            <div className="space-y-1">
              <h1 className="text-lg font-black text-text-main font-sans tracking-tight">Saved Collections</h1>
              <p className="text-xs text-text-muted font-medium">Total of {bookmarkedPosts.length} saved updates and clips</p>
            </div>

            {/* View Mode controls */}
            <div className="flex bg-surface border border-border p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === "grid" ? "bg-primary text-white" : "text-text-muted hover:text-text-main"
                }`}
                title="Gallery Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === "list" ? "bg-primary text-white" : "text-text-muted hover:text-text-main"
                }`}
                title="List Feed View"
              >
                <span className="material-symbols-outlined text-[18px]">view_agenda</span>
              </button>
            </div>
          </div>

          {/* Tab category filters */}
          <div className="flex items-center justify-between border-b border-border pb-0 select-none bg-transparent">
            <div className="flex gap-6 overflow-x-auto no-scrollbar w-full">
              {([
                { key: "all", label: "All Saved", icon: "bookmarks" },
                { key: "photos", label: "Photos", icon: "image" },
                { key: "videos", label: "Videos", icon: "play_circle" },
                { key: "locked", label: "Locked (PPV)", icon: "lock" }
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`text-[14px] font-extrabold pb-3.5 cursor-pointer transition-all border-b-2 leading-none relative flex items-center gap-1.5 shrink-0 ${
                    activeTab === tab.key
                      ? "border-primary text-primary font-black"
                      : "border-transparent text-text-muted hover:text-text-main"
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px] leading-none" style={{ fontVariationSettings: activeTab === tab.key ? "'FILL' 1" : undefined }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bookmarked Feed Scroll / Gallery Grid */}
          <div className="space-y-6">
            {filteredBookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 select-none">
                <span className="material-symbols-outlined text-[64px] text-text-muted">bookmarks</span>
                <h3 className="text-base font-extrabold text-text-main">No saved bookmarks</h3>
                <p className="text-xs text-text-muted max-w-[280px]">
                  When you save or bookmark posts from your home updates feed, they will appear inside this gallery list.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              /* High-fidelity OnlyFans media gallery grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 select-none">
                {filteredBookmarks.map((post) => {
                  const locked = isPostLocked(post);
                  return (
                    <div
                      key={post.id}
                      onClick={() => handleMediaClick(post)}
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-surface-container border border-border/40 transition-transform duration-200 hover:scale-[1.02]"
                    >
                      {locked ? (
                        <>
                          {/* Blurred Cover preview */}
                          <img
                            src={post.mediaUrl}
                            alt="Locked content preview"
                            className="h-full w-full object-cover filter blur-[10px] scale-[1.05] opacity-75"
                          />
                          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[18px] text-white/95 leading-none mb-1.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                              lock
                            </span>
                            <span className="text-[10px] font-black text-white/90 bg-black/40 px-2.5 py-1 rounded-full tracking-wider shadow-sm">
                              Unlock ${post.price}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <img
                            src={post.mediaUrl}
                            alt="Gallery item"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {post.mediaType === "video" && (
                            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 pointer-events-none">
                              <span className="material-symbols-outlined text-[12px]">play_circle</span>
                              <span>VIDEO</span>
                            </span>
                          )}
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                            <p className="text-[10px] font-black leading-none mb-1">@{post.creatorUsername}</p>
                            <p className="text-[9px] opacity-80 leading-none">View attachment details</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Standard Full Card feed scroll */
              <div className="space-y-5">
                {filteredBookmarks.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostUpdate={fetchBookmarks}
                  />
                ))}
              </div>
            )}
          </div>
      </div>

      {/* Lightbox Modal overlay */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[36px]">close</span>
          </button>
          <img
            src={selectedImage}
            alt="Expanded gallery view"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-fade-in"
          />
        </div>
      )}

      {/* Secure Checkout popup */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedPost(null);
        }}
        title={paymentTitle}
        price={paymentPrice}
        onConfirm={handlePaymentConfirm}
      />
    </AppShell>
  );
}
