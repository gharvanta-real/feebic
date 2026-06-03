"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";

export default function AppearanceSettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Appearance</h1>
        <p className="text-xs text-text-muted">Customize the visual theme and styling of your Felbic client.</p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-5">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border select-none">
          Select Theme
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Light Theme Card */}
          <button
            type="button"
            onClick={() => theme !== "light" && toggleTheme()}
            className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden select-none active:scale-95 ${
              theme === "light"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border bg-background text-text-muted hover:border-text-muted"
            }`}
          >
            {/* Visual design mock of light theme */}
            <div className="w-full h-8 bg-white border border-gray-200 rounded-md p-1 space-y-1 overflow-hidden opacity-80">
              <div className="h-1.5 w-1/2 bg-gray-200 rounded-full" />
              <div className="h-1 w-full bg-gray-100 rounded-full" />
              <div className="h-1 w-2/3 bg-gray-100 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between w-full mt-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">light_mode</span>
                <span className="text-xs font-black">Light Mode</span>
              </div>
              {theme === "light" && (
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
              )}
            </div>
          </button>

          {/* Dark Theme Card */}
          <button
            type="button"
            onClick={() => theme !== "dark" && toggleTheme()}
            className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden select-none active:scale-95 ${
              theme === "dark"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border bg-background text-text-muted hover:border-text-muted"
            }`}
          >
            {/* Visual design mock of dark theme */}
            <div className="w-full h-8 bg-[#090d16] border border-gray-800 rounded-md p-1 space-y-1 overflow-hidden opacity-80">
              <div className="h-1.5 w-1/2 bg-gray-700 rounded-full" />
              <div className="h-1 w-full bg-gray-800 rounded-full" />
              <div className="h-1 w-2/3 bg-gray-800 rounded-full" />
            </div>

            <div className="flex items-center justify-between w-full mt-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">dark_mode</span>
                <span className="text-xs font-black">Dark Mode</span>
              </div>
              {theme === "dark" && (
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
              )}
            </div>
          </button>
        </div>

        <div className="p-3 bg-[hsl(var(--text-muted-hsl)/0.03)] border border-border/60 rounded-xl">
          <p className="text-[10px] text-text-muted leading-relaxed font-semibold">
            🌱 <strong>Note:</strong> Settings are synced in real-time and will automatically persist across browser tabs and visits.
          </p>
        </div>
      </div>
    </div>
  );
}
