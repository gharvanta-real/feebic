"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

export default function SecuritySettingsPage() {
  const { showToast } = useUser();
  const [twoFactor, setTwoFactor] = useState(false);
  const [biometric, setBiometric] = useState(true);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        setTwoFactor(localStorage.getItem("ch_security_2fa") === "true");
        setBiometric(localStorage.getItem("ch_security_biometric") !== "false");
      }, 0);
    }
  }, []);

  const handleToggle = (key: string, current: boolean, setter: (val: boolean) => void, label: string) => {
    const next = !current;
    setter(next);
    localStorage.setItem(key, next ? "true" : "false");
    showToast(`${label} ${next ? "enabled" : "disabled"}`);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = localStorage.getItem("ch_user_password") || "password123";

    if (currentPass !== stored && currentPass !== "") {
      showToast("Current password is incorrect");
      return;
    }
    if (newPass.length < 8) {
      showToast("New password must be at least 8 characters");
      return;
    }
    if (newPass !== confirmPass) {
      showToast("Passwords do not match");
      return;
    }

    localStorage.setItem("ch_user_password", newPass);
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    showToast("Password updated successfully!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Security & Password</h1>
        <p className="text-xs text-text-muted">Configure security shields, 2FA codes, and update login keys.</p>
      </div>

      {/* Security Shields Grid */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-4 shadow-sm select-none">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border">
          Security Controls
        </h2>

        {/* 2FA Toggle */}
        <div className="flex justify-between items-center gap-3">
          <div>
            <p className="text-xs font-bold text-text-main">2-Factor Authentication (2FA)</p>
            <p className="text-[10px] text-text-muted">Enforce secondary OTP codes upon new log-ins</p>
          </div>
          <button
            onClick={() => handleToggle("ch_security_2fa", twoFactor, setTwoFactor, "2-Factor authentication")}
            className={`relative h-6 w-10 cursor-pointer rounded-full border p-[2px] transition-colors ${
              twoFactor ? "bg-success border-success" : "bg-gray-200 dark:bg-border"
            }`}
          >
            <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${twoFactor ? "translate-x-4" : "translate-x-0"}`}></div>
          </button>
        </div>

        {/* Biometrics Toggle */}
        <div className="flex justify-between items-center gap-3">
          <div>
            <p className="text-xs font-bold text-text-main">Biometric Access</p>
            <p className="text-[10px] text-text-muted">Enable face scan / fingerprint shortcuts on mobile</p>
          </div>
          <button
            onClick={() => handleToggle("ch_security_biometric", biometric, setBiometric, "Biometrics")}
            className={`relative h-6 w-10 cursor-pointer rounded-full border p-[2px] transition-colors ${
              biometric ? "bg-success border-success" : "bg-gray-200 dark:bg-border"
            }`}
          >
            <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${biometric ? "translate-x-4" : "translate-x-0"}`}></div>
          </button>
        </div>
      </div>

      {/* Update Password Form */}
      <form onSubmit={handlePasswordSubmit} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border select-none">
          Change Password
        </h2>

        <div>
          <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">Current Password</label>
          <input
            type="password"
            required
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">New Password</label>
          <input
            type="password"
            required
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">Confirm New Password</label>
          <input
            type="password"
            required
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
        >
          <span>Update Login Credentials</span>
          <span className="material-symbols-outlined text-[16px] leading-none font-bold">lock_open</span>
        </button>
      </form>
    </div>
  );
}
