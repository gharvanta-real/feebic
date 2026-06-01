"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { mockDb, SubDetails, Creator } from "@/lib/mockDb";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export default function SubscriptionsPage() {
  const router = useRouter();
  const { subscriptions, refreshUserProfile, unsubscribeFromCreator, subscribeToCreator, showToast } = useUser();
  const [subDetails, setSubDetails] = useState<SubDetails[]>([]);
  const [suggestions, setSuggestions] = useState<Creator[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "expired" | "suggestions">("active");

  const fetchData = () => {
    // Refresh user context and fetch latest DB info
    refreshUserProfile();
    setSubDetails(mockDb.getSubDetailsList());
    
    // Fetch suggestions (creators the user is not subscribed to)
    const allCreators = Object.values(mockDb.getCreators());
    const currentSubs = mockDb.getSubscriptions();
    const filtered = allCreators.filter(c => !currentSubs.includes(c.username));
    setSuggestions(filtered);
  };

  useEffect(() => {
    setTimeout(() => {
      fetchData();
    }, 0);

    const handleSubscriptionsUpdate = () => fetchData();
    window.addEventListener("ch_subscriptions_updated", handleSubscriptionsUpdate);
    return () => window.removeEventListener("ch_subscriptions_updated", handleSubscriptionsUpdate);
  }, []);

  const handleToggleAutoRenew = (username: string) => {
    const isNewStateRenew = mockDb.toggleSubscriptionRenew(username);
    fetchData();
    showToast(`Auto-renew has been turned ${isNewStateRenew ? "ON" : "OFF"} for @${username}`);
  };

  const handleCancelSub = (username: string) => {
    if (confirm(`Are you sure you want to cancel your subscription to @${username}?`)) {
      unsubscribeFromCreator(username);
      fetchData();
      showToast(`Cancelled subscription to @${username}`);
    }
  };

  const handleReSubscribe = (username: string, price: number) => {
    subscribeToCreator(username, price);
    fetchData();
    showToast(`Re-subscribed to @${username}!`);
  };

  const activeSubs = subDetails.filter(s => s.status === "active");
  const expiredSubs = subDetails.filter(s => s.status === "expired");

  return (
    <AppShell>
      {/* Mobile Top Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted select-none">Subscriptions</span>
      </MobileHeader>

      {/* Main Column */}
      <div className="app-page-shell space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="space-y-1 select-none">
          <h1 className="text-lg font-black text-text-main font-sans tracking-tight">Subscriptions Manager</h1>
          <p className="text-xs text-text-muted font-medium">Review your subscription renewals, billing dates, and auto-renew status in real-time.</p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between border-b border-border pb-0 select-none bg-transparent">
          <div className="flex gap-6 overflow-x-auto no-scrollbar w-full">
            {(["active", "expired", "suggestions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[14px] font-extrabold pb-3.5 cursor-pointer transition-all border-b-2 leading-none relative capitalize ${
                  activeTab === tab
                    ? "border-primary text-primary font-black"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                {tab === "suggestions" ? "Discover" : `${tab} (${tab === "active" ? activeSubs.length : expiredSubs.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Lists */}
        <div className="space-y-4">
          
          {/* Active Tab */}
          {activeTab === "active" && (
            activeSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 select-none">
                <span className="material-symbols-outlined text-[54px] text-text-muted">card_membership</span>
                <h3 className="text-base font-extrabold text-text-main">No active subscriptions</h3>
                <p className="text-xs text-text-muted max-w-[280px]">
                  You are not subscribed to any creator tiers yet. Explore discover tab or check out active creators!
                </p>
                <button
                  onClick={() => setActiveTab("suggestions")}
                  className="bg-primary text-white text-xs font-black px-5 py-2.5 rounded-full shadow hover:opacity-95 transition-all cursor-pointer"
                >
                  Discover Creators
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSubs.map((sub) => (
                  <div
                    key={sub.username}
                    className="bg-surface border border-border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/30 transition-all shadow-sm"
                  >
                    {/* Creator Profile */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Link href={`/profile?u=${sub.username}`} className="shrink-0 relative group">
                        <img
                          src={sub.avatar}
                          alt={sub.name}
                          className="h-12 w-12 rounded-full object-cover border border-border group-hover:opacity-90 transition-opacity"
                        />
                        <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-surface shadow-sm"></span>
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <Link href={`/profile?u=${sub.username}`} className="text-xs font-black text-text-main hover:text-primary transition-colors truncate">
                            {sub.name}
                          </Link>
                          <VerifiedBadge size="xs" />
                        </div>
                        <p className="text-[10px] text-text-muted font-bold">@{sub.username}</p>
                        <p className="text-[11px] font-bold text-primary mt-1">${sub.price}/mo • Renews: {sub.expiryDate}</p>
                      </div>
                    </div>

                    {/* Auto renew toggle & actions */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                      
                      {/* Auto renew switch */}
                      <div className="flex items-center gap-2 select-none">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Auto-Renew</p>
                          <p className={`text-[10px] font-bold leading-none mt-0.5 ${sub.autoRenew ? "text-success" : "text-text-muted"}`}>
                            {sub.autoRenew ? "Enabled" : "Disabled"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleAutoRenew(sub.username)}
                          className={`relative h-5.5 w-10 cursor-pointer rounded-full border p-[2px] transition-colors ${
                            sub.autoRenew ? "bg-success border-success" : "bg-gray-200 dark:bg-border"
                          }`}
                        >
                          <div
                            className={`h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                              sub.autoRenew ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Unsubscribe and message */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancelSub(sub.username)}
                          className="h-8 w-8 rounded-full border border-border text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          title="Cancel Membership"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                        <Link
                          href={`/chat?u=${sub.username}`}
                          className="h-8 w-8 rounded-full border border-border text-text-muted hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
                          title="Message Creator"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                        </Link>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Expired Tab */}
          {activeTab === "expired" && (
            expiredSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 select-none">
                <span className="material-symbols-outlined text-[54px] text-text-muted">history</span>
                <h3 className="text-base font-extrabold text-text-main">No expired subscriptions</h3>
                <p className="text-xs text-text-muted max-w-[280px]">
                  All your premium memberships are active. Any cancelled or past subscriptions will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiredSubs.map((sub) => (
                  <div
                    key={sub.username}
                    className="bg-surface border border-border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/20 transition-all shadow-sm"
                  >
                    {/* Creator Profile */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Link href={`/profile?u=${sub.username}`} className="shrink-0 relative group">
                        <img
                          src={sub.avatar}
                          alt={sub.name}
                          className="h-12 w-12 rounded-full object-cover border border-border group-hover:opacity-90 transition-opacity grayscale"
                        />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <Link href={`/profile?u=${sub.username}`} className="text-xs font-black text-text-main hover:text-primary transition-colors truncate">
                            {sub.name}
                          </Link>
                          <VerifiedBadge size="xs" />
                        </div>
                        <p className="text-[10px] text-text-muted font-bold">@{sub.username}</p>
                        <p className="text-[11px] font-bold text-text-muted mt-1">Expired: {sub.expiryDate} • Base rate: ${sub.price}/mo</p>
                      </div>
                    </div>

                    {/* Re-subscribe CTA */}
                    <button
                      onClick={() => handleReSubscribe(sub.username, sub.price)}
                      className="w-full sm:w-auto bg-primary text-white hover:opacity-95 active:scale-95 text-xs font-extrabold px-5 py-2 rounded-full transition-all cursor-pointer uppercase tracking-wider text-center"
                    >
                      Renew Subscription
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Suggestions Tab */}
          {activeTab === "suggestions" && (
            suggestions.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-10">You are subscribed to everyone! Good job!</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {suggestions.map((creator) => (
                  <div
                    key={creator.username}
                    className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow transition-all"
                  >
                    <div
                      className="h-20 bg-cover bg-center"
                      style={{ backgroundImage: `url(${creator.cover})` }}
                    />
                    <div className="px-4 pb-4 -mt-6 flex justify-between items-end select-none">
                      <Link href={`/profile?u=${creator.username}`} className="relative group block">
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="h-14 w-14 rounded-full object-cover border-4 border-surface bg-surface"
                        />
                      </Link>
                      <button
                        onClick={() => handleReSubscribe(creator.username, creator.subPrice)}
                        className="bg-primary text-white hover:opacity-95 active:scale-95 text-xs font-black px-4 py-2 rounded-full transition-all cursor-pointer uppercase tracking-wider"
                      >
                        Subscribe ${creator.subPrice}/mo
                      </button>
                    </div>
                    <div className="px-4 pb-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/profile?u=${creator.username}`} className="text-xs font-black text-text-main hover:text-primary transition-colors">
                          {creator.name}
                        </Link>
                        {creator.verified && (
                          <VerifiedBadge size="sm" />
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted font-bold">@{creator.username}</p>
                      <p className="text-xs text-text-main line-clamp-1 leading-relaxed mt-1 font-medium">{creator.bio}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>
    </AppShell>
  );
}
