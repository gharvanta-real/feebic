"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

export default function DeleteAccountSettingsPage() {
  const router = useRouter();
  const { showToast, logout } = useUser();
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      showToast("Please confirm account deletion checking the checkbox first");
      return;
    }

    try {
      await apiClient.delete("/users/account", { password });

      showToast("Account deleted successfully. We are sorry to see you go!");
      setTimeout(() => {
        logout();
        router.push("/login");
      }, 1000);
    } catch (err: any) {
      showToast(err.message || "Your confirmation password is incorrect");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Delete Account</h1>
        <p className="text-xs text-text-muted">Permanently erase your Felbic profile logs and subscription history.</p>
      </div>

      <div className="bg-[hsl(var(--accent-hsl)/0.08)] border border-[hsl(var(--accent-hsl)/0.2)] p-4 rounded-xl flex gap-3 items-start select-none">
        <span className="material-symbols-outlined text-accent text-[22px]">warning</span>
        <div>
          <p className="font-bold text-xs text-accent mb-0.5 leading-none">Warning: Irreversible Action</p>
          <p className="text-[10px] text-text-muted leading-relaxed">
            Deleting your account will immediately wipe your balance, unbookmark all saved clips, cancel active payouts, and erase all conversations. This action cannot be undone!
          </p>
        </div>
      </div>

      <form onSubmit={handleDelete} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
        {/* Confirm Checkbox */}
        <label className="flex gap-3 items-start cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-0"
          />
          <div>
            <p className="text-xs font-bold text-text-main leading-none mb-1">Confirm profile erasure</p>
            <p className="text-[10px] text-text-muted">I understand that my active subscription credits and digital wallet balance will be lost</p>
          </div>
        </label>

        {/* Password input */}
        <div>
          <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Confirm Account Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
          />
        </div>

        <button
          type="submit"
          disabled={!confirmed}
          className="w-full py-2.5 bg-accent hover:opacity-95 text-white disabled:opacity-50 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
        >
          <span className="material-symbols-outlined text-[16px] leading-none font-bold">delete</span>
          <span>Permanently Erase Profile</span>
        </button>
      </form>
    </div>
  );
}
