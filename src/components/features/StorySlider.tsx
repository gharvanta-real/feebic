"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Story } from "@/lib/mockDb";
import { useUser } from "@/context/UserContext";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { apiClient } from "@/lib/apiClient";


export const StorySlider: React.FC = () => {
  const { user, showToast } = useUser();
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [storyTimer, setStoryTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      const data = await apiClient.get<Story[]>("/stories");
      setStoriesError(null);
      setStories(data);
    } catch (err) {
      setStories([]);
      setStoriesError(err instanceof Error ? err.message : "Unable to load stories from the API.");
    }
  }, []);


  useEffect(() => {
    if (user) {
      setTimeout(() => {
        fetchStories();
      }, 0);
    }
    
    // Listen to background story update triggers
    const handleStoriesUpdate = () => {
      if (user) {
        fetchStories();
      }
    };
    window.addEventListener("ch_stories_updated", handleStoriesUpdate);
    return () => window.removeEventListener("ch_stories_updated", handleStoriesUpdate);
  }, [user, fetchStories]);

  const handleAddStory = async () => {
    if (!user) return;
    const premiumAssets = [
      "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
      "/assets/082f4723389abb44b68b64dfc082268b.png",
      "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
      "/assets/26ad03d14c762b66bec524c5aeb135d6.png",
      "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png"
    ];
    const randomAsset = premiumAssets[Math.floor(Math.random() * premiumAssets.length)];
    
    try {
      await apiClient.post("/stories", {
        story_url: randomAsset,
        location: "India"
      });
      showToast("Story added successfully to backend!");
      await fetchStories();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to publish story to backend");
    }
  };


  const handleOpenStory = (story: Story) => {
    setStories(prev => prev.map(s => s.username === story.username ? { ...s, isUnread: false } : s));
    
    setActiveStory(story);
    setActiveSlideIdx(0);
    if (story.items?.[0]) {
      apiClient.post(`/stories/${story.items[0].id}/view`).catch(() => {});
    }
    startTimer(0, story);
  };

  const handleCloseStory = () => {
    if (storyTimer) clearTimeout(storyTimer);
    setActiveStory(null);
  };

  const startTimer = (slideIdx: number, story: Story) => {
    if (storyTimer) clearTimeout(storyTimer);
    
    const timer = setTimeout(() => {
      handleNextSlide(slideIdx, story);
    }, 4000); // 4 seconds per story slide
    
    setStoryTimer(timer);
  };

  const handleNextSlide = (currentIdx: number, story: Story) => {
    if (!story.items) return;
    
    if (currentIdx + 1 < story.items.length) {
      const nextIdx = currentIdx + 1;
      setActiveSlideIdx(nextIdx);
      apiClient.post(`/stories/${story.items[nextIdx].id}/view`).catch(() => {});
      startTimer(nextIdx, story);
    } else {
      // Find the next unread story or close
      const storyIdx = stories.findIndex((s) => s.username === story.username);
      if (storyIdx + 1 < stories.length) {
        const nextStory = stories[storyIdx + 1];
        handleOpenStory(nextStory);
      } else {
        handleCloseStory();
      }
    }
  };

  const handlePrevSlide = (currentIdx: number, story: Story) => {
    if (!story.items) return;
    
    if (currentIdx - 1 >= 0) {
      const prevIdx = currentIdx - 1;
      setActiveSlideIdx(prevIdx);
      apiClient.post(`/stories/${story.items[prevIdx].id}/view`).catch(() => {});
      startTimer(prevIdx, story);
    } else {
      // Find the previous story or close
      const storyIdx = stories.findIndex((s) => s.username === story.username);
      if (storyIdx - 1 >= 0) {
        const prevStory = stories[storyIdx - 1];
        setActiveStory(prevStory);
        const lastIdx = (prevStory.items?.length || 1) - 1;
        setActiveSlideIdx(lastIdx);
        startTimer(lastIdx, prevStory);
      } else {
        handleCloseStory();
      }
    }
  };

  return (
    <>
      {/* 1. Horizontal Stories Slider bar */}
      <div className="flex gap-4 overflow-x-auto rounded-3xl border border-border/60 bg-surface px-4 py-4 no-scrollbar select-none">
        {/* 'Your Story' button - White circle with blue plus symbol (100% Screenshot replica) */}
        {user && (
          <button
            onClick={handleAddStory}
            className="flex flex-col items-center focus:outline-none shrink-0 cursor-pointer"
          >
            <div className="h-[62px] w-[62px] rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 relative">
              <span className="material-symbols-outlined text-primary text-[22px] font-black leading-none">add</span>
            </div>
            <span className="text-[11px] font-semibold text-text-muted mt-2 select-none leading-none">
              Your Story
            </span>
          </button>
        )}

        {stories.map((story) => {
          // Truncate name beautifully
          let displayName = story.name;
          if (displayName === "Lana R.") displayName = "Lana";
          if (displayName.length > 5 && displayName !== "Nicole") displayName = displayName.slice(0, 4) + "...";

          return (
            <button
              key={story.username}
              onClick={() => handleOpenStory(story)}
              className="flex flex-col items-center focus:outline-none shrink-0"
            >
              {/* Avatar circle (100% Screenshot replica) */}
              <div className="relative p-[1.5px] rounded-full bg-border transition-transform duration-200 hover:scale-105 active:scale-95">
                <img
                  src={story.avatar}
                  alt={story.name}
                  className="h-[60px] w-[60px] rounded-full object-cover border border-surface"
                />
              </div>
              
              {/* Name label with checkmark */}
              <div className="flex items-center gap-0.5 mt-2">
                <span className="text-[11px] font-semibold text-text-main leading-none">
                  {displayName}
                </span>
                <VerifiedBadge size="xs" />
              </div>
            </button>
          );
        })}

        {storiesError && (
          <div className="flex min-w-[220px] items-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-xs font-bold text-red-400">
            Stories API unavailable
          </div>
        )}
      </div>


      {/* 2. Full-Screen Interactive Story Viewer Overlay */}
      {activeStory && activeStory.items && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 select-none animate-fade-in p-4 md:p-8">
          {/* Close button */}
          <button
            onClick={handleCloseStory}
            className="absolute right-6 top-6 z-[210] text-white/75 hover:text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-[32px]">close</span>
          </button>

          {/* Left Arrow (Desktop Navigation) */}
          <button
            onClick={() => handlePrevSlide(activeSlideIdx, activeStory)}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-[210] text-white/50 hover:text-white max-md:hidden cursor-pointer"
          >
            <span className="material-symbols-outlined text-[44px]">chevron_left</span>
          </button>

          {/* Core Interactive Story Screen */}
          <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between">
            
            {/* Top Slide Timers Indicators */}
            <div className="absolute top-3 inset-x-3 z-30 flex gap-1.5">
              {activeStory.items.map((_, idx) => (
                <div key={idx} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      idx < activeSlideIdx
                        ? "w-full"
                        : idx === activeSlideIdx
                        ? "w-full animate-[progress_4000ms_linear]"
                        : "w-0"
                    }`}
                    style={
                      idx === activeSlideIdx
                        ? { animation: "progress 4000ms linear forwards" }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>

            {/* Slide Header metadata */}
            <div className="absolute top-6 inset-x-4 z-30 flex items-center gap-3">
              <img
                src={activeStory.avatar}
                alt={activeStory.name}
                className="h-9 w-9 rounded-full object-cover border border-white/20"
              />
              <div>
                <p className="text-sm font-bold text-white leading-none mb-0.5">
                  {activeStory.name}
                </p>
                <p className="text-[10px] text-white/70 leading-none">
                  @{activeStory.username} • {activeStory.items[activeSlideIdx].time}
                  {activeStory.items[activeSlideIdx].location && ` • ${activeStory.items[activeSlideIdx].location}`}
                </p>
              </div>
            </div>

            {/* Left/Right Click Nav Handlers (Mobile Tap Friendly) */}
            <div className="absolute inset-0 z-20 flex select-none">
              <div
                className="flex-1 cursor-w-resize"
                onClick={() => handlePrevSlide(activeSlideIdx, activeStory)}
              />
              <div
                className="flex-1 cursor-e-resize"
                onClick={() => handleNextSlide(activeSlideIdx, activeStory)}
              />
            </div>

            {/* Story Visual Slide Media */}
            <img
              src={activeStory.items[activeSlideIdx].storyUrl}
              alt="Story Content"
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </div>

          {/* Right Arrow (Desktop Navigation) */}
          <button
            onClick={() => handleNextSlide(activeSlideIdx, activeStory)}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-[210] text-white/50 hover:text-white max-md:hidden cursor-pointer"
          >
            <span className="material-symbols-outlined text-[44px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Styled animation progress keyframes inside a JSX style tag */}
      <style jsx global>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
};
