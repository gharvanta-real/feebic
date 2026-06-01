"use client";

import React from "react";
import Link from "next/link";

interface MobileHeaderProps {
  children?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ children }) => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md md:hidden">
      {/* Brand Logo Row */}
      <Link href="/" className="flex select-none items-center gap-1 hover:opacity-80 transition-opacity">
        <span className="material-symbols-outlined text-primary text-[22px]">eco</span>
        <span className="text-primary font-extrabold text-[18px] tracking-tight leading-none">
          felbic
        </span>
      </Link>

      {/* Dynamic Sub-Page Slots */}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
};
