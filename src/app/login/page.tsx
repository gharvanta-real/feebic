"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background bg-dot-pattern relative flex flex-col justify-between overflow-x-hidden">
      {/* Subtle radial glow overlay */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Main Two-Column Split Screen */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 py-12 lg:px-20 max-w-[1240px] mx-auto w-full gap-12 lg:gap-20 z-10">
        
        {/* Left Side: Platform info & marketing banner */}
        <div className="flex-1 flex flex-col justify-center select-none text-left max-lg:items-center max-lg:text-center">
          {/* Brand Logo - CreatorHub inspired custom branch network logo */}
          <div className="flex items-center gap-2 cursor-pointer group">
            <svg 
              viewBox="0 0 32 32" 
              className="h-10 w-10 text-primary shrink-0 transition-transform duration-300 group-hover:scale-105" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="16" cy="16" r="4.5" fill="currentColor" />
              <line x1="16" y1="16" x2="10" y2="7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="16" x2="22.5" y2="7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="16" x2="7.5" y2="19.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="16" x2="24.5" y2="19.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="16" x2="16" y2="25.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="10" cy="7.5" r="2.8" fill="currentColor" />
              <circle cx="22.5" cy="7.5" r="2.8" fill="currentColor" />
              <circle cx="7.5" cy="19.5" r="2.8" fill="currentColor" />
              <circle cx="24.5" cy="19.5" r="2.8" fill="currentColor" />
              <circle cx="16" cy="25.5" r="2.8" fill="currentColor" />
            </svg>
            <span className="text-[32px] font-black tracking-tighter leading-none font-sans select-none">
              <span className="text-text-main">fel</span>
              <span className="text-primary">bic</span>
            </span>
          </div>

          <h1 className="text-[34px] md:text-5xl lg:text-[46px] font-black text-text-main leading-[1.15] tracking-tight mt-10 max-w-[500px]">
            Sign up to support your favorite creators
          </h1>
          
          <p className="text-xs md:text-sm text-text-muted leading-relaxed mt-5 max-w-[450px] font-medium">
            Join a community of millions and get exclusive access to content you won't find anywhere else. Support creators directly and build meaningful connections.
          </p>

          {/* Creators Avatars Loop */}
          <div className="flex flex-col max-lg:items-center">
            <div className="flex items-center mt-12 select-none">
              <div className="flex -space-x-3.5">
                <img src="/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png" className="h-[46px] w-[46px] rounded-full border-2 border-background object-cover shrink-0" alt="Lana" />
                <img src="/assets/0c0bf4c58678d852ea7588ef1045309e.png" className="h-[46px] w-[46px] rounded-full border-2 border-background object-cover shrink-0" alt="Demi" />
                <img src="/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png" className="h-[46px] w-[46px] rounded-full border-2 border-background object-cover shrink-0" alt="Amouranth" />
                <img src="/assets/5dc72593d711173af1fe7ab74be0fa56.png" className="h-[46px] w-[46px] rounded-full border-2 border-background object-cover shrink-0" alt="Austin" />
                <div className="h-[46px] w-[46px] rounded-full border-2 border-background bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center shrink-0">
                  +2M
                </div>
              </div>
            </div>
            <p className="text-[12px] text-text-muted mt-4 font-bold tracking-tight">
              Creators are already sharing their journey here.
            </p>
          </div>
        </div>

        {/* Right Side: Centered Clerk form card */}
        <div className="flex-1 flex justify-center w-full lg:max-w-[480px]">
          <SignIn 
            routing="hash"
            signUpUrl="/sign-up" 
            forceRedirectUrl="/"
          />
        </div>

      </div>

      {/* Footer bar links */}
      <footer className="w-full py-6 border-t border-border/40 select-none bg-background/50 backdrop-blur-sm z-10">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] md:text-xs text-text-muted font-bold tracking-wide">
          <span className="hover:text-primary cursor-pointer transition-colors">About</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Help</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Cookie Policy</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Blog</span>
          <span className="text-text-muted/60 ml-auto max-md:mx-auto">© 2026 Felbic</span>
        </div>
      </footer>
    </div>
  );
}
