"use client";

import React, { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { PaymentModal } from "@/components/ui/PaymentModal";

interface LiveComment {
  id: string;
  name: string;
  avatar: string;
  text: string;
  isTip?: boolean;
  amount?: number;
}

export default function LiveStreamingPage() {
  const { user, showToast } = useUser();
  
  // Live Chat States
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [viewerCount, setViewerCount] = useState(1280);

  // Stream Funding Goal States (Interactive details)
  const [goalTitle, setGoalTitle] = useState("Lingerie Cosplay Reveal");
  const [goalCurrent, setGoalCurrent] = useState(260);
  const [goalTarget] = useState(500);

  // Floating heart reaction counter
  const [heartCount, setHeartCount] = useState(148);

  // Tipping states
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTitle, setPaymentTitle] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [showTipPanel, setShowTipPanel] = useState(false);
  const [customTipAmount, setCustomTipAmount] = useState("25");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchDefaultLiveChats = () => {
    const list: LiveComment[] = [
      { id: "lc_1", name: "Demi Rose", avatar: "/assets/0c0bf4c58678d852ea7588ef1045309e.png", text: "Crushing it! So happy to join today! 🔥💕" },
      { id: "lc_2", name: "Lana Rhoades", avatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png", text: "Incredible broadcast setup! 😻" },
      { id: "lc_3", name: "Austin Wolf", avatar: "/assets/5dc72593d711173af1fe7ab74be0fa56.png", text: "Gym tips split details were awesome. Let's lift! 💪" }
    ];
    setLiveComments(list);
  };

  useEffect(() => {
    setTimeout(() => {
      fetchDefaultLiveChats();
    }, 0);

    // Scroll chat bottom initially
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);

    // Simulate real-time viewer variations
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 9 - 4));
    }, 4000);

    // Simulate incoming background chat items
    const chatPresets = [
      { name: "Demi Rose", avatar: "/assets/0c0bf4c58678d852ea7588ef1045309e.png", text: "Love this stream! ❤️" },
      { name: "Sarah J.", avatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png", text: "Unbelievable sets! 🌌" },
      { name: "John Smith", avatar: "/assets/5dc72593d711173af1fe7ab74be0fa56.png", text: "Can you review custom setups next?" }
    ];

    const chatInterval = setInterval(() => {
      const random = chatPresets[Math.floor(Math.random() * chatPresets.length)];
      const newComment: LiveComment = {
        id: "lc_" + Date.now(),
        ...random
      };
      setLiveComments((prev) => [...prev, newComment]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearInterval(chatInterval);
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !user) return;

    const newComment: LiveComment = {
      id: "lc_" + Date.now(),
      name: user.displayName,
      avatar: user.avatar,
      text: inputVal.trim()
    };

    setLiveComments([...liveComments, newComment]);
    setInputVal("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const triggerTip = (amount?: number) => {
    const finalAmount = (amount ?? parseFloat(customTipAmount)) || 25;
    setPaymentTitle("Send Tip in Live Broadcast");
    setPaymentPrice(finalAmount);
    setIsPaymentOpen(true);
    setShowTipPanel(false);
  };

  const handlePaymentConfirm = (tipMsg?: string) => {
    if (!user) return;
    const msg = tipMsg || "Contributed to stream!";
    const newComment: LiveComment = {
      id: "lc_tip_" + Date.now(),
      name: user.displayName,
      avatar: user.avatar,
      text: `[Contributed Payout Tip $${paymentPrice.toFixed(2)}] ${msg}`,
      isTip: true,
      amount: paymentPrice
    };

    setLiveComments([...liveComments, newComment]);
    setGoalCurrent((prev) => Math.min(goalTarget, prev + paymentPrice));
    showToast(`Successfully tipped $${paymentPrice.toFixed(2)} to live stream!`);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const getTipColorClass = (amount: number) => {
    if (amount >= 100) return "bg-purple-500/10 border border-purple-500/20 text-purple-500";
    if (amount >= 50) return "bg-amber-500/10 border border-amber-500/20 text-amber-500";
    return "bg-success/10 border border-[hsl(var(--success-hsl)/0.15)] text-success";
  };

  const goalPercentage = Math.round((goalCurrent / goalTarget) * 100);

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <AppShell>
        {/* Mobile Header */}
        <MobileHeader>
          <span className="text-sm font-bold text-text-muted select-none">Live</span>
        </MobileHeader>

        {/* Main Content (Touching Sidebar) */}
        <div className="app-page-wide max-md:h-[calc(100vh-120px)] overflow-hidden flex flex-col justify-between">
            
            {/* Live Streaming Video Player Frame */}
            <div className="relative aspect-[16/10] w-full bg-black shrink-0 border-b border-border select-none">
              
              {/* Badges Info */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 bg-white rounded-full"></span>
                  <span>Live</span>
                </span>
                <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[11px]">visibility</span>
                  <span>{viewerCount} viewers</span>
                </span>
              </div>

              {/* Goal widget overlays inside broadcast */}
              <div className="absolute top-4 right-4 z-10 w-[200px] bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-white space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                  <span className="truncate max-w-[120px]">{goalTitle}</span>
                  <span className="text-primary font-bold">{goalPercentage}%</span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${goalPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-white/70">
                  <span>${goalCurrent} raised</span>
                  <span>Goal: ${goalTarget}</span>
                </div>
              </div>

              {/* Heart floating emoji trigger clicker */}
              <div className="absolute bottom-16 right-4 z-10 flex flex-col items-center select-none space-y-1">
                <button
                  onClick={() => setHeartCount(prev => prev + 1)}
                  className="h-10 w-10 bg-primary/20 backdrop-blur hover:bg-primary/30 text-primary active:scale-90 rounded-full flex items-center justify-center cursor-pointer transition-all border border-primary/30"
                  title="Send Heart Reaction"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </button>
                <span className="text-[9px] text-white bg-black/40 px-2 py-0.5 rounded-full font-bold">
                  {heartCount}
                </span>
              </div>

              {/* Broadcast Media Simulation Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-4 pointer-events-none">
                <div />
                
                {/* Creator Title Details */}
                <div className="flex justify-between items-end text-white">
                  <div>
                    <p className="text-xs font-bold leading-none mb-1">Weekly Live Payout Broadcast Q&A</p>
                    <p className="text-[10px] text-white/80">Streaming from Mumbai Office Studio</p>
                  </div>
                  <span className="material-symbols-outlined text-white/50 text-[32px]">cast</span>
                </div>
              </div>

              {/* Blurred background image mock */}
              <div
                className="w-full h-full opacity-30"
                style={{
                  backgroundImage: "url('/assets/cb15617a79d7713ffa4a6de36f808a76.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              />
            </div>

            {/* Live Chat Viewport */}
            <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-3 bg-[hsl(var(--background-hsl)/0.3)]">
              {liveComments.map((comment) => {
                const isTipCard = comment.isTip;
                const tipColor = comment.amount ? getTipColorClass(comment.amount) : "";
                
                return (
                  <div key={comment.id} className="flex gap-2.5 text-xs items-start animate-fade-in select-none">
                    <img
                      src={comment.avatar}
                      alt={comment.name}
                      className="h-8 w-8 rounded-full object-cover border border-border"
                    />
                    <div className={`p-3 rounded-2xl flex-grow min-w-0 font-medium ${
                      isTipCard 
                        ? tipColor
                        : "bg-surface border border-border text-text-main"
                    }`}>
                      <div className="flex justify-between items-center mb-0.5">
                        <p className={`font-bold ${isTipCard ? "font-black" : "text-text-main"}`}>
                          {comment.name}
                        </p>
                        {isTipCard && (
                          <span className="bg-primary text-white text-[8px] font-extrabold px-2.5 py-0.5 rounded-full select-none uppercase tracking-wider ml-2">
                            Tipped ${comment.amount?.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed break-words">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Controls */}
            <div className="p-3 border-t border-border bg-surface shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTipPanel(!showTipPanel)}
                    className="bg-success/15 text-success hover:bg-success hover:text-white px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>Tip</span>
                  </button>
                  {showTipPanel && (
                    <div className="absolute bottom-full mb-2 left-0 w-52 bg-surface border border-border rounded-2xl p-3 z-40 space-y-2 animate-fade-in">
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
                        <div className="flex-grow flex items-center bg-background border border-border rounded-lg px-2 py-1 focus-within:border-success">
                          <span className="text-[10px] font-bold text-text-muted mr-0.5">$</span>
                          <input
                            type="number"
                            min="1"
                            value={customTipAmount}
                            onChange={(e) => setCustomTipAmount(e.target.value)}
                            className="w-full text-[10px] bg-transparent outline-none text-text-main font-bold"
                            placeholder="Custom"
                          />
                        </div>
                        <button
                          onClick={() => triggerTip()}
                          className="bg-success text-white text-[10px] font-black px-2 rounded-lg cursor-pointer hover:opacity-90"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Interact with audience during stream..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="flex-grow px-4 py-2.5 bg-background border border-border rounded-full text-xs outline-none focus:border-primary transition-all text-text-main placeholder-text-muted"
                />
                
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="bg-primary text-white disabled:opacity-50 hover:bg-primary-hover active:scale-95 text-xs font-bold h-10 w-10 flex items-center justify-center rounded-full transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px] font-bold">send</span>
                </button>
              </form>
            </div>
        </div>

        {/* Payout Tip Secure checkout popup */}
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          title={paymentTitle}
          price={paymentPrice}
          onConfirm={handlePaymentConfirm}
        />
      </AppShell>
    </RoleGuard>
  );
}
