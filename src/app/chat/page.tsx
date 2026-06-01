"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { mockDb, Creator, ChatMessage, VaultItem } from "@/lib/mockDb";
import { useUser } from "@/context/UserContext";
import { PaymentModal } from "@/components/ui/PaymentModal";
import { Modal } from "@/components/ui/Modal";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export default function ChatPage() {
  const { blockedUsers, toggleBlock, showToast, user } = useUser();
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

  // Vault picking
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);

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
                                  <img
                                    src={msg.mediaUrl}
                                    alt="Message Attachment"
                                    className="w-full h-auto max-h-[220px] object-cover"
                                  />
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
                      <div className="flex-grow relative flex items-center bg-background border border-border focus-within:border-primary rounded-full px-4 py-2 transition-all">
                        <input
                          type="text"
                          placeholder={`Message @${currentCreator.username}...`}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          className="w-full text-xs font-medium bg-transparent outline-none text-text-main placeholder-text-muted"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={!inputText.trim() && !mediaUrl}
                        className="bg-primary text-white disabled:opacity-50 hover:bg-primary-hover active:scale-95 text-xs font-bold h-10 w-10 flex items-center justify-center rounded-full transition-all cursor-pointer shrink-0 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[20px] font-bold">send</span>
                      </button>
                    </div>

                    {/* Composer Toolbar (Attach files, lock prices) */}
                    <div className="flex items-center gap-3 pt-1 border-t border-border/40 select-none">
                      <button
                        type="button"
                        onClick={() => showToast("Local media selector opened")}
                        className="text-text-muted hover:text-primary flex items-center justify-center p-1 cursor-pointer transition-colors"
                        title="Upload local files"
                      >
                        <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsVaultOpen(true)}
                        className="text-text-muted hover:text-primary flex items-center justify-center p-1 cursor-pointer transition-colors"
                        title="Browse vault media"
                      >
                        <span className="material-symbols-outlined text-[20px]">folder_special</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPPV(!isPPV)}
                        className={`flex items-center justify-center p-1 cursor-pointer transition-colors ${isPPV ? "text-accent" : "text-text-muted hover:text-accent"}`}
                        title="Lock content with custom price (PPV)"
                      >
                        <span className="material-symbols-outlined text-[20px]" style={isPPV ? { fontVariationSettings: "'FILL' 1" } : undefined}>lock</span>
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
    </AppShell>
  );
}
