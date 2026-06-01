"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function EditProfileSettingsPage() {
  const router = useRouter();
  const { user, updateProfile, showToast } = useUser();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  const avatarChoices = [
    "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
    "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
    "/assets/0c0bf4c58678d852ea7588ef1045309e.png",
    "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png",
  ];

  const coverChoices = [
    "/assets/082f4723389abb44b68b64dfc082268b.png",
    "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
    "/assets/efcfd91838f89a7a1dcef9eac6ec0b56.png",
    "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
    "/assets/2e276540ed6f162458a34e8dc8f3f271.png",
  ];

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        setDisplayName(user.displayName);
        setUsername(user.username);
        setBio(user.bio);
        setAvatar(user.avatar);
        setCoverPhoto(user.coverPhoto);
        setLocation(user.location || "");
        setWebsite(user.website || "");
      }, 0);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");

    if (displayName.trim().length < 2) {
      showToast("Display name must be at least 2 characters");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      showToast("Username must be 3–30 letters, numbers, or underscores");
      return;
    }

    updateProfile({
      displayName: displayName.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      avatar,
      coverPhoto,
      location: location.trim(),
      website: website.trim(),
    });

    showToast("Profile updated successfully!");
    setTimeout(() => router.push("/settings"), 600);
  };

  if (!user) return null;

  const nextAvatar = () => {
    const idx = (avatarChoices.indexOf(avatar) + 1) % avatarChoices.length;
    setAvatar(avatarChoices[idx]);
  };
  const nextCover = () => {
    const idx = (coverChoices.indexOf(coverPhoto) + 1) % coverChoices.length;
    setCoverPhoto(coverChoices[idx]);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Edit Profile</h1>
        <p className="text-xs text-text-muted">Configure how your handle and branding appear to others.</p>
      </div>

      {/* Live preview */}
      <div className="border border-border rounded-2xl overflow-hidden">
        {/* Cover with change button */}
        <div
          className="h-24 bg-cover bg-center relative group cursor-pointer"
          style={{ backgroundImage: `url(${coverPhoto || coverChoices[0]})` }}
          onClick={nextCover}
        >
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[22px]">photo_camera</span>
          </div>
        </div>

        <div className="px-4 pb-4 flex items-end gap-3 -mt-7">
          {/* Avatar with change button */}
          <div className="relative shrink-0 cursor-pointer group" onClick={nextAvatar}>
            <img
              src={avatar || avatarChoices[0]}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover border-2 border-background"
            />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">photo_camera</span>
            </div>
          </div>
          <div className="min-w-0 pt-7">
            <p className="text-sm font-extrabold text-text-main truncate">{displayName || "Display Name"}</p>
            <p className="text-xs text-text-muted">@{username || "handle"}</p>
          </div>
        </div>
        <p className="text-[10px] text-text-muted px-4 pb-3 -mt-1">Click avatar or banner to cycle photo</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row: Display Name + Username */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">Username</label>
            <div className="relative flex items-center bg-background border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary transition-all">
              <span className="text-xs font-bold text-text-muted mr-0.5">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="handle"
                className="w-full text-xs bg-transparent outline-none text-text-main"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="Write something about yourself..."
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main resize-none"
          />
          <p className="text-[10px] text-text-muted mt-1 text-right">{bio.length}/200</p>
        </div>

        {/* Row: Location + Website */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">Location</label>
            <div className="relative flex items-center bg-background border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary transition-all gap-1.5">
              <span className="material-symbols-outlined text-text-muted text-[16px] shrink-0">location_on</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full text-xs bg-transparent outline-none text-text-main"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">Website</label>
            <div className="relative flex items-center bg-background border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary transition-all gap-1.5">
              <span className="material-symbols-outlined text-text-muted text-[16px] shrink-0">link</span>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="yoursite.com"
                className="w-full text-xs bg-transparent outline-none text-text-main"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
        >
          <span className="material-symbols-outlined text-[16px] leading-none">check</span>
          Save Changes
        </button>
      </form>
    </div>
  );
}
