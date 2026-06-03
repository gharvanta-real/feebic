"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function OnboardingPage() {
  const router = useRouter();
  const { updateProfile, showToast } = useUser();

  React.useEffect(() => {
    router.replace("/");
  }, [router]);

  // Onboarding States
  const [displayName, setDisplayName] = useState("Alex Rivera");
  const [username, setUsername] = useState("arivera");
  const [bio, setBio] = useState("A creative professional building premium software.");
  const [role, setRole] = useState<"fan" | "creator">("fan");
  const [avatar, setAvatar] = useState("/assets/5dc72593d711173af1fe7ab74be0fa56.png");
  const [coverPhoto, setCoverPhoto] = useState("/assets/082f4723389abb44b68b64dfc082268b.png");

  const avatarChoices = [
    "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
    "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
    "/assets/0c0bf4c58678d852ea7588ef1045309e.png"
  ];

  const coverChoices = [
    "/assets/082f4723389abb44b68b64dfc082268b.png",
    "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
    "/assets/efcfd91838f89a7a1dcef9eac6ec0b56.png"
  ];

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");
    if (displayName.trim().length < 2) {
      showToast("Display name must be at least 2 characters");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      showToast("Username must be 3-30 letters, numbers, or underscores");
      return;
    }

    setIsSaving(true);
    const saved = await updateProfile({
      displayName: displayName.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      role,
      avatar,
      coverPhoto,
      joinedDate: `Joined ${new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}`
    });

    setIsSaving(false);
    if (!saved) return;

    localStorage.setItem("ch_onboarding_done", "true");
    localStorage.setItem("ch_user_role", role);
    
    showToast("Profile set up successfully! Welcome to Felbic.");
    setTimeout(() => {
      router.replace("/");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
      <div className="w-full max-w-[800px] bg-surface border border-border rounded-3xl overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Side: Interactive Preview Card (FB/IG High Fidelity style) */}
        <div className="bg-[hsl(var(--text-muted-hsl)/0.03)] border-r border-border p-6 flex flex-col justify-center items-center space-y-6 max-md:hidden select-none">
          <div className="text-center space-y-2">
            <span className="material-symbols-outlined text-[38px] text-primary">eco</span>
            <h2 className="text-base font-extrabold tracking-tight text-text-main">Your Live Profile Preview</h2>
            <p className="text-xs text-text-muted">How others will see you on Felbic</p>
          </div>

          {/* Profile Card Mock */}
          <div className="w-full max-w-[280px] bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div
              className="h-20 bg-cover bg-center"
              style={{ backgroundImage: `url(${coverPhoto})` }}
            />
            <div className="px-4 pb-4 relative flex-grow flex flex-col items-center text-center">
              <img
                src={avatar}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover border-2 border-surface bg-surface -mt-8 mb-2 shadow-sm"
              />
              <div className="space-y-1 w-full">
                <h3 className="text-sm font-extrabold text-text-main truncate">
                  {displayName}
                </h3>
                <p className="text-xs text-text-muted">@{username || "username"}</p>
                <span className="inline-block bg-primary/10 text-primary text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mt-1.5">
                  {role === "creator" ? "Creator Account" : "Fan / Subscriber"}
                </span>
                <p className="text-xs text-text-muted line-clamp-3 leading-relaxed pt-3 border-t border-border mt-3">
                  {bio || "Enter a custom bio on the right to personalize your profile..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Configuration Inputs Form */}
        <div className="p-6 md:p-8 space-y-6 flex flex-col justify-center">
          <div className="space-y-2 select-none">
            <h1 className="text-xl font-black text-text-main">Build Your Profile</h1>
            <p className="text-xs text-text-muted leading-relaxed">
              Customize your handle, details, and role to get started. You can change these anytime in Settings!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1 select-none">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-sm outline-none placeholder-text-muted"
              />
            </div>

            {/* Handle/Username */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1 select-none">Handle / Username</label>
              <div className="relative flex items-center bg-background border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-all">
                <span className="text-sm font-bold text-text-muted mr-0.5 select-none">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full text-sm bg-transparent outline-none placeholder-text-muted text-text-main"
                />
              </div>
            </div>

            {/* Role Select (Fan vs Creator) */}
            <div className="select-none">
              <label className="block text-xs font-bold text-text-muted mb-2 ml-1">Account Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("fan")}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                    role === "fan"
                      ? "border-primary bg-[hsl(var(--primary-hsl)/0.05)] text-primary"
                      : "border-border text-text-muted hover:border-text-muted"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={role === "fan" ? { fontVariationSettings: "'FILL' 1" } : undefined}>person</span>
                  <span>Fan / Visitor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("creator")}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                    role === "creator"
                      ? "border-primary bg-[hsl(var(--primary-hsl)/0.05)] text-primary"
                      : "border-border text-text-muted hover:border-text-muted"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={role === "creator" ? { fontVariationSettings: "'FILL' 1" } : undefined}>eco</span>
                  <span>Creator / Artist</span>
                </button>
              </div>
            </div>

            {/* Custom Bio */}
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1 select-none">Bio / Biography</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your subscribers about yourself..."
                rows={3}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-sm outline-none placeholder-text-muted resize-none"
              />
            </div>

            {/* Avatar & Cover Pickers (Cycle presets) */}
            <div className="grid grid-cols-2 gap-4 select-none pb-2">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Avatar Theme</label>
                <button
                  type="button"
                  onClick={() => {
                    const idx = (avatarChoices.indexOf(avatar) + 1) % avatarChoices.length;
                    setAvatar(avatarChoices[idx]);
                  }}
                  className="w-full py-2 bg-background border border-border hover:border-text-muted text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">cached</span>
                  <span>Cycle Photo</span>
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Cover Banner</label>
                <button
                  type="button"
                  onClick={() => {
                    const idx = (coverChoices.indexOf(coverPhoto) + 1) % coverChoices.length;
                    setCoverPhoto(coverChoices[idx]);
                  }}
                  className="w-full py-2 bg-background border border-border hover:border-text-muted text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">cached</span>
                  <span>Cycle Banner</span>
                </button>
              </div>
            </div>

            {/* Submit Trigger */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
            >
              <span>{isSaving ? "Saving Profile..." : "Initialize Profile"}</span>
              <span className="material-symbols-outlined text-[16px] leading-none">arrow_forward</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
