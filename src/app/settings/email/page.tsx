"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function EmailSettingsPage() {
  const router = useRouter();
  const { showToast } = useUser();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        setEmail(localStorage.getItem("ch_user_email") || "alex.rivera@creatorhub.com");
      }, 0);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      showToast("Please enter a valid email address");
      return;
    }

    localStorage.setItem("ch_user_email", clean);
    showToast("Email updated. Verification pending link sent!");
    setTimeout(() => {
      router.push("/settings");
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Email Configurations</h1>
        <p className="text-xs text-text-muted">Configure and link secure email records for platform reports.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1 select-none">Mailing Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
        >
          <span>Save Configuration</span>
          <span className="material-symbols-outlined text-[16px] leading-none font-bold">check</span>
        </button>
      </form>
    </div>
  );
}
