"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function SettingsMainPage() {
  const router = useRouter();
  const { user, updateProfile, showToast } = useUser();

  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        setPushNotifs(localStorage.getItem("ch_pref_push_notifications") !== "false");
        setEmailNotifs(localStorage.getItem("ch_pref_email_notifications") === "true");
        setPrivateProfile(localStorage.getItem("ch_pref_private_profile") === "true");
      }, 0);
    }
  }, []);

  const handleToggle = (key: string, currentValue: boolean, setter: (val: boolean) => void, label: string) => {
    const next = !currentValue;
    setter(next);
    localStorage.setItem(key, next ? "true" : "false");
    showToast(`${label} ${next ? "enabled" : "disabled"}`);
  };

  const handleRoleSwitch = (role: "fan" | "creator") => {
    if (!user || user.role === role) return;
    updateProfile({ role });
    showToast(`Switched to ${role === "creator" ? "Creator" : "Visitor"} mode`);
  };

  const handleLogout = () => {
    localStorage.setItem("ch_logged_out", "true");
    showToast("Logged out successfully");
    setTimeout(() => router.push("/login"), 500);
  };

  if (!user) return null;

  const menu = [
    { href: "/settings/edit-profile", label: "Edit Profile", icon: "edit", desc: "Name, handle, bio, avatar", role: ["fan", "creator"] },
    { href: "/settings/email", label: "Email", icon: "mail", desc: "Update linked email", role: ["fan", "creator"] },
    { href: "/settings/security", label: "Security & Password", icon: "lock", desc: "2FA, biometrics, password", role: ["fan", "creator"] },
    { href: "/settings/blocked-users", label: "Blocked Users", icon: "block", desc: "Manage restricted accounts", role: ["fan", "creator"] },
    { href: "/settings/monetization", label: "Monetization", icon: "monetization_on", desc: "Pricing, bank payout", role: ["creator"] },
    { href: "/settings/verification", label: "Identity Verification", icon: "verified_user", desc: "KYC records, badge", role: ["creator"] },
    { href: "/settings/referrals", label: "Referrals", icon: "group", desc: "Earn from creator invites", role: ["creator"] },
    { href: "/settings/payments", label: "Payment Methods", icon: "credit_card", desc: "Cards for subscriptions", role: ["fan", "creator"] },
    { href: "/settings/delete-account", label: "Delete Account", icon: "delete_forever", desc: "Permanently erase profile", role: ["fan", "creator"] },
  ];

  const visibleMenu = menu.filter((item) => item.role.includes(user.role));

  return (
    <div className="space-y-5">
      {/* ── Desktop: Account overview card ── */}
      <div className="hidden sm:block">
        <div className="space-y-1 mb-5">
          <h1 className="text-base font-extrabold text-text-main">Account Settings</h1>
          <p className="text-xs text-text-muted">Manage your profile, security, and preferences.</p>
        </div>

        {/* Profile summary */}
        <div className="border border-border rounded-2xl p-4 flex items-center gap-4">
          <img
            src={user.avatar}
            alt="Avatar"
            className="h-14 w-14 rounded-full object-cover border border-border shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-text-main truncate">{user.displayName}</p>
            <p className="text-xs text-text-muted">@{user.username}</p>
            {user.bio && (
              <p className="text-[11px] text-text-muted mt-1 line-clamp-1">{user.bio}</p>
            )}
          </div>
          <Link
            href="/settings/edit-profile"
            className="shrink-0 px-3.5 py-1.5 border border-border rounded-full text-xs font-bold text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            Edit
          </Link>
        </div>

        {/* Role switcher */}
        <div className="mt-4 border border-border rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-text-main">Account Mode</p>
            <p className="text-[10px] text-text-muted">Switch between Visitor (fan) and Creator mode</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRoleSwitch("fan")}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                user.role === "fan"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-muted hover:border-text-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]" style={user.role === "fan" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                visibility
              </span>
              Visitor
              {user.role === "fan" && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>
            <button
              onClick={() => handleRoleSwitch("creator")}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                user.role === "creator"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-muted hover:border-text-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]" style={user.role === "creator" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                star
              </span>
              Creator
              {user.role === "creator" && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>
          </div>
        </div>

        {/* Quick preference toggles */}
        <div className="mt-4 border border-border rounded-2xl p-4 space-y-4">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border pb-2">Preferences</p>
          {[
            { label: "Push Notifications", desc: "Live alerts in browser", key: "ch_pref_push_notifications", val: pushNotifs, setter: setPushNotifs },
            { label: "Email Digests", desc: "Weekly platform activity", key: "ch_pref_email_notifications", val: emailNotifs, setter: setEmailNotifs },
            { label: "Private Profile", desc: "Hide posts from non-subscribers", key: "ch_pref_private_profile", val: privateProfile, setter: setPrivateProfile },
          ].map(({ label, desc, key, val, setter }) => (
            <div key={key} className="flex justify-between items-center gap-3">
              <div>
                <p className="text-xs font-bold text-text-main">{label}</p>
                <p className="text-[10px] text-text-muted">{desc}</p>
              </div>
              <button
                onClick={() => handleToggle(key, val, setter, label)}
                className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full border transition-colors ${
                  val ? "border-primary bg-primary/10" : "border-border bg-background"
                } p-[3px]`}
              >
                <div className={`h-[14px] w-[14px] rounded-full transition-transform ${
                  val ? "translate-x-4 bg-primary" : "translate-x-0 bg-text-muted"
                }`} />
              </button>
            </div>
          ))}
        </div>

        {/* Select a section hint */}
        <div className="mt-4 flex items-center gap-2 text-text-muted select-none">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <p className="text-[11px]">Select a category from the left to configure</p>
        </div>
      </div>

      {/* ── Mobile: Full menu list ── */}
      <div className="sm:hidden space-y-5">
        <div className="space-y-1 select-none">
          <h1 className="text-lg font-black text-text-main">Settings</h1>
          <p className="text-xs text-text-muted">Manage your Felbic account.</p>
        </div>

        {/* Mobile profile summary */}
        <div className="border border-border rounded-2xl p-4 flex items-center gap-3">
          <img
            src={user.avatar}
            alt="Avatar"
            className="h-12 w-12 rounded-full object-cover border border-border shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-text-main truncate">{user.displayName}</p>
            <p className="text-xs text-text-muted">@{user.username}</p>
          </div>
          <Link
            href="/settings/edit-profile"
            className="shrink-0 h-8 w-8 flex items-center justify-center border border-border rounded-full hover:border-primary hover:text-primary text-text-muted transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </Link>
        </div>

        {/* Mobile role switcher */}
        <div className="border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-text-main">Account Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {(["fan", "creator"] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleSwitch(r)}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  user.role === r
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-text-muted hover:border-text-muted"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]" style={user.role === r ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {r === "fan" ? "visibility" : "star"}
                </span>
                {r === "fan" ? "Visitor" : "Creator"}
                {user.role === r && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile preference toggles */}
        <div className="border border-border rounded-2xl p-4 space-y-4">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border pb-2">Preferences</p>
          {[
            { label: "Push Notifications", desc: "Live browser alerts", key: "ch_pref_push_notifications", val: pushNotifs, setter: setPushNotifs },
            { label: "Email Digests", desc: "Weekly reports", key: "ch_pref_email_notifications", val: emailNotifs, setter: setEmailNotifs },
            { label: "Private Profile", desc: "Non-subscriber feed", key: "ch_pref_private_profile", val: privateProfile, setter: setPrivateProfile },
          ].map(({ label, desc, key, val, setter }) => (
            <div key={key} className="flex justify-between items-center gap-3">
              <div>
                <p className="text-xs font-bold text-text-main">{label}</p>
                <p className="text-[10px] text-text-muted">{desc}</p>
              </div>
              <button
                onClick={() => handleToggle(key, val, setter, label)}
                className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full border transition-colors ${
                  val ? "border-primary bg-primary/10" : "border-border bg-background"
                } p-[3px]`}
              >
                <div className={`h-[14px] w-[14px] rounded-full transition-transform ${
                  val ? "translate-x-4 bg-primary" : "translate-x-0 bg-text-muted"
                }`} />
              </button>
            </div>
          ))}
        </div>

        {/* Mobile nav links */}
        <div className="space-y-1.5">
          {visibleMenu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border border-border rounded-xl p-3.5 flex items-center gap-3 hover:border-text-muted transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[22px] shrink-0">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-main leading-none mb-0.5">{item.label}</p>
                <p className="text-[10px] text-text-muted leading-none truncate">{item.desc}</p>
              </div>
              <span className="material-symbols-outlined text-text-muted text-[18px] shrink-0">chevron_right</span>
            </Link>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 border border-border rounded-full font-bold text-xs text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Log Out
        </button>
      </div>
    </div>
  );
}
