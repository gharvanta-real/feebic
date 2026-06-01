"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";

export default function BlockedUsersPage() {
  const { user, blockedUsers, toggleBlock, showToast } = useUser();
  const [inputVal, setInputVal] = useState("");

  const handleBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");

    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      showToast("Enter a valid creator handle to block");
      return;
    }

    if (clean === (user?.username || "")) {
      showToast("You cannot restrict your own account");
      return;
    }

    if (blockedUsers.includes(clean)) {
      showToast(`@${clean} is already restricted`);
      return;
    }

    toggleBlock(clean);
    setInputVal("");
    showToast(`Restricted @${clean}`);
  };

  const handleUnblock = (username: string) => {
    toggleBlock(username);
    showToast(`Removed restriction for @${username}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Blocked Users</h1>
        <p className="text-xs text-text-muted">Restrict specific creators from messaging you or showing up on your feeds.</p>
      </div>

      {/* Block Search Input Form */}
      <form onSubmit={handleBlock} className="flex gap-2">
        <div className="relative flex-grow flex items-center bg-surface border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-all">
          <span className="text-xs font-bold text-text-muted mr-0.5 select-none">@</span>
          <input
            type="text"
            placeholder="Type handle to block..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-full text-xs bg-transparent outline-none text-text-main placeholder-text-muted"
          />
        </div>
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="bg-accent text-white hover:opacity-90 active:scale-95 disabled:opacity-50 text-xs font-bold px-5 rounded-xl transition-all cursor-pointer shrink-0 select-none"
        >
          Restrict
        </button>
      </form>

      {/* Blocked Users Scrollable List */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-4 shadow-sm select-none">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border">
          Restricted Accounts ({blockedUsers.length})
        </h2>

        {blockedUsers.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">Your blocked list is empty.</p>
        ) : (
          <div className="space-y-3 divide-y divide-border/40">
            {blockedUsers.map((username, idx) => (
              <div
                key={username}
                className={`flex justify-between items-center gap-3 ${idx > 0 ? "pt-3" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-main truncate">@{username}</p>
                  <p className="text-[10px] text-text-muted">Restricted account logs</p>
                </div>
                <button
                  onClick={() => handleUnblock(username)}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3.5 py-1.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  Unrestrict
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
