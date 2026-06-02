"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { mockDb, Notification } from "@/lib/mockDb";
import { apiClient } from "@/lib/apiClient";


export default function NotificationsPage() {
  const { markNotificationsAsRead, showToast } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleDismiss = async (id: string) => {
    try {
      await apiClient.post("/notifications/read", { id, action: "dismiss" });
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await apiClient.post("/notifications/read", { action: "clear_all" });
      setNotifications([]);
      showToast("All notifications cleared");
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const formatRelativeTime = (rfc3339Str: string): string => {
    try {
      const date = new Date(rfc3339Str);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return "Just now";
    }
  };

  const fetchNotifs = async () => {
    try {
      const data = await apiClient.get<any[]>("/notifications");
      const mapped = data.map((n) => ({
        id: n.id,
        type: n.type,
        text: n.text,
        amount: n.amount,
        read: n.read,
        time: n.time ? formatRelativeTime(n.time) : "Just now",
        senderName: n.sender_name || "Someone",
        senderAvatar: n.sender_avatar || "/assets/be708ecefc41b969ee64c477f954168c.png"
      }));
      setNotifications(mapped);
    } catch (err) {
      console.error("API error fetching notifications:", err);
    }
  };


  useEffect(() => {
    setTimeout(() => {
      fetchNotifs();
    }, 0);
    
    // Automatically mark all read when loading the page
    markNotificationsAsRead();

    const handleNotifUpdate = () => fetchNotifs();
    window.addEventListener("ch_notification_received", handleNotifUpdate);
    return () => window.removeEventListener("ch_notification_received", handleNotifUpdate);
  }, []);

  const handleMarkAllRead = () => {
    markNotificationsAsRead();
    fetchNotifs();
    showToast("All notifications marked as read");
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "subscribe":
        return <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>;
      case "tip":
        return <span className="material-symbols-outlined text-success text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>;
      case "like":
        return <span className="material-symbols-outlined text-accent text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>;
      case "comment":
        return <span className="material-symbols-outlined text-primary text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>;
      default:
        return <span className="material-symbols-outlined text-text-muted text-[15px]">notifications</span>;
    }
  };

  return (
    <AppShell>
      {/* 1. Mobile Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted select-none">Alerts</span>
      </MobileHeader>

      {/* 2. Main Page Content */}
      <div className="app-page-shell space-y-6 animate-fade-in">
          
          {/* Header Action controls */}
          <div className="flex justify-between items-center select-none pb-3 border-b border-border">
            <h2 className="text-lg font-black text-text-main">Notifications</h2>
            <div className="flex items-center gap-3">
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs font-bold text-text-muted hover:text-accent cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications feed list */}
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 select-none">
                <span className="material-symbols-outlined text-[54px] text-text-muted">notifications_off</span>
                <h3 className="text-base font-extrabold text-text-main">No notifications yet</h3>
                <p className="text-xs text-text-muted max-w-[280px]">
                  When fans subscribe, tip you, or interact with your updates, they will appear here!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 space-y-3 select-none">
                {notifications.map((notif, idx) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-4 group transition-all ${
                      idx > 0 ? "pt-3.5" : ""
                    } ${!notif.read ? "bg-primary/5 -mx-4 px-4 py-2 rounded-xl" : ""}`}
                  >
                    {/* Icon */}
                    <div className="relative shrink-0">
                      <img
                        src={notif.senderAvatar}
                        alt={notif.senderName}
                        className="h-10 w-10 rounded-full object-cover border border-border"
                      />
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface">
                        {getNotifIcon(notif.type)}
                      </div>
                    </div>

                    {/* Text */}
                    <div className="flex-grow min-w-0">
                      <p className="text-xs text-text-main leading-relaxed select-text">
                        <span className="font-extrabold mr-1">{notif.senderName}</span>
                        {notif.text}
                        {notif.amount && (
                          <span className="font-extrabold text-success ml-1">
                            ${notif.amount.toFixed(2)}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-text-muted pt-1 leading-none">{notif.time}</p>
                    </div>

                    {/* Dismiss button */}
                    <button
                      onClick={() => handleDismiss(notif.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent transition-all cursor-pointer shrink-0"
                      title="Dismiss"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </AppShell>
  );
}
