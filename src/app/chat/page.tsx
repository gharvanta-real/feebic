"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { mockDb, Creator, ChatMessage, VaultItem } from "@/lib/mockDb";
import { useUser } from "@/context/UserContext";
import { PaymentModal } from "@/components/ui/PaymentModal";
import { Modal } from "@/components/ui/Modal";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

// Synthesized dial tone generator for WebRTC calling (No latency, self-contained)
const playRingTone = () => {
  if (typeof window === "undefined") return () => {};
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return () => {};
    const ctx = new AudioContextClass();
    
    let osc1 = ctx.createOscillator();
    let osc2 = ctx.createOscillator();
    let gainNode = ctx.createGain();
    
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    
    const playRing = (start: number) => {
      gainNode.gain.setValueAtTime(0.15, start);
      gainNode.gain.setValueAtTime(0.15, start + 2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 2.5);
    };
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(0);
    osc2.start(0);
    
    let time = ctx.currentTime;
    playRing(time);
    let interval = setInterval(() => {
      playRing(ctx.currentTime);
    }, 6000);
    
    return () => {
      clearInterval(interval);
      try {
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch (e) {}
    };
  } catch (err) {
    console.error("Web Audio ringtone failed to start", err);
    return () => {};
  }
};

interface VoicePlayerProps {
  duration?: string;
  isUser: boolean;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ duration = "0:12", isUser }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (playing) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setPlaying(false);
            return 0;
          }
          return prev + 8;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [playing]);

  return (
    <div className="flex items-center gap-3 py-1.5 min-w-[210px] select-none">
      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        className={`h-8 w-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${
          isUser ? "bg-white text-primary" : "bg-primary text-white"
        }`}
      >
        <span className="material-symbols-outlined text-[20px] font-bold">
          {playing ? "pause" : "play_arrow"}
        </span>
      </button>
      
      {/* Waveform graphic */}
      <div className="flex-grow flex items-center gap-[2.5px] h-6 px-1">
        {[25, 55, 35, 75, 45, 30, 65, 40, 85, 35, 50, 20, 60, 35].map((height, idx) => {
          const active = (idx / 14) * 100 <= progress;
          return (
            <div
              key={idx}
              className="w-[3px] rounded-full transition-colors duration-200"
              style={{
                height: `${height}%`,
                backgroundColor: active
                  ? (isUser ? "white" : "var(--primary)")
                  : (isUser ? "rgba(255,255,255,0.4)" : "rgba(var(--text-muted-hsl) / 0.25)")
              }}
            />
          );
        })}
      </div>

      <span className={`text-[10px] font-mono font-bold shrink-0 ${isUser ? "text-white/90" : "text-text-muted"}`}>
        {playing ? `0:${Math.min(12, Math.floor((progress / 100) * 12)).toString().padStart(2, '0')}` : duration}
      </span>
    </div>
  );
};

