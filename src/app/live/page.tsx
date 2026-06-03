"use client";

import React, { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { PaymentModal } from "@/components/ui/PaymentModal";
import { useUser } from "@/context/UserContext";
import { apiClient } from "@/lib/apiClient";

interface LiveStream {
  id: string;
  title: string;
  goal_title: string;
  goal_target: number;
  goal_current: number;
  viewer_count: number;
  heart_count: number;
  status: "live" | "ended";
  creator_username: string;
  creator_name: string;
  creator_avatar: string;
}

interface LiveComment {
  id: string;
  name: string;
  avatar: string;
  text: string;
  is_tip?: boolean;
  amount?: number;
}

type LiveResponse = {
  stream: LiveStream | null;
  comments: Array<LiveComment & { is_tip?: boolean }>;
};

export default function LiveStreamingPage() {
  const { user, showToast, adjustBalance } = useUser();
  const isCreatorMode = user?.role === "creator";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<LiveStream | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [showTipPanel, setShowTipPanel] = useState(false);
  const [customTipAmount, setCustomTipAmount] = useState("25");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const loadActiveStream = async (silent = false) => {
    try {
      const data = await apiClient.get<LiveResponse>("/live/active");
      setStream(data.stream);
      setComments((data.comments || []).map((item) => ({
        ...item,
        is_tip: item.is_tip,
      })));
      if (!silent) setIsLoading(false);
    } catch (err) {
      if (!silent) {
        setIsLoading(false);
        showToast(err instanceof Error ? err.message : "Unable to load live stream");
      }
    }
  };

  useEffect(() => {
    loadActiveStream();
    const poll = window.setInterval(() => loadActiveStream(true), 5000);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  useEffect(() => {
    if (!isCreatorMode || !stream) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        localStreamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch(() => showToast("Camera/mic permission is required to broadcast."));

    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [isCreatorMode, stream?.id]);

  const startStream = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const data = await apiClient.post<LiveResponse>("/live/start", {
        title: `${user?.displayName || "Creator"} Live Broadcast`,
        goal_title: "Live Support Goal",
        goal_target: 500,
      });
      setStream(data.stream);
      setComments(data.comments || []);
      showToast("Live stream started.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to start live stream");
    } finally {
      setIsStarting(false);
    }
  };

  const endStream = async () => {
    if (!stream || !confirm("End your live broadcast?")) return;
    try {
      await apiClient.post(`/live/${stream.id}/end`);
      setStream(null);
      setComments([]);
      showToast("Live stream ended.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to end live stream");
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stream || !message.trim()) return;
    try {
      const data = await apiClient.post<{ comments: LiveComment[] }>(`/live/${stream.id}/comments`, {
        text: message.trim(),
      });
      setComments(data.comments || []);
      setMessage("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to send live comment");
    }
  };

  const sendReaction = async () => {
    if (!stream) return;
    try {
      const data = await apiClient.post<{ heart_count: number }>(`/live/${stream.id}/reactions`);
      setStream({ ...stream, heart_count: data.heart_count });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to send reaction");
    }
  };

  const triggerTip = (amount?: number) => {
    const finalAmount = amount ?? Number(customTipAmount);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      showToast("Enter a valid tip amount");
      return;
    }
    setPaymentPrice(finalAmount);
    setIsPaymentOpen(true);
    setShowTipPanel(false);
  };

  const handlePaymentConfirm = async (tipMsg?: string, paymentSource: "wallet" | "card" = "wallet") => {
    if (!stream) return;
    const cleanMessage = tipMsg?.trim() || "Live support tip";

    if (paymentSource === "card") {
      await apiClient.post("/wallet/deposit", { amount: paymentPrice });
    }

    await adjustBalance(-paymentPrice, cleanMessage, stream.creator_username);
    const data = await apiClient.post<{ comments: LiveComment[] }>(`/live/${stream.id}/comments`, {
      text: cleanMessage,
      is_tip: true,
      amount: paymentPrice,
    });
    setComments(data.comments || []);
    await loadActiveStream(true);
  };

  const goalTarget = stream?.goal_target || 0;
  const goalCurrent = stream?.goal_current || 0;
  const goalPercentage = goalTarget > 0 ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0;

  return (
    <RoleGuard allowedRoles={["creator", "fan"]}>
      <AppShell>
        <MobileHeader>
          <span className="text-sm font-bold text-text-muted select-none">
            {isCreatorMode ? "Live Studio" : "Live"}
          </span>
        </MobileHeader>

        <div className="app-page-wide max-md:h-[calc(100vh-120px)] overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex min-h-[70vh] items-center justify-center text-sm font-bold text-text-muted">
              Loading live stream...
            </div>
          ) : !stream ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
              <span className="material-symbols-outlined text-[46px] text-primary">live_tv</span>
              <div className="space-y-1">
                <h1 className="text-lg font-black text-text-main">No one is live right now</h1>
                <p className="text-xs font-medium text-text-muted">
                  {isCreatorMode ? "Start a broadcast when you are ready." : "Check back when a creator starts streaming."}
                </p>
              </div>
              {isCreatorMode && (
                <button
                  onClick={startStream}
                  disabled={isStarting}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-black text-white disabled:opacity-60"
                >
                  {isStarting ? "Starting..." : "Start Live"}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-black border-b border-border">
                <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                  <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    Live
                  </span>
                  <span className="rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                    {stream.viewer_count} viewers
                  </span>
                  {isCreatorMode && stream.creator_username === user?.username && (
                    <button
                      onClick={endStream}
                      className="rounded-full bg-red-500 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
                    >
                      End Stream
                    </button>
                  )}
                </div>

                <div className="absolute right-4 top-4 z-10 w-[210px] rounded-2xl border border-white/10 bg-black/65 p-3 text-white backdrop-blur">
                  <div className="mb-1.5 flex justify-between gap-2 text-[9px] font-black uppercase tracking-wider">
                    <span className="truncate">{stream.goal_title}</span>
                    <span className="text-primary">{goalPercentage}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${goalPercentage}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[9px] font-bold text-white/70">
                    <span>Rs {goalCurrent.toFixed(2)}</span>
                    <span>Goal Rs {goalTarget.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={sendReaction}
                  className="absolute bottom-16 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/20 text-primary backdrop-blur"
                  title="Send reaction"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    favorite
                  </span>
                </button>
                <span className="absolute bottom-8 right-4 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold text-white">
                  {stream.heart_count}
                </span>

                {isCreatorMode && stream.creator_username === user?.username ? (
                  <div className="h-full w-full bg-neutral-950">
                    {isCamOff ? (
                      <div className="flex h-full flex-col items-center justify-center text-xs font-bold text-white/55">
                        <span className="material-symbols-outlined mb-2 text-[36px]">videocam_off</span>
                        Camera paused
                      </div>
                    ) : (
                      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                    )}
                    <div className="absolute bottom-5 left-4 z-10 flex gap-2">
                      <button
                        onClick={() => {
                          localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = isMuted; });
                          setIsMuted(!isMuted);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        <span className="material-symbols-outlined text-[18px]">{isMuted ? "mic_off" : "mic"}</span>
                      </button>
                      <button
                        onClick={() => {
                          localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = isCamOff; });
                          setIsCamOff(!isCamOff);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white"
                        title={isCamOff ? "Camera on" : "Camera off"}
                      >
                        <span className="material-symbols-outlined text-[18px]">{isCamOff ? "videocam_off" : "videocam"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-950">
                    <div className="flex flex-col items-center gap-3 text-center text-white">
                      <img src={stream.creator_avatar} alt={stream.creator_name} className="h-20 w-20 rounded-full border border-white/20 object-cover" />
                      <div>
                        <p className="text-base font-black">{stream.title}</p>
                        <p className="text-xs font-medium text-white/70">@{stream.creator_username}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-grow overflow-y-auto bg-[hsl(var(--background-hsl)/0.3)] p-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="py-8 text-center text-xs font-bold text-text-muted">No live comments yet.</p>
                ) : comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                    <img src={comment.avatar} alt={comment.name} className="h-8 w-8 rounded-full border border-border object-cover" />
                    <div className={`min-w-0 flex-grow rounded-2xl border p-3 ${
                      comment.is_tip ? "border-success/25 bg-success/10 text-success" : "border-border bg-surface text-text-main"
                    }`}>
                      <div className="mb-0.5 flex justify-between gap-2">
                        <p className="font-bold">{comment.name}</p>
                        {comment.is_tip && <span className="text-[9px] font-black">Tipped Rs {comment.amount?.toFixed(2)}</span>}
                      </div>
                      <p className="break-words text-[11px] leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="shrink-0 border-t border-border bg-surface p-3">
                <form onSubmit={sendComment} className="flex gap-2">
                  {!isCreatorMode && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTipPanel(!showTipPanel)}
                        className="flex items-center gap-1 rounded-full bg-success/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-success"
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        Tip
                      </button>
                      {showTipPanel && (
                        <div className="absolute bottom-full left-0 z-40 mb-2 w-52 space-y-2 rounded-2xl border border-border bg-surface p-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Send a tip</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[5, 10, 25, 50].map((amt) => (
                              <button key={amt} type="button" onClick={() => triggerTip(amt)} className="rounded-lg border border-border py-1.5 text-[10px] font-black">
                                Rs {amt}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={customTipAmount}
                              onChange={(e) => setCustomTipAmount(e.target.value)}
                              className="min-w-0 flex-grow rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-bold outline-none"
                            />
                            <button type="button" onClick={() => triggerTip()} className="rounded-lg bg-success px-2 text-[10px] font-black text-white">
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Write a live comment..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-grow rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          title="Send Tip in Live Broadcast"
          price={paymentPrice}
          onConfirm={handlePaymentConfirm}
        />
      </AppShell>
    </RoleGuard>
  );
}
