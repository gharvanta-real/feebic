"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/UserContext";

export default function SignUpPage() {
  const router = useRouter();
  const { showToast } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      showToast("You must agree to the Terms of Service");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      localStorage.removeItem("ch_logged_out");
      
      // Set onboarding to false to force setup details
      localStorage.setItem("ch_onboarding_done", "false");
      
      // Pre-fill email so onboarding can pre-load if needed
      localStorage.setItem("ch_user_email", email.trim().toLowerCase());
      
      showToast("Account registered! Directing to profile builder.");
      
      setTimeout(() => {
        router.replace("/onboarding");
      }, 500);
    }, 1200);
  };

  const handleQuickLogin = (role: "fan" | "creator") => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      localStorage.removeItem("ch_logged_out");
      
      localStorage.setItem("ch_onboarding_done", "true");
      localStorage.setItem("ch_user_role", role);
      
      if (role === "creator") {
        localStorage.setItem("ch_user_profile", JSON.stringify({
          displayName: "Alex Rivera",
          username: "arivera",
          bio: "A creative professional building premium software.",
          avatar: "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
          role: "creator",
          coverPhoto: "/assets/082f4723389abb44b68b64dfc082268b.png",
          location: "Los Angeles, USA",
          website: "alexrivera.com",
          joinedDate: "Joined May 2026"
        }));
      } else {
        localStorage.setItem("ch_user_profile", JSON.stringify({
          displayName: "Sam Fan",
          username: "sam_fan",
          bio: "Supporter and follower of premium digital creators.",
          avatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
          role: "fan",
          coverPhoto: "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
          location: "New York, USA",
          website: "",
          joinedDate: "Joined May 2026"
        }));
      }
      
      showToast(`Quick Logged in as ${role === "creator" ? "Creator" : "Fan"}!`);
      
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in select-none">
      <div className="w-full max-w-[440px] bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-lg flex flex-col space-y-6">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-primary text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud
            </span>
            <span className="text-[30px] font-black text-primary tracking-tighter leading-none lowercase">
              felbic
            </span>
          </div>
          <p className="text-xs text-text-muted">Create an account to discover premium creators</p>
        </div>

        {/* Dynamic Credentials Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. alex@creatorhub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Password</label>
            <input
              type="password"
              required
              placeholder="Minimum 8 characters..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
            />
          </div>

          {/* Agree Terms check */}
          <div className="flex items-center text-[10px] ml-1">
            <label className="flex items-center gap-1.5 text-text-muted font-bold cursor-pointer">
              <input 
                type="checkbox" 
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="rounded border-border accent-primary" 
              />
              <span>I agree to the Terms of Service & Privacy Policy</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Registering...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px] leading-none font-bold">person_add</span>
                <span>Sign Up</span>
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-border/80"></div>
          <span className="flex-shrink mx-4 text-[10px] text-text-muted font-bold uppercase tracking-wider">or test quick profiles</span>
          <div className="flex-grow border-t border-border/80"></div>
        </div>

        {/* Direct One-Click Testing Logins */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleQuickLogin("creator")}
            disabled={isSubmitting}
            className="py-2.5 bg-surface hover:bg-[hsl(var(--text-muted-hsl)/0.03)] border border-border hover:border-text-muted rounded-xl transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer text-text-main"
          >
            <span className="material-symbols-outlined text-[16px] text-success" style={{ fontVariationSettings: "'FILL' 1" }}>
              payments
            </span>
            <span>Creator Profile</span>
          </button>
          <button
            onClick={() => handleQuickLogin("fan")}
            disabled={isSubmitting}
            className="py-2.5 bg-surface hover:bg-[hsl(var(--text-muted-hsl)/0.03)] border border-border hover:border-text-muted rounded-xl transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer text-text-main"
          >
            <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              person
            </span>
            <span>Fan Profile</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-text-muted text-center font-semibold">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-bold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
