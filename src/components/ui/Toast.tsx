"use client";

import React from "react";
import { useUser } from "@/context/UserContext";

export const Toast: React.FC = () => {
  const { toastMessage } = useUser();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 shadow-lg select-none md:bottom-6 animate-fade-in">
      <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        check_circle
      </span>
      <span className="text-sm font-bold tracking-wide text-text-main">
        {toastMessage}
      </span>
    </div>
  );
};