function ChatContent() {
  const { blockedUsers, toggleBlock, showToast, user, adjustBalance } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryUser = searchParams.get("u");
  const queryCall = searchParams.get("call");

  // 1-on-1 Calling system states
  const [callState, setCallState] = useState<"idle" | "calling" | "ringing" | "active">("idle");
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const billingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringToneCleanupRef = useRef<(() => void) | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const lastChargedMinuteRef = useRef<number>(0);

  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  
  // Custom message attachments
  const [isPPV, setIsPPV] = useState(false);
  const [price, setPrice] = useState("9.99");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [fileName, setFileName] = useState("");

  // Recording voice notes states
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Vault picking
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);

  const activeCreatorDetails = creators.find(c => c.username === selectedCreator) || null;

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startOutgoingCall = (type: "video" | "audio") => {
    if (!selectedCreator || !activeCreatorDetails) return;
    
    if (user?.role === "fan" && !mockDb.isSubscribed(selectedCreator)) {
      showToast("You must be subscribed to call this creator!");
      return;
    }

    setCallType(type);
    setCallState("calling");
    setIsMuted(false);
    setIsCamOff(false);

    // Play synthesized dial tone
    if (ringToneCleanupRef.current) ringToneCleanupRef.current();
    ringToneCleanupRef.current = playRingTone();

    // Creator auto-accept simulation after 3.5 seconds
    setTimeout(() => {
      setCallState(prev => {
        if (prev === "calling") {
          connectCall(type);
          return "active";
        }
        return prev;
      });
    }, 3500);
  };

  const simulateIncomingCall = (type: "video" | "audio" = "video") => {
    if (!selectedCreator || !activeCreatorDetails) return;
    setCallType(type);
    setCallState("ringing");
    setIsMuted(false);
    setIsCamOff(false);

    // Play ringing tone
    if (ringToneCleanupRef.current) ringToneCleanupRef.current();
    ringToneCleanupRef.current = playRingTone();
  };

  const acceptIncomingCall = () => {
    setCallState("active");
    connectCall(callType);
  };

  const connectCall = (type: "video" | "audio") => {
    if (ringToneCleanupRef.current) {
      ringToneCleanupRef.current();
      ringToneCleanupRef.current = null;
    }

    navigator.mediaDevices.getUserMedia({ video: type === "video", audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn("Camera/Mic stream access rejected:", err);
        showToast("Webcam/Mic not accessible. Continuing in simulation mode.");
      });

    callStartTimeRef.current = Date.now();
    lastChargedMinuteRef.current = 0;
    setCallDuration(0);

    if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);
    billingIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current === null) return;
      
      const elapsedSeconds = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(elapsedSeconds);
      
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      
      // Charging billing delta check
      if (elapsedMinutes > lastChargedMinuteRef.current) {
        const creatorPrice = activeCreatorDetails?.callPricePerMin || 5.00;
        const minutesToCharge = elapsedMinutes - lastChargedMinuteRef.current;
        const amount = creatorPrice * minutesToCharge;

        if (user?.role === "fan") {
          const currentBalance = mockDb.getWalletBalance();
          if (currentBalance < amount) {
            showToast("Call disconnected due to insufficient wallet funds!");
            endCall();
          } else {
            adjustBalance(-amount, `1-on-1 direct call with @${selectedCreator}`, selectedCreator || undefined);
            showToast(`Charged $${amount.toFixed(2)} for ${elapsedMinutes} minute call session.`);
            lastChargedMinuteRef.current = elapsedMinutes;
          }
        } else if (user?.role === "creator") {
          adjustBalance(amount, `1-on-1 call payout from Fan subscriber`, 'sam_fan');
          showToast(`Earned $${amount.toFixed(2)} payout from fan video call.`);
          lastChargedMinuteRef.current = elapsedMinutes;
        }
      }
    }, 1000);
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      showToast(!isMuted ? "Microphone muted" : "Microphone unmuted");
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCamOff(!isCamOff);
      showToast(!isCamOff ? "Camera turned off" : "Camera turned on");
    }
  };

  const endCall = () => {
    if (ringToneCleanupRef.current) {
      ringToneCleanupRef.current();
      ringToneCleanupRef.current = null;
    }
    if (billingIntervalRef.current) {
      clearInterval(billingIntervalRef.current);
      billingIntervalRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCallState("idle");
    setCallDuration(0);
    callStartTimeRef.current = null;
    lastChargedMinuteRef.current = 0;
    
    router.replace(`/chat?u=${selectedCreator}`);
    showToast("Call session ended.");
  };

  useEffect(() => {
    if (queryUser) {
      setSelectedCreator(queryUser);
      if (queryCall) {
        setTimeout(() => {
          startOutgoingCall(queryCall === "audio" ? "audio" : "video");
        }, 800);
      }
    }
  }, [queryUser, queryCall]);

  // Search filter
  const [chatSearch, setChatSearch] = useState("");

  // Payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTitle, setPaymentTitle] = useState("");
  const [paymentPrice, setPaymentPrice] = useState(0);
  const [activePPVMsgId, setActivePPVMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = () => {
    const data = mockDb.getCreators();
    const list = Object.values(data);
    setCreators(list);

    if (selectedCreator) {
      setMessages(mockDb.getChats(selectedCreator));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    setTimeout(() => {
      fetchChats();
      setVaultItems(mockDb.getVaultItems());
    }, 0);

    // Set default selected creator if list has items
    const data = mockDb.getCreators();
    const list = Object.values(data);
    if (list.length > 0 && !selectedCreator) {
      setTimeout(() => {
        setSelectedCreator(list[0].username);
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (selectedCreator) {
      setTimeout(() => {
        setMessages(mockDb.getChats(selectedCreator));
        scrollToBottom();
      }, 0);
    }
  }, [selectedCreator]);

  useEffect(() => {
    const handleMsgSent = () => {
      if (selectedCreator) {
        setMessages(mockDb.getChats(selectedCreator));
        scrollToBottom();
      }
    };
    
    window.addEventListener("ch_message_sent", handleMsgSent);
    window.addEventListener("ch_message_received", handleMsgSent);

    return () => {
      window.removeEventListener("ch_message_sent", handleMsgSent);
      window.removeEventListener("ch_message_received", handleMsgSent);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      if (billingIntervalRef.current) {
        clearInterval(billingIntervalRef.current);
      }
      if (ringToneCleanupRef.current) {
        ringToneCleanupRef.current();
      }
    };
  }, [selectedCreator]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !mediaUrl) return;
    if (!selectedCreator) return;

    const priceNum = isPPV ? parseFloat(price) || 9.99 : 0;

    mockDb.sendMessage(
      selectedCreator, 
      inputText.trim(),
      isPPV,
      priceNum,
      mediaUrl,
      mediaType
    );

    // Reset composer state
    setInputText("");
    setIsPPV(false);
    setMediaUrl("");
    setFileName("");
    scrollToBottom();
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordTime(0);
    recordIntervalRef.current = setInterval(() => {
      setRecordTime((prev) => prev + 1);
    }, 1000);
    showToast("Voice recording started...");
  };

  const cancelRecording = () => {
    setIsRecording(false);
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }
    setRecordTime(0);
    showToast("Recording cancelled");
  };

  const sendVoiceNote = () => {
    if (!selectedCreator) return;
    const durationMin = Math.floor(recordTime / 60);
    const durationSec = recordTime % 60;
    const durationStr = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;

    mockDb.sendMessage(
      selectedCreator,
      "",
      false,
      0,
      "/assets/voice_note.mp3",
      "audio",
      durationStr
    );

    setIsRecording(false);
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }
    setRecordTime(0);
    scrollToBottom();
    showToast("Voice note sent successfully!");
  };

  const triggerTip = () => {
    if (!selectedCreator) return;
    setPaymentTitle(`Send Tip to @${selectedCreator}`);
    setPaymentPrice(15.00); 
    setIsPaymentOpen(true);
  };

  const triggerPPVUnlock = (msgId: string, price: number) => {
    setActivePPVMsgId(msgId);
    setPaymentTitle("Unlock Premium Attachment");
    setPaymentPrice(price);
    setIsPaymentOpen(true);
  };

  const handlePaymentConfirm = (tipMsg?: string) => {
    if (activePPVMsgId) {
      mockDb.unlockContent(activePPVMsgId, paymentPrice);
      setActivePPVMsgId(null);
      showToast("Premium attachment unlocked successfully!");
    } else if (selectedCreator) {
      const msg = tipMsg || "Tipped the creator!";
      mockDb.sendMessage(selectedCreator, `[Tip Contribution $${paymentPrice.toFixed(2)}] ${msg}`);
      showToast(`Tip of $${paymentPrice.toFixed(2)} sent!`);
    }
    fetchChats();
  };

  const handleToggleBlock = () => {
    if (!selectedCreator) return;
    const res = toggleBlock(selectedCreator);
    showToast(res ? `@${selectedCreator} has been blocked` : `@${selectedCreator} has been unblocked`);
  };

  const handleSelectVaultItem = (item: VaultItem) => {
    setMediaUrl(item.url);
    setMediaType(item.type);
    setFileName(item.name);
    setIsVaultOpen(false);
    showToast(`Attached ${item.name} from Vault`);
  };

  const currentCreator = selectedCreator ? mockDb.getCreator(selectedCreator) : null;
  const isBlocked = selectedCreator ? blockedUsers.includes(selectedCreator) : false;

  const filteredConversations = creators.filter((c) => 
    c.name.toLowerCase().includes(chatSearch.toLowerCase()) || 
    c.username.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <AppShell>
      {/* 1. Mobile Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted mr-1 select-none">Messages</span>
      </MobileHeader>

      {/* 2. Main Two-Panel Layout */}
      <div className="flex h-screen w-full bg-background max-md:mt-14 max-md:h-[calc(100vh-120px)] overflow-hidden">
        
        {/* Left Column: Conversations List */}
        <div className={`w-[280px] border-r border-border shrink-0 flex flex-col bg-surface transition-all select-none ${
          selectedCreator ? "max-sm:hidden" : "max-sm:w-full"
        }`}>
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-extrabold text-text-main">Direct Messages</h2>
              {user && user.role === "creator" && (
                <Link
                  href="/studio/mass-message"
                  className="text-[10px] font-black bg-primary/10 text-primary hover:bg-primary hover:text-white px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[13px]">campaign</span>
                  <span>Broadcast</span>
                </Link>
              )}
            </div>
            
            {/* Search filter for inbox */}
            <div className="relative flex items-center bg-background border border-border rounded-xl px-3 py-1.5 focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-text-muted text-[18px] mr-1.5">search</span>
              <input
                type="text"
                placeholder="Search inbox..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none placeholder-text-muted text-text-main"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredConversations.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-10">No chats found</p>
            ) : (
              filteredConversations.map((c) => {
                const active = selectedCreator === c.username;
                const lastMsg = mockDb.getChats(c.username).slice(-1)[0];
                const blocked = blockedUsers.includes(c.username);
                
                return (
                  <button
                    key={c.username}
                    onClick={() => setSelectedCreator(c.username)}
                    className={`w-full p-3.5 flex items-center gap-3 transition-colors text-left border-b border-border/40 cursor-pointer ${
                      active ? "bg-primary/5 border-l-4 border-l-primary pl-2.5" : "hover:bg-[hsl(var(--text-muted-hsl)/0.03)]"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-11 w-11 rounded-full object-cover border border-border"
                      />
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-surface shadow-sm"></span>
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className={`text-xs truncate ${active ? "font-black text-primary" : "font-black text-text-main"}`}>
                            {c.name}
                          </p>
                          {c.verified && (
                            <VerifiedBadge size="xs" />
                          )}
                        </div>
                        {blocked && (
                          <span className="bg-red-500/10 text-red-500 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full select-none shrink-0 ml-1">
                            Blocked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted truncate select-none">
                        {lastMsg ? lastMsg.text : `Chat with @${c.username}...`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Conversation Viewport */}
        <div className={`flex-grow flex flex-col bg-background h-full ${
          !selectedCreator ? "max-sm:hidden" : "max-sm:w-full"
        }`}>
          {currentCreator ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-3 px-4 border-b border-border bg-surface flex justify-between items-center select-none shrink-0">
                <div className="flex items-center gap-3">
                  {/* Back to list trigger (Visible on mobile screen) */}
                  <button
                    onClick={() => setSelectedCreator(null)}
                    className="sm:hidden text-text-muted hover:text-primary transition-colors cursor-pointer mr-1"
                  >
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                  </button>

                  <Link href={`/profile?u=${currentCreator.username}`} className="flex items-center gap-3 group">
                    <div className="relative">
                      <img
                        src={currentCreator.avatar}
                        alt={currentCreator.name}
                        className="h-10 w-10 rounded-full object-cover border border-border group-hover:opacity-95 transition-opacity"
                      />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border border-surface"></span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-black text-text-main group-hover:text-primary transition-colors truncate">
                          {currentCreator.name}
                        </p>
                        {currentCreator.verified && (
                          <VerifiedBadge size="sm" />
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted font-bold">@{currentCreator.username}</p>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  {/* Call Buttons */}
                  {!isBlocked && (
                    <>
                      {user?.role === "creator" ? (
                        <button
                          onClick={() => simulateIncomingCall("video")}
                          className="flex items-center justify-center h-8 w-8 rounded-full border border-border text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                          title="Simulate Fan Incoming Call"
                        >
                          <span className="material-symbols-outlined text-[18px] animate-pulse text-primary font-bold">call_received</span>
                        </button>
                      ) : (
                        currentCreator.callsEnabled && (
                          <>
                            <button
                              onClick={() => startOutgoingCall("audio")}
                              className="flex items-center justify-center h-8 w-8 rounded-full border border-border text-text-muted hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                              title="Voice Call"
                            >
                              <span className="material-symbols-outlined text-[18px]">phone</span>
                            </button>
                            <button
                              onClick={() => startOutgoingCall("video")}
                              className="flex items-center justify-center h-8 w-8 rounded-full border border-border text-text-muted hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                              title="Video Call"
                            >
                              <span className="material-symbols-outlined text-[18px]">videocam</span>
                            </button>
                          </>
                        )
                      )}
                    </>
                  )}

                  <button
                    onClick={triggerTip}
                    disabled={isBlocked}
                    className="flex items-center gap-1 bg-success/15 text-success hover:bg-success hover:text-white px-3.5 py-1.5 rounded-full text-xs font-black transition-all disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>Send Tip</span>
                  </button>

                  <button
                    onClick={handleToggleBlock}
                    className={`flex items-center justify-center h-8 w-8 rounded-full border transition-colors cursor-pointer ${
                      isBlocked 
                        ? "border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                        : "border-border text-text-muted hover:bg-[hsl(var(--text-muted-hsl)/0.05)] hover:text-text-main"
                    }`}
                    title={isBlocked ? "Unblock Creator" : "Block Creator"}
                  >
                    <span className="material-symbols-outlined text-[18px]">block</span>
                  </button>
                </div>
              </div>

              {/* Messages Viewport */}
              <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-4 bg-[hsl(var(--background-hsl)/0.3)]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 select-none">
                    <span className="material-symbols-outlined text-[48px] text-text-muted animate-pulse">chat</span>
                    <p className="text-xs font-bold text-text-main">Say Hello!</p>
                    <p className="text-[11px] text-text-muted max-w-[220px]">Send a greeting message to start connecting with {currentCreator.name}!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.sender === "user";
                    const isPPVUnlocked = msg.id ? mockDb.isUnlocked(msg.id) : false;
                    const showPPVLock = msg.isPPV && !isPPVUnlocked;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 max-w-[80%] ${
                          isUser ? "ml-auto flex-row-reverse" : ""
                        }`}
                      >
                        {!isUser && (
                          <img
                            src={currentCreator.avatar}
                            alt="Avatar"
                            className="h-8 w-8 rounded-full object-cover shrink-0 select-none border border-border"
                          />
                        )}
                        
                        <div className="space-y-1">
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm font-medium ${
                              isUser
                                ? "bg-primary text-white rounded-tr-none"
                                : "bg-surface border border-border text-text-main rounded-tl-none"
                            }`}
                          >
                            {/* Message text */}
                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                            {/* PPV Attachment Content */}
                            {msg.mediaUrl && (
                              <div className={`rounded-xl overflow-hidden relative min-w-[220px] max-w-[260px] border border-border bg-surface-container select-none ${msg.text ? "mt-2.5" : ""}`}>
                                {showPPVLock ? (
                                  /* PPV Locked Glassmorphic overlay */
                                  <div className="flex flex-col items-center justify-center p-5 text-center bg-black/75 backdrop-blur-md min-h-[150px] text-white">
                                    <span className="material-symbols-outlined text-[32px] text-accent mb-2 animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
                                      lock
                                    </span>
                                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-3">Locked Media Post</p>
                                    <button
                                      onClick={() => triggerPPVUnlock(msg.id!, msg.price || 0)}
                                      className="bg-accent hover:opacity-95 active:scale-95 text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-full transition-all flex items-center gap-1 shadow-md cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[13px] leading-none">lock_open</span>
                                      <span>Unlock for ${(msg.price || 0).toFixed(2)}</span>
                                    </button>
                                  </div>
                                ) : (
                                  msg.mediaType === "audio" ? (
                                    <VoicePlayer duration={msg.audioDuration} isUser={isUser} />
                                  ) : (
                                    <img
                                      src={msg.mediaUrl}
                                      alt="Message Attachment"
                                      className="w-full h-auto max-h-[220px] object-cover"
                                    />
                                  )
                                )}
                              </div>
                            )}
                          </div>
                          <p className={`text-[9px] text-text-muted font-semibold ${isUser ? "text-right" : ""}`}>
                            {msg.time} {msg.isPPV && !isPPVUnlocked && "• Locked"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Dock Composer */}
              <div className="p-3 px-4 border-t border-border bg-surface shrink-0 space-y-3">
                {isBlocked ? (
                  <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-center select-none text-red-500 text-xs font-bold leading-relaxed">
                    You have blocked this creator. Unblock to resume messaging.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-2.5">
                    
                    {/* Media preview area */}
                    {mediaUrl && (
                      <div className="bg-background border border-border p-2.5 rounded-xl flex items-center justify-between gap-3 animate-fade-in select-none">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="material-symbols-outlined text-primary text-[24px]">
                            {mediaType === "video" ? "videocam" : "image"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-main truncate max-w-[200px]">{fileName}</p>
                            <p className="text-[9px] text-text-muted uppercase tracking-wider">Ready to attach</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setMediaUrl(""); setFileName(""); }}
                          className="text-red-500 hover:text-red-600 text-xs font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {/* Price configuration for PPV */}
                    {isPPV && (
                      <div className="flex items-center gap-3 bg-background border border-border p-2.5 rounded-xl animate-fade-in select-none">
                        <div className="flex-grow">
                          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Set PPV Unlock Price (USD)</p>
                          <div className="relative flex items-center bg-surface border border-border rounded-lg px-2.5 py-1 focus-within:border-primary">
                            <span className="text-xs font-bold text-text-muted mr-0.5">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              required
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              className="w-full text-xs font-bold bg-transparent outline-none text-text-main"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPPV(false)}
                          className="text-text-muted hover:text-text-main material-symbols-outlined text-[20px] cursor-pointer self-end pb-1"
                        >
                          close
                        </button>
                      </div>
                    )}

                    {/* Main input text + send trigger */}
                    <div className="flex gap-2 items-center">
                      {isRecording ? (
                        <div className="flex-grow flex items-center justify-between bg-primary/5 border border-primary/20 rounded-full px-4 py-2 select-none">
                          <div className="flex items-center gap-2 text-primary font-black text-xs">
                            <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
                            <span className="uppercase tracking-widest text-[9px]">Recording Voice Memo</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-black text-text-main">
                              {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')}
                            </span>
                            <button
                              type="button"
                              onClick={cancelRecording}
                              className="text-text-muted hover:text-red-500 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={sendVoiceNote}
                              className="text-primary hover:text-primary-hover text-xs font-black transition-colors cursor-pointer"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-grow relative flex items-center bg-background border border-border focus-within:border-primary rounded-full px-4 py-2 transition-all">
                          <input
                            type="text"
                            placeholder={`Message @${currentCreator.username}...`}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="w-full text-xs font-medium bg-transparent outline-none text-text-main placeholder-text-muted"
                          />
                        </div>
                      )}
                      
                      {!isRecording && (
                        <button
                          type="submit"
                          disabled={!inputText.trim() && !mediaUrl}
                          className="bg-primary text-white disabled:opacity-50 hover:bg-primary-hover active:scale-95 text-xs font-bold h-10 w-10 flex items-center justify-center rounded-full transition-all cursor-pointer shrink-0 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[20px] font-bold">send</span>
                        </button>
                      )}
                    </div>

                    {/* Composer Toolbar (Attach files, lock prices) */}
                    <div className="flex items-center gap-3 pt-1 border-t border-border/40 select-none">
                      <button
                        type="button"
                        disabled={isRecording}
                        onClick={() => showToast("Local media selector opened")}
                        className="text-text-muted hover:text-primary flex items-center justify-center p-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Upload local files"
                      >
                        <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                      </button>

                      <button
                        type="button"
                        disabled={isRecording}
                        onClick={() => setIsVaultOpen(true)}
                        className="text-text-muted hover:text-primary flex items-center justify-center p-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Browse vault media"
                      >
                        <span className="material-symbols-outlined text-[20px]">folder_special</span>
                      </button>

                      <button
                        type="button"
                        disabled={isRecording}
                        onClick={() => setIsPPV(!isPPV)}
                        className={`flex items-center justify-center p-1 cursor-pointer transition-colors ${isPPV ? "text-accent" : "text-text-muted hover:text-accent"} disabled:opacity-50`}
                        title="Lock content with custom price (PPV)"
                      >
                        <span className="material-symbols-outlined text-[20px]" style={isPPV ? { fontVariationSettings: "'FILL' 1" } : undefined}>lock</span>
                      </button>

                      <button
                        type="button"
                        disabled={isRecording}
                        onClick={startRecording}
                        className="text-text-muted hover:text-primary flex items-center justify-center p-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Record voice note"
                      >
                        <span className="material-symbols-outlined text-[20px]">mic</span>
                      </button>
                    </div>

                  </form>
                )}
              </div>
            </>
          ) : (
            /* Selected Conversation Placeholder */
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center select-none space-y-3">
              <span className="material-symbols-outlined text-[64px] text-text-muted animate-pulse">chat_bubble</span>
              <h3 className="text-base font-extrabold text-text-main">Select a Conversation</h3>
              <p className="text-xs text-text-muted max-w-[280px]">
                Choose one of your active DM threads on the left to review your chat history!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vault Media Selector Modal */}
      <Modal isOpen={isVaultOpen} onClose={() => setIsVaultOpen(false)} title="Attach from Vault">
        <div className="max-h-[320px] overflow-y-auto pr-1 no-scrollbar space-y-2 select-none pt-1">
          {vaultItems.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">Your Vault is empty.</p>
          ) : (
            vaultItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectVaultItem(item)}
                className="w-full p-3 bg-background border border-border hover:border-primary rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer active:scale-[0.98]"
              >
                {item.type === "video" ? (
                  <span className="material-symbols-outlined text-[24px] text-primary shrink-0">videocam</span>
                ) : (
                  <span className="material-symbols-outlined text-[24px] text-primary shrink-0">image</span>
                )}
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-bold text-text-main truncate leading-none mb-1">{item.name}</p>
                  <p className="text-[9px] text-text-muted leading-none">{item.size} • {item.date}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Tipping & Unlocking Secure checkout popup */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title={paymentTitle}
        price={paymentPrice}
        onConfirm={handlePaymentConfirm}
      />

      {/* 1-on-1 Calling Overlay UI Screens */}
      {callState !== "idle" && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex flex-col items-center justify-between p-6 select-none animate-fade-in text-white">
          {/* Top Info bar */}
          <div className="w-full flex items-center justify-between max-w-[400px] border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[18px] animate-pulse">videocam</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/80">
                {callType === "video" ? "Secure Video Call" : "Secure Audio Call"}
              </span>
            </div>
            {callState === "active" && (
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full text-primary">
                {formatCallTime(callDuration)}
              </span>
            )}
          </div>

          {/* Core Content Area */}
          <div className="flex-grow flex flex-col items-center justify-center space-y-6 w-full max-w-[400px]">
            {callState === "calling" && (
              <div className="text-center space-y-4 animate-pulse">
                <div className="relative inline-block">
                  <img
                    src={activeCreatorDetails?.avatar || "/assets/be708ecefc41b969ee64c477f954168c.png"}
                    alt={selectedCreator || ""}
                    className="h-28 w-28 rounded-full object-cover border-4 border-primary shadow-2xl"
                  />
                  <div className="absolute inset-0 rounded-full border border-primary scale-125 animate-ping opacity-70" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">{activeCreatorDetails?.name || selectedCreator}</h3>
                  <p className="text-xs text-white/60 font-semibold">Dialing/Ringing...</p>
                </div>
              </div>
            )}

            {callState === "ringing" && (
              <div className="text-center space-y-4">
                <div className="relative inline-block animate-bounce">
                  <img
                    src="/assets/39bc5c3eed51d62c1022c60686bb459a.png"
                    alt="Incoming Caller"
                    className="h-28 w-28 rounded-full object-cover border-4 border-success shadow-2xl"
                  />
                  <div className="absolute inset-0 rounded-full border border-success scale-125 animate-ping" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">Sam Fan</h3>
                  <p className="text-xs text-success font-black uppercase tracking-wider animate-pulse">Incoming Private Call</p>
                </div>
              </div>
            )}

            {callState === "active" && (
              <div className="relative w-full aspect-[9/14] bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
                {/* Simulated Partner Screen Stream Feed */}
                {callType === "video" && (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover filter blur-sm opacity-20 scale-105 pointer-events-none"
                  />
                )}

                {/* Main looping overlay placeholder/details */}
                <div className="relative z-10 text-center space-y-3">
                  <img
                    src={user?.role === "creator" ? "/assets/39bc5c3eed51d62c1022c60686bb459a.png" : activeCreatorDetails?.avatar}
                    alt="Partner"
                    className="h-24 w-24 rounded-full object-cover border-2 border-white/20 mx-auto shadow-md"
                  />
                  <div>
                    <h4 className="text-sm font-black">
                      {user?.role === "creator" ? "Sam Fan" : activeCreatorDetails?.name}
                    </h4>
                    <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mt-1 select-none">
                      Connected • {isMuted ? "Audio Muted" : "Active Sound"}
                    </p>
                  </div>
                </div>

                {/* Local Camera Draggable/Drift-free Draggable Video PIP Box */}
                {callType === "video" && (
                  <div className="absolute bottom-4 right-4 w-[100px] h-[150px] sm:w-[120px] sm:h-[180px] bg-black border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-20">
                    {isCamOff ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] font-bold text-white/50 bg-neutral-950 p-2 text-center">
                        <span className="material-symbols-outlined text-[16px] mb-1">videocam_off</span>
                        <span>Cam Off</span>
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Billing Info & Action Bar */}
          <div className="w-full max-w-[400px] flex flex-col items-center gap-4">
            {/* Real-Time Billing status badge overlay */}
            <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center select-none w-full">
              {user?.role === "fan" ? (
                <span>Rate: ${activeCreatorDetails?.callPricePerMin || "5.00"}/min • billed from wallet</span>
              ) : (
                <span>Rate: ${activeCreatorDetails?.callPricePerMin || "5.00"}/min • payouts loading</span>
              )}
            </div>

            {/* Calling Command Buttons bar */}
            <div className="flex gap-4 items-center justify-center pb-2 select-none">
              {callState === "ringing" ? (
                <>
                  <button
                    onClick={endCall}
                    className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center cursor-pointer transition-transform text-white"
                    title="Decline"
                  >
                    <span className="material-symbols-outlined text-[26px]">call_end</span>
                  </button>
                  <button
                    onClick={acceptIncomingCall}
                    className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 active:scale-95 flex items-center justify-center cursor-pointer transition-transform text-white animate-pulse"
                    title="Accept Call"
                  >
                    <span className="material-symbols-outlined text-[26px]">call</span>
                  </button>
                </>
              ) : (
                <>
                  {callState === "active" && (
                    <>
                      <button
                        onClick={toggleMic}
                        className={`h-12 w-12 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                          isMuted ? "bg-red-500 border-red-500 text-white" : "border-white/20 text-white hover:bg-white/10"
                        }`}
                        title={isMuted ? "Unmute Mic" : "Mute Mic"}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isMuted ? "mic_off" : "mic"}
                        </span>
                      </button>

                      <button
                        onClick={endCall}
                        className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-90 flex items-center justify-center cursor-pointer transition-transform text-white shadow-lg"
                        title="End Call"
                      >
                        <span className="material-symbols-outlined text-[26px]">call_end</span>
                      </button>

                      {callType === "video" && (
                        <button
                          onClick={toggleCamera}
                          className={`h-12 w-12 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                            isCamOff ? "bg-red-500 border-red-500 text-white" : "border-white/20 text-white hover:bg-white/10"
                          }`}
                          title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isCamOff ? "videocam_off" : "videocam"}
                          </span>
                        </button>
                      )}
                    </>
                  )}

                  {callState === "calling" && (
                    <button
                      onClick={endCall}
                      className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-90 flex items-center justify-center cursor-pointer transition-transform text-white"
                      title="Cancel Call"
                    >
                      <span className="material-symbols-outlined text-[26px]">call_end</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background text-text-muted">
        <span className="animate-pulse">Loading Chat...</span>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
