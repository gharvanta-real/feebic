"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";

// ── CROP MODAL COMPONENT ──
interface CropModalProps {
  imageSrc: string;
  type: "avatar" | "banner";
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
  isUploading: boolean;
}

function CropModal({ imageSrc, type, onClose, onCrop, isUploading }: CropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imgDims, setImgDims] = useState({ w: 0, h: 0, baseScale: 1 });
  const [isLoaded, setIsLoaded] = useState(false);

  const containerSize = 320;
  const imgRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false);
  const startDragRef = useRef({ x: 0, y: 0 });

  // Crop frame specs:
  // Avatar: 200x200 circle in center
  // Banner: 280x93 rectangle (3:1 aspect ratio) in center
  const w_frame = type === "avatar" ? 200 : 280;
  const h_frame = type === "avatar" ? 200 : 93;
  const x_frame_left = (containerSize - w_frame) / 2;
  const y_frame_top = (containerSize - h_frame) / 2;

  // On image load, calculate sizing to ensure it completely covers the crop box at zoom=1
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const ratioW = w_frame / naturalW;
    const ratioH = h_frame / naturalH;
    const baseScale = Math.max(ratioW, ratioH);

    setImgDims({
      w: naturalW * baseScale,
      h: naturalH * baseScale,
      baseScale
    });
    setIsLoaded(true);
    setPosition({ x: 0, y: 0 });
  };

  // Helper to clamp drag offset so the image covers the frame
  const getClampedPosition = (x: number, y: number, currentZoom: number) => {
    if (!isLoaded) return { x: 0, y: 0 };
    const cx = containerSize / 2;
    const cy = containerSize / 2;
    const imgW = imgDims.w * currentZoom;
    const imgH = imgDims.h * currentZoom;

    const minX = x_frame_left + w_frame - cx - imgW / 2;
    const maxX = x_frame_left - cx + imgW / 2;
    const minY = y_frame_top + h_frame - cy - imgH / 2;
    const maxY = y_frame_top - cy + imgH / 2;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  };

  // Drag handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (isUploading) return;
    isDraggingRef.current = true;
    startDragRef.current = {
      x: clientX - position.x,
      y: clientY - position.y
    };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || isUploading) return;
    const targetX = clientX - startDragRef.current.x;
    const targetY = clientY - startDragRef.current.y;
    const clamped = getClampedPosition(targetX, targetY, zoom);
    setPosition(clamped);
  };

  const handleEnd = () => {
    isDraggingRef.current = false;
  };

  // Render crop using Canvas
  const handleSave = () => {
    if (!imgRef.current || isUploading) return;

    const canvas = document.createElement("canvas");
    // Target output dimensions
    const targetW = type === "avatar" ? 400 : 1200;
    const targetH = type === "avatar" ? 400 : 400;

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill with black/white depending on transparent fallback
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetW, targetH);

    // Apply scaling and translation to match screen positioning
    const scaleFactor = targetW / w_frame;
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-x_frame_left, -y_frame_top);

    // Calculate actual screen coordinates where image is drawn inside container
    const cx = containerSize / 2;
    const cy = containerSize / 2;
    const drawW = imgDims.w * zoom;
    const drawH = imgDims.h * zoom;
    const drawX = cx - drawW / 2 + position.x;
    const drawY = cy - drawH / 2 + position.y;

    ctx.drawImage(imgRef.current, drawX, drawY, drawW, drawH);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${type}_crop_${Date.now()}.png`, { type: "image/png" });
        onCrop(file);
      }
    }, "image/png");
  };

  // Adjust zoom and update clamped position
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextZoom = parseFloat(e.target.value);
    setZoom(nextZoom);
    setPosition((prev) => getClampedPosition(prev.x, prev.y, nextZoom));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in select-none">
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-5 text-center">
        <div>
          <h3 className="text-base font-extrabold text-text-main capitalize">Crop {type}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Drag to reposition, use slider to zoom</p>
        </div>

        {/* Cropping Container */}
        <div className="flex justify-center">
          <div
            className="relative w-[320px] h-[320px] bg-black border border-border rounded-2xl overflow-hidden cursor-move touch-none"
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleEnd}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop Source"
              onLoad={handleImageLoad}
              draggable={false}
              className="absolute max-w-none select-none pointer-events-none"
              style={{
                width: imgDims.w,
                height: imgDims.h,
                transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
                transformOrigin: "center center",
                left: (containerSize - imgDims.w) / 2,
                top: (containerSize - imgDims.h) / 2,
                opacity: isLoaded ? 1 : 0,
                transition: "opacity 0.2s"
              }}
            />

            {/* Overlays */}
            {type === "avatar" ? (
              // Circular crop overlay
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div 
                  className="w-[200px] h-[200px] border border-white/60 rounded-full bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" 
                />
              </div>
            ) : (
              // Banner rectangular crop overlay (3:1 aspect ratio matching 1200x400 output)
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div 
                  className="w-[280px] h-[93px] border border-white/60 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="space-y-1.5 px-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-text-muted">
            <span>ZOOM</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={handleZoomChange}
            disabled={isUploading}
            className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 py-2.5 border border-border text-text-muted hover:text-text-main font-bold text-xs rounded-full transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="flex-1 py-2.5 bg-primary text-white hover:opacity-95 font-bold text-xs rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[15px] leading-none">crop</span>
                <span>Crop & Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EDIT PROFILE MAIN PAGE ──
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

  // Crop & Upload states
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "banner">("avatar");
  const [isUploading, setIsUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    const ok = await updateProfile({
      displayName: displayName.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      avatar,
      coverPhoto,
      location: location.trim(),
      website: website.trim(),
    });

    if (ok) {
      showToast("Profile updated successfully!");
      setTimeout(() => router.push("/settings"), 600);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      setCropType(type);
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again
    e.target.value = "";
  };

  const handleCropConfirm = async (croppedFile: File) => {
    if (!user) return;
    setIsUploading(true);
    try {
      const response = await uploadToCloudinary(croppedFile, user.username, "profiles");
      if (cropType === "avatar") {
        setAvatar(response.secure_url);
      } else {
        setCoverPhoto(response.secure_url);
      }
      showToast("Photo uploaded and cropped successfully!");
      setPendingImage(null);
    } catch (err: any) {
      showToast(err.message || "Failed to upload photo to server.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Edit Profile</h1>
        <p className="text-xs text-text-muted">Configure how your handle and branding appear to others.</p>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "avatar")}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "banner")}
      />

      {/* Live preview */}
      <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Cover with change button */}
        <div
          className="h-28 bg-cover bg-center relative group cursor-pointer"
          style={{ backgroundImage: `url(${coverPhoto || "/assets/cb15617a79d7713ffa4a6de36f808a76.png"})` }}
          onClick={() => coverInputRef.current?.click()}
        >
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-white text-[22px]">photo_camera</span>
            <span className="text-white text-xs font-bold">Change Cover Banner</span>
          </div>
        </div>

        <div className="px-4 pb-4 flex items-end gap-3 -mt-8 relative z-10">
          {/* Avatar with change button */}
          <div 
            className="relative h-16 w-16 rounded-full shrink-0 cursor-pointer group overflow-hidden border-2 border-background"
            onClick={() => avatarInputRef.current?.click()}
          >
            <img
              src={avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png"}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[16px]">photo_camera</span>
            </div>
          </div>
          <div className="min-w-0 pt-8">
            <p className="text-sm font-extrabold text-text-main truncate">{displayName || "Display Name"}</p>
            <p className="text-xs text-text-muted">@{username || "handle"}</p>
          </div>
        </div>
        <p className="text-[10px] text-text-muted px-4 pb-3 -mt-1 select-none leading-none">
          💡 Click the avatar or banner photo to upload and crop a custom image from your device.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row: Display Name + Username */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider select-none">Display Name</label>
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
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider select-none">Username</label>
            <div className="relative flex items-center bg-background border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary transition-all">
              <span className="text-xs font-bold text-text-muted mr-0.5 select-none">@</span>
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
          <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider select-none">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="Write something about yourself..."
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main resize-none"
          />
          <p className="text-[10px] text-text-muted mt-1 text-right select-none">{bio.length}/200</p>
        </div>

        {/* Row: Location + Website */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider select-none">Location</label>
            <div className="relative flex items-center bg-background border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary transition-all gap-1.5">
              <span className="material-symbols-outlined text-text-muted text-[16px] shrink-0 select-none">location_on</span>
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
            <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider select-none">Website</label>
            <div className="relative flex items-center bg-background border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary transition-all gap-1.5">
              <span className="material-symbols-outlined text-text-muted text-[16px] shrink-0 select-none">link</span>
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
          <span className="material-symbols-outlined text-[16px] leading-none select-none">check</span>
          Save Changes
        </button>
      </form>

      {/* ── IMAGE CROP POPUP ── */}
      {pendingImage && (
        <CropModal
          imageSrc={pendingImage}
          type={cropType}
          onClose={() => setPendingImage(null)}
          onCrop={handleCropConfirm}
          isUploading={isUploading}
        />
      )}
    </div>
  );
}
