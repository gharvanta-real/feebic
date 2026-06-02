"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useClerk } from "@clerk/nextjs";
import { filterByRole, mainNavLinks, roleLabel, settingsLinks, type AccountRole } from "@/lib/roleAccess";

export default function SettingsMainPage() {
  const router = useRouter();
  const { user, updateProfile, showToast } = useUser();
  const { signOut } = useClerk();

  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<"fan" | "creator" | null>(null);

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

  const handleRoleSwitch = async (role: "fan" | "creator") => {
    if (!user || user.role === role || switchingRole) return;

    setSwitchingRole(role);
    showToast(`Switching to ${role === "creator" ? "Creator" : "Visitor"} mode...`);
    const ok = await updateProfile({ role });
    setSwitchingRole(null);

    if (ok) {
      showToast(`${role === "creator" ? "Creator" : "Visitor"} mode is active`);
      router.refresh();
    }
  };

  const handleLogout = () => {
    signOut();
    showToast("Logged out successfully");
  };

  if (!user) return null;

  const visibleMenu = filterByRole(settingsLinks, user.role);
  const roleGuide = (["fan", "creator"] as AccountRole[]).map((role) => ({
    role,
    label: roleLabel[role],
    tools: filterByRole(mainNavLinks, role).filter((item) => item.href !== "/settings").map((item) => item.label),
    settings: filterByRole(settingsLinks, role).map((item) => item.label),
  }));

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
              disabled={!!switchingRole}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                user.role === "fan"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-muted hover:border-text-muted"
              } ${switchingRole ? "cursor-wait opacity-70" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[17px]" style={user.role === "fan" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                visibility
              </span>
              {switchingRole === "fan" ? "Switching..." : "Visitor"}
              {user.role === "fan" && !switchingRole && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>
            <button
              onClick={() => handleRoleSwitch("creator")}
              disabled={!!switchingRole}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                user.role === "creator"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-muted hover:border-text-muted"
              } ${switchingRole ? "cursor-wait opacity-70" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[17px]" style={user.role === "creator" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                star
              </span>
              {switchingRole === "creator" ? "Switching..." : "Creator"}
              {user.role === "creator" && !switchingRole && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 border border-border rounded-2xl p-4 space-y-4">
          <div>
            <p className="text-xs font-bold text-text-main">Mode Guide</p>
            <p className="text-[10px] text-text-muted">Tools are separated by account mode to keep actions clear.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {roleGuide.map((guide) => (
              <div
                key={guide.role}
                className={`rounded-xl border p-3 ${
                  user.role === guide.role ? "border-primary bg-primary/5" : "border-border bg-background"
                }`}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-primary">
                    {guide.role === "creator" ? "workspace_premium" : "visibility"}
                  </span>
                  <p className="text-xs font-black text-text-main">{guide.label}</p>
                </div>
                <p className="text-[10px] font-bold text-text-muted leading-relaxed">
                  {guide.tools.join(", ")}
                </p>
              </div>
            ))}
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
                disabled={!!switchingRole}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  user.role === r
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-text-muted hover:border-text-muted"
                } ${switchingRole ? "cursor-wait opacity-70" : ""}`}
              >
                <span className="material-symbols-outlined text-[17px]" style={user.role === r ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {r === "fan" ? "visibility" : "star"}
                </span>
                {switchingRole === r ? "Switching..." : r === "fan" ? "Visitor" : "Creator"}
                {user.role === r && !switchingRole && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-text-main">Mode Guide</p>
          {roleGuide.map((guide) => (
            <div key={guide.role} className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-black text-text-main">{guide.label}</p>
              <p className="mt-1 text-[10px] font-bold leading-relaxed text-text-muted">{guide.tools.join(", ")}</p>
            </div>
          ))}
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
                <p className="text-[10px] text-text-muted leading-none truncate">{item.description}</p>
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
