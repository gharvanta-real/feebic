"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function ReferralsSettingsPage() {
  const { user, showToast } = useUser();
  const [copied, setCopied] = useState(false);
  const referralLink = `https://felbic.com/signup?ref=${user?.username || "user"}`;

  const handleCopy = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      showToast("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1 select-none">
          <h1 className="text-base font-extrabold text-text-main">Referrals Program</h1>
          <p className="text-xs text-text-muted">Earn 10% lifetime payouts for inviting new creators to Felbic!</p>
        </div>

        {/* Dynamic Referral Invite Link */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border select-none">
            Invite Link
          </h2>

          <div className="flex gap-2 select-none">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-grow px-4 py-2 bg-background border border-border rounded-xl text-xs outline-none text-text-muted select-text"
            />
            <button
              onClick={handleCopy}
              className="bg-primary text-white hover:opacity-95 active:scale-95 text-xs font-bold px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Invitation stats mock logs */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-4 shadow-sm select-none">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border">
            Referrals Metrics
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background border border-border p-3.5 rounded-xl text-center">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Total Invites</p>
              <p className="text-base font-black text-text-main">14 creators</p>
            </div>
            <div className="bg-background border border-border p-3.5 rounded-xl text-center">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Total Payouts</p>
              <p className="text-base font-black text-success">$428.50</p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
