"use client";

import React, { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  fit?: "contain" | "cover";
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = "",
  fit = "contain",
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [gestureHint, setGestureHint] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressActiveRef = useRef(false);
  const wasPlayingBeforeHoldRef = useRef(false);
  const hintTimerRef = useRef<number | null>(null);
  const lastTouchEndRef = useRef(0);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    setIsMuted(true);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const timer = window.setTimeout(() => setShowControls(false), 1800);
    return () => window.clearTimeout(timer);
  }, [isPlaying, currentTime, isMuted]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  const play = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
    } catch {
      setShowControls(true);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
    setShowControls(true);
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;

    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration);
    setCurrentTime(video.currentTime);
    setShowControls(true);
  };

  const showGesture = (label: string) => {
    setGestureHint(label);
    setShowControls(true);
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setGestureHint(null), 650);
  };

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const nextTime = (Number(event.target.value) / 100) * duration;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleFullscreen = () => {
    const shell = shellRef.current;
    if (!shell) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    shell.requestFullscreen?.().catch(() => {});
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left < rect.width / 2;
    const seconds = isLeftHalf ? -10 : 10;
    seekBy(seconds);
    showGesture(seconds > 0 ? "+10s" : "-10s");
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    longPressActiveRef.current = false;
    wasPlayingBeforeHoldRef.current = Boolean(videoRef.current && !videoRef.current.paused);
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      longPressActiveRef.current = true;
      video.pause();
      showGesture("Hold pause");
    }, 450);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    lastTouchEndRef.current = Date.now();
    touchStartRef.current = null;
    if (!start || !touch) return;

    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      if (wasPlayingBeforeHoldRef.current) {
        play();
        showGesture("Resume");
      }
      return;
    }

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const elapsed = Date.now() - start.time;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      const seconds = dx > 0 ? 10 : -10;
      seekBy(seconds);
      showGesture(seconds > 0 ? "+10s" : "-10s");
      return;
    }

    if (elapsed < 300 && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      togglePlay();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekBy(-10);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(10);
    } else if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      toggleMute();
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      toggleFullscreen();
    }
  };

  return (
    <div
      ref={shellRef}
      className={`group relative isolate overflow-hidden rounded-xl bg-black text-white ${className}`}
      onMouseMove={() => setShowControls(true)}
      onFocus={() => setShowControls(true)}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        className={`block h-full max-h-[420px] min-h-[220px] w-full bg-black ${fit === "cover" ? "object-cover" : "object-contain"}`}
        onClick={(event) => {
          if (Date.now() - lastTouchEndRef.current < 500) return;
          if (event.detail === 1) togglePlay();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
      />

      {gestureHint && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-black text-white shadow-lg ring-1 ring-white/15">
          {gestureHint}
        </div>
      )}

      <button
        type="button"
        onClick={toggleMute}
        className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white shadow-lg ring-1 ring-white/15 backdrop-blur transition hover:bg-black/85"
        title={isMuted ? "Unmute" : "Mute"}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
      >
        <span className="material-symbols-outlined text-[19px]">
          {isMuted ? "volume_off" : "volume_up"}
        </span>
      </button>

      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-10 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
          title="Play"
          aria-label="Play video"
        >
          <span className="material-symbols-outlined text-[30px]">play_arrow</span>
        </button>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-black/65 px-3 pb-3 pt-2 backdrop-blur transition-opacity duration-200 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleProgressChange}
          className="video-range mb-2 w-full"
          aria-label="Seek video"
          style={{ ["--video-progress" as string]: `${progress}%` }}
        />

        <div className="flex h-8 items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-8 w-8 place-items-center rounded-full text-white transition hover:bg-white/12"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => seekBy(-10)}
            className="hidden h-8 w-8 place-items-center rounded-full text-white/85 transition hover:bg-white/12 sm:grid"
            title="Back 10 seconds"
            aria-label="Back 10 seconds"
          >
            <span className="material-symbols-outlined text-[18px]">replay_10</span>
          </button>

          <button
            type="button"
            onClick={() => seekBy(10)}
            className="hidden h-8 w-8 place-items-center rounded-full text-white/85 transition hover:bg-white/12 sm:grid"
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
          >
            <span className="material-symbols-outlined text-[18px]">forward_10</span>
          </button>

          <span className="min-w-[72px] text-[11px] font-bold tabular-nums text-white/85">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            className="ml-auto grid h-8 w-8 place-items-center rounded-full text-white/85 transition hover:bg-white/12"
            title={isMuted ? "Unmute" : "Mute"}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="grid h-8 w-8 place-items-center rounded-full text-white/85 transition hover:bg-white/12"
            title="Fullscreen"
            aria-label="Open fullscreen"
          >
            <span className="material-symbols-outlined text-[18px]">fullscreen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
