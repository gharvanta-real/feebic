"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { mockDb, Post, Creator, PostComment } from "@/lib/mockDb";
import { PaymentModal } from "../ui/PaymentModal";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

interface PostCardProps {
  post: Post;
  onPostUpdate?: () => void;
  defaultShowComments?: boolean;
}

const renderLinkedText = (text: string) => {
  const tokens = text.split(/(@[a-zA-Z0-9_]+|https?:\/\/[^\s]+|www\.[^\s]+)/g);

  return tokens.map((token, idx) => {
    if (!token) return null;

    if (token.startsWith("@")) {
      const username = token.slice(1).toLowerCase();
      return (
        <Link key={`${token}-${idx}`} href={`/profile?u=${username}`} className="font-extrabold text-primary hover:underline">
          {token}
        </Link>
      );
    }

    if (token.startsWith("http://") || token.startsWith("https://") || token.startsWith("www.")) {
      const href = token.startsWith("www.") ? `https://${token}` : token;
      return (
        <a
          key={`${token}-${idx}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-primary hover:underline break-all"
        >
          {token}
        </a>
      );
    }

    return token;
  });
};

export const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onPostUpdate, defaultShowComments = false }) => {
  const { user, subscriptions, showToast } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [post, setPost] = useState<Post>(initialPost);
  const [repostedBy, setRepostedBy] = useState<string | null>(initialPost.repostedBy || null);
  const [repostedFromId, setRepostedFromId] = useState<string | null>(initialPost.repostedFromId || null);

  useEffect(() => {
    if (initialPost.repostedFromId) {
      setTimeout(() => {
        const posts = mockDb.getPosts(true);
        const original = posts.find(p => p.id === initialPost.repostedFromId);
        if (original) {
          setPost(original);
        }
      }, 0);
    } else {
      setPost(initialPost);
    }
    setRepostedBy(initialPost.repostedBy || null);
    setRepostedFromId(initialPost.repostedFromId || null);
  }, [initialPost]);

  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  // Comments accordion state
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");

  // Locked payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTitle, setPaymentTitle] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"unlock" | "tip" | "fundraiser">("unlock");

  // Tip state
  const [tipAmount, setTipAmount] = useState("5.00");
  const [showTipPanel, setShowTipPanel] = useState(false);

  // Poll state
  const [votedOption, setVotedOption] = useState<number | null>(null);

  // Fundraiser input state
  const [fundraiseAmount, setFundraiseAmount] = useState("");

  // Carousel Index
  const [carouselIndex, setCarouselIndex] = useState(0);

  // More Options Dropdown
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const creator: Creator | null = mockDb.getCreator(post.creatorUsername);
  const isSubscribed = subscriptions.includes(post.creatorUsername);
  const isUnlocked = mockDb.isUnlocked(post.id);
  const isSubscriptionGated = post.isPremium && post.price === 0;
  const isPPV = post.isPremium && post.price > 0;
  const isLocked = post.isPremium && !isSubscribed && !isUnlocked;

  useEffect(() => {
    setTimeout(() => {
      setIsLiked(mockDb.isPostLiked(post.id));
      setIsBookmarked(mockDb.isBookmarked(post.id));
      if (post.poll && post.poll.votedOptionIndex !== undefined) {
        setVotedOption(post.poll.votedOptionIndex);
      }
      if (defaultShowComments) {
        setComments(mockDb.getComments(post.id));
      }
    }, 0);
  }, [post.id, defaultShowComments]);

  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMoreMenu]);

  const handleLike = () => {
    const res = mockDb.toggleLikePost(post.id);
    setIsLiked(res.isLiked);
    setPost({ ...post, likes: res.likes });
    if (res.isLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 400);
    }
  };

  const handleBookmark = () => {
    const res = mockDb.toggleBookmark(post.id);
    setIsBookmarked(res);
    showToast(res ? "Post bookmarked" : "Removed from bookmarks");
  };

  const handleShare = () => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.content.slice(0, 60), url: link }).catch(() => {});
    } else {
      navigator.clipboard.writeText(link);
      showToast("Post link copied to clipboard!");
    }
  };

  const handleToggleComments = () => {
    if (pathname !== `/post/${post.id}`) {
      router.push(`/post/${post.id}`);
      return;
    }
    const next = !showComments;
    setShowComments(next);
    if (next) {
      setComments(mockDb.getComments(post.id));
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newComment = mockDb.addComment(post.id, newCommentText);
    setComments([...comments, newComment]);
    setNewCommentText("");
    setPost({ ...post, commentsCount: post.commentsCount + 1 });
  };

  const triggerUnlock = () => {
    setPaymentMode("unlock");
    setPaymentTitle(isPPV ? `Unlock content by @${post.creatorUsername}` : `Subscribe to @${post.creatorUsername}`);
    setPaymentPrice(post.price);
    setIsPaymentOpen(true);
  };

  const triggerTip = (amount: number) => {
    setPaymentMode("tip");
    setPaymentTitle(`Send tip to @${post.creatorUsername}`);
    setPaymentPrice(amount);
    setIsPaymentOpen(true);
    setShowTipPanel(false);
  };

  const handlePaymentConfirm = () => {
    if (paymentMode === "unlock") {
      mockDb.unlockContent(post.id, post.price);
      showToast("Content unlocked successfully!");
      if (onPostUpdate) onPostUpdate();
      setPost({ ...post });
    } else if (paymentMode === "tip") {
      mockDb.adjustWalletBalance(-paymentPrice, `Tip to @${post.creatorUsername}`, post.creatorUsername);
      showToast(`Tip of $${paymentPrice.toFixed(2)} sent to @${post.creatorUsername}! 💰`);
    } else if (paymentMode === "fundraiser") {
      handleContributionSuccess();
    }
  };

  const handlePollVote = (index: number) => {
    if (votedOption !== null && votedOption !== undefined) return;
    mockDb.votePoll(post.id, index);
    setVotedOption(index);
    const updatedPosts = mockDb.getPosts(true);
    const updatedPost = updatedPosts.find((p) => p.id === post.id);
    if (updatedPost) setPost(updatedPost);
    showToast("Vote recorded");
  };

  const handleFundraiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fundraiseAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Enter a valid contribution amount");
      return;
    }
    setPaymentMode("fundraiser");
    setPaymentTitle(`Contribute to @${post.creatorUsername}'s fundraiser`);
    setPaymentPrice(amt);
    setIsPaymentOpen(true);
  };

  const handleContributionSuccess = () => {
    const amt = parseFloat(fundraiseAmount);
    mockDb.contributeFundraiser(post.id, amt);
    setFundraiseAmount("");
    const updatedPosts = mockDb.getPosts(true);
    const updatedPost = updatedPosts.find((p) => p.id === post.id);
    if (updatedPost) setPost(updatedPost);
    showToast(`Contributed $${amt.toFixed(2)} successfully!`);
  };

  // Video player controls
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        showToast("Tap the video controls to play");
      });
    }
  };

  const handleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVideoProgress = () => {
    if (!videoRef.current) return;
    const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setVideoProgress(isNaN(prog) ? 0 : prog);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  // Carousel helpers
  const nextSlide = (mediaLength: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndex((prev) => (prev + 1) % mediaLength);
  };
  const prevSlide = (mediaLength: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndex((prev) => (prev - 1 + mediaLength) % mediaLength);
  };

  const renderVideoPlayer = (src: string) => (
    <div className="relative w-full group bg-black" style={{ maxHeight: 300 }}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className="w-full max-h-[300px] object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleVideoProgress}
        onEnded={() => setIsPlaying(false)}
        onClick={(e) => {
          e.preventDefault();
          handlePlayPause();
        }}
      />
      {/* Custom controls overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/45 via-transparent to-transparent">
        {/* Progress bar */}
        <div
          className="pointer-events-auto w-full h-1 bg-white/30 cursor-pointer mx-0 mb-1"
          onClick={handleSeek}
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${videoProgress}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 pb-2">
          <button
            onClick={handlePlayPause}
            className="pointer-events-auto text-white hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
          <button
            onClick={handleMute}
            className="pointer-events-auto text-white hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
          </button>
          <span className="material-symbols-outlined pointer-events-auto text-[15px] text-white/80 ml-auto cursor-pointer hover:text-white"
            onClick={() => videoRef.current?.requestFullscreen()}>
            fullscreen
          </span>
        </div>
      </div>
      {/* Play overlay when paused */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="h-11 w-11 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderMediaGrid = () => {
    const urls = post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : []);
    if (urls.length === 0) return null;

    if (urls.length === 1) {
      return (
        <div className="w-full h-full relative">
          {post.mediaType === "video" ? (
            renderVideoPlayer(urls[0])
          ) : (
            <img src={urls[0]} alt="Post Media" className="w-full max-h-[300px] object-cover hover:scale-[1.01] transition-transform duration-300" />
          )}
        </div>
      );
    }

    if (post.creatorUsername === "demirose" || urls.length === 6) {
      return (
        <div className="flex gap-2 w-full h-[380px] overflow-hidden select-none">
          <div className="w-[65%] h-full relative bg-black overflow-hidden group rounded-xl">
            <img src={urls[carouselIndex]} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02] cursor-pointer" alt="main" />
            <button onClick={(e) => prevSlide(urls.length, e)} className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button onClick={(e) => nextSlide(urls.length, e)} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
            <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider">
              {carouselIndex + 1}/{urls.length}
            </div>
          </div>
          <div className="w-[35%] h-full flex flex-col gap-2">
            {urls.slice(1, 4).map((url, idx) => {
              const isActive = urls.indexOf(url) === carouselIndex;
              return (
                <div key={idx} onClick={() => setCarouselIndex(urls.indexOf(url))} className={`flex-1 overflow-hidden relative cursor-pointer border-2 rounded-xl ${isActive ? "border-primary" : "border-transparent"}`}>
                  <img src={url} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" alt="sub" />
                  {idx === 2 && urls.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-black text-sm">+{urls.length - 4}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (post.creatorUsername === "austinwolf" || urls.length === 5) {
      return (
        <div className="flex gap-2 w-full h-[380px] overflow-hidden select-none">
          <div className="w-[65%] h-full relative bg-black overflow-hidden group rounded-xl">
            {post.mediaType === "video" && carouselIndex === 0 ? (
              renderVideoPlayer(urls[0])
            ) : (
              <img src={urls[carouselIndex]} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02] cursor-pointer" alt="main" />
            )}
            <button onClick={(e) => prevSlide(urls.length, e)} className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button onClick={(e) => nextSlide(urls.length, e)} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
            <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider">
              {carouselIndex + 1}/{urls.length}
            </div>
          </div>
          <div className="w-[35%] h-full grid grid-cols-2 grid-rows-2 gap-2">
            {urls.slice(1, 5).map((url, idx) => {
              const isActive = urls.indexOf(url) === carouselIndex;
              return (
                <div key={idx} onClick={() => setCarouselIndex(urls.indexOf(url))} className={`overflow-hidden relative cursor-pointer border-2 rounded-xl ${isActive ? "border-primary" : "border-transparent"}`}>
                  <img src={url} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" alt="sub" />
                  {urls.indexOf(url) === 0 && post.mediaType === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Default: horizontal carousel
    return (
      <div className="w-full h-[380px] relative bg-black overflow-hidden group select-none">
        <img src={urls[carouselIndex]} alt="Slide" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.01]" />
        <button onClick={(e) => prevSlide(urls.length, e)} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100">
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
        </button>
        <button onClick={(e) => nextSlide(urls.length, e)} className="absolute right-3.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100">
          <span className="material-symbols-outlined text-[22px]">chevron_right</span>
        </button>
        <div className="absolute top-3.5 right-3.5 bg-black/60 text-white text-[10px] font-black px-2.5 py-1 rounded-full select-none tracking-wider">
          {carouselIndex + 1}/{urls.length}
        </div>
        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {urls.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setCarouselIndex(i); }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === carouselIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const isQueued = initialPost.publishAt && new Date(initialPost.publishAt).getTime() > Date.now();

  return (
    <article className="rounded-3xl border border-border/60 bg-surface p-4 md:p-5 space-y-3.5 transition-colors duration-200 hover:border-primary/20">
      {/* Scheduled Queue header indicator */}
      {isQueued && (
        <div className="bg-primary/10 border border-primary/20 text-primary px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 select-none w-fit">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span>Scheduled for {new Date(initialPost.publishAt!).toLocaleString()}</span>
        </div>
      )}

      {/* Repost Header */}
      {repostedFromId && (
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-black uppercase tracking-wider select-none border-b border-border/40 pb-2">
          <span className="material-symbols-outlined text-[15px]">repeat</span>
          <span>@{repostedBy} reposted</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between select-none px-0.5">
        <Link href={`/profile?u=${post.creatorUsername}`} className="flex items-center gap-3 group min-w-0">
          <img
            src={post.creatorAvatar}
            alt={post.creatorName}
            className="h-11 w-11 rounded-full object-cover border border-border group-hover:opacity-95 transition-opacity shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-[13.5px] font-extrabold text-text-main truncate group-hover:text-primary transition-colors leading-none">
                {post.creatorName}
              </p>
              {creator?.verified && (
                <VerifiedBadge size="sm" />
              )}
            </div>
            <p className="text-[11px] text-text-muted truncate mt-1">
              @{post.creatorUsername} • {post.time}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {/* Tip button (visible only on unlocked posts) */}
          {!isLocked && (
            <div className="relative">
              <button
                onClick={() => setShowTipPanel(!showTipPanel)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-[10px] font-black text-text-muted hover:border-success hover:text-success transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">payments</span>
                Tip
              </button>
              {showTipPanel && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-border rounded-2xl p-3 z-40 space-y-2 animate-fade-in">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Send a Tip</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 25, 50].map(amt => (
                      <button key={amt} onClick={() => triggerTip(amt)}
                        className="py-1.5 border border-border rounded-lg text-[10px] font-black text-text-main hover:border-success hover:text-success transition-colors cursor-pointer">
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <div className="flex-grow flex items-center bg-background border border-border rounded-lg px-2 py-1 focus-within:border-success transition-colors">
                      <span className="text-[10px] font-bold text-text-muted mr-0.5">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(e.target.value)}
                        className="w-full text-[10px] bg-transparent outline-none text-text-main font-bold"
                        placeholder="Custom"
                      />
                    </div>
                    <button
                      onClick={() => triggerTip(parseFloat(tipAmount) || 5)}
                      className="bg-success text-white text-[10px] font-black px-2 rounded-lg cursor-pointer hover:opacity-90"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* More menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="text-text-muted hover:text-text-main transition-colors cursor-pointer p-1"
            >
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-1.5 w-46 bg-surface border border-border rounded-2xl p-1.5 z-40 flex flex-col gap-0.5 animate-fade-in">
                <button
                  onClick={() => { handleShare(); setShowMoreMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-text-main hover:text-primary hover:bg-primary/5 rounded-xl w-full text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">ios_share</span>
                  Share Post
                </button>
                <button
                  onClick={() => { handleBookmark(); setShowMoreMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-text-main hover:text-primary hover:bg-primary/5 rounded-xl w-full text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">{isBookmarked ? "bookmark_remove" : "bookmark"}</span>
                  {isBookmarked ? "Remove Bookmark" : "Bookmark Post"}
                </button>
                {!isLocked && !repostedFromId && (
                  <button
                    onClick={() => {
                      mockDb.repostPost(post.id);
                      showToast("Post reposted to your feed! 🔄");
                      setShowMoreMenu(false);
                      if (onPostUpdate) onPostUpdate();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-text-main hover:text-primary hover:bg-primary/5 rounded-xl w-full text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">repeat</span>
                    Repost Post
                  </button>
                )}
                <button
                  onClick={() => {
                    mockDb.reportPost(post.id);
                    showToast("Post reported. Thank you!");
                    setShowMoreMenu(false);
                    if (onPostUpdate) onPostUpdate();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-text-main hover:text-primary hover:bg-primary/5 rounded-xl w-full text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">flag</span>
                  Report Post
                </button>

                {user && user.username === post.creatorUsername && (
                  <>
                    <hr className="border-border/50 my-1" />
                    <button
                      onClick={() => {
                        if (confirm("Delete this post?")) {
                          mockDb.deletePost(post.id);
                          showToast("Post deleted");
                          if (onPostUpdate) onPostUpdate();
                        }
                        setShowMoreMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-[11px] font-black text-red-500 hover:bg-red-500/10 rounded-xl w-full text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Delete Post
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post text */}
      <p className="text-[13px] leading-relaxed text-text-main whitespace-pre-wrap font-medium px-0.5">
        {renderLinkedText(post.content)}
      </p>

      {/* Poll */}
      {post.poll && (
        <div className="border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{post.poll.question}</p>
          <div className="space-y-2">
            {post.poll.options.map((option, idx) => {
              const totalVotes = post.poll?.options.reduce((sum, o) => sum + o.votes, 0) || 1;
              const percent = Math.round((option.votes / totalVotes) * 100);
              const isVoted = votedOption === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handlePollVote(idx)}
                  disabled={votedOption !== null && votedOption !== undefined}
                  className={`w-full relative flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all overflow-hidden cursor-pointer ${
                    isVoted ? "border-primary font-bold text-primary" : "border-border hover:border-text-muted"
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-500" style={{ width: `${percent}%` }} />
                  <span className="relative z-10">{option.text}</span>
                  <span className="relative z-10 font-bold text-xs text-text-muted">{percent}%</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fundraiser */}
      {post.fundraiser && (
        <div className="border border-border rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-text-muted uppercase tracking-wider">Fundraiser: {post.fundraiser.title}</span>
            <span className="font-extrabold text-primary">${post.fundraiser.current} / ${post.fundraiser.goal}</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (post.fundraiser.current / post.fundraiser.goal) * 100)}%` }} />
          </div>
          <form onSubmit={handleFundraiseSubmit} className="flex gap-2">
            <div className="relative flex-grow flex items-center bg-background border border-border rounded-full px-4 py-1.5 focus-within:border-primary transition-all">
              <span className="text-sm font-bold text-text-muted mr-1">$</span>
              <input
                type="number"
                placeholder="Amount..."
                value={fundraiseAmount}
                onChange={(e) => setFundraiseAmount(e.target.value)}
                className="w-full text-sm bg-transparent outline-none placeholder-text-muted text-text-main"
              />
            </div>
            <button type="submit" className="bg-primary text-white hover:opacity-90 active:scale-95 text-xs font-bold px-4 rounded-full transition-all cursor-pointer">
              Contribute
            </button>
          </form>
        </div>
      )}

      {/* Media Section */}
      <div className="relative rounded-2xl overflow-hidden border border-border">
        {isLocked ? (
          <div className="relative flex flex-col items-center justify-center min-h-[225px] p-6 text-center z-10">
            <div
              className="absolute inset-0 filter blur-3xl opacity-35 scale-105 pointer-events-none"
              style={{
                backgroundImage: `url(${post.mediaUrl || (post.mediaUrls && post.mediaUrls[0])})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              {/* Video indicator on locked video */}
              {post.mediaType === "video" && (
                <div className="h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                </div>
              )}
              {post.mediaType !== "video" && (
                <span className="material-symbols-outlined text-[28px] text-white leading-none">lock</span>
              )}
              <h4 className="text-[15.5px] font-black text-white tracking-wide">
                {isPPV ? "Premium content locked" : "Subscribe to see this post"}
              </h4>
              <p className="text-[11.5px] text-white/80 max-w-[300px] font-medium leading-relaxed">
                {isPPV
                  ? `Unlock this exclusive ${post.mediaType === "video" ? "video" : "post"} for a one-time payment.`
                  : "Join now to access exclusive photos and videos from this creator."}
              </p>
              <button
                onClick={triggerUnlock}
                className="bg-primary hover:bg-primary-hover active:scale-95 text-white px-7 py-2.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                {isPPV ? (
                  <>
                    <span className="material-symbols-outlined text-[15px]">lock_open</span>
                    Unlock for ${post.price}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">star</span>
                    Subscribe Now
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          renderMediaGrid()
        )}
      </div>

      {/* Action Bar */}
      {!isLocked && (
        <div className="flex items-center gap-5 pt-1 select-none px-0.5">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
              isLiked ? "text-primary" : "text-text-muted hover:text-text-main"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] leading-none transition-transform ${likeAnim ? "scale-150" : "scale-100"}`}
              style={isLiked ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              favorite
            </span>
            <span>{post.likes.toLocaleString()}</span>
          </button>

          {/* Comments */}
          <button
            onClick={handleToggleComments}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
              showComments ? "text-primary" : "text-text-muted hover:text-text-main"
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px] leading-none"
              style={showComments ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              chat_bubble
            </span>
            <span>{post.commentsCount}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-main transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">ios_share</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            className={`ml-auto flex items-center transition-colors cursor-pointer ${
              isBookmarked ? "text-primary" : "text-text-muted hover:text-text-main"
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px] leading-none"
              style={isBookmarked ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              bookmark
            </span>
          </button>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border pt-4 space-y-4 animate-fade-in">
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 no-scrollbar">
            {comments.length === 0 ? (
              <p className="text-xs text-text-muted py-2 text-center">No comments yet. Be the first!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 text-xs items-start animate-fade-in">
                  <Link href={`/profile?u=${comment.username}`}>
                    <img src={comment.avatar} alt={comment.name} className="h-8 w-8 rounded-full object-cover border border-border shrink-0" />
                  </Link>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                  <Link href={`/profile?u=${comment.username}`} className="font-extrabold text-text-main hover:text-primary truncate leading-none">
                        {comment.name}
                      </Link>
                      <span className="text-[10px] text-text-muted shrink-0">{comment.time}</span>
                    </div>
                    <p className="text-text-main leading-relaxed break-words font-medium">{renderLinkedText(comment.text)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <form onSubmit={handleAddComment} className="flex gap-2 items-center">
            {user && (
              <img src={user.avatar} alt="You" className="h-7 w-7 rounded-full object-cover border border-border shrink-0" />
            )}
            <input
              type="text"
              placeholder="Add a comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-grow px-4 py-2 bg-background border border-border rounded-full text-xs outline-none focus:border-primary transition-all placeholder-text-muted font-medium"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="bg-primary text-white disabled:opacity-40 hover:opacity-90 active:scale-95 text-xs font-black px-4 py-2 rounded-full transition-all cursor-pointer shrink-0"
            >
              Post
            </button>
          </form>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={paymentTitle}
        price={paymentPrice}
        onConfirm={handlePaymentConfirm}
      />
    </article>
  );
};
