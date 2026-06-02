"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toast } from "../ui/Toast";
import { useSidebar } from "@/context/SidebarContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isCollapsed } = useSidebar();
  const { authStatus, authError, refreshUserProfile, retryAuthSync, user } = useUser();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const onboardingDone = (typeof window !== "undefined" ? localStorage.getItem("ch_onboarding_done") : null) === "true";
    const publicPaths = ["/onboarding", "/login", "/sign-up"];
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    
    if (!isSignedIn && !publicPaths.includes(currentPath)) {
      router.replace("/login");
      return;
    }

    if (isSignedIn && authStatus === "ready" && !onboardingDone && !publicPaths.includes(currentPath)) {
      localStorage.setItem("ch_onboarding_done", "true");
      refreshUserProfile();
    }
  }, [authStatus, isLoaded, isSignedIn, refreshUserProfile, router]);

  if (isLoaded && isSignedIn && authStatus === "ready" && authError && !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 text-text-main">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-3xl border border-red-500/20 bg-surface p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-red-400">cloud_off</span>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-text-main">Backend connection failed</h1>
            <p className="text-sm font-medium text-text-muted">{authError}</p>
          </div>
          <button
            onClick={retryAuthSync}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-black text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded || authStatus === "checking" || authStatus === "syncing" || (isSignedIn && !user)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-text-main">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-bold text-text-main">Preparing your Felbic session...</p>
          <p className="max-w-[280px] text-xs font-medium text-text-muted">
            Account and feed data are being synchronized.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-background text-text-main flex w-full">
      {/* 1. Desktop Collapsible Sidebar */}
      <Sidebar />

      {/* 2. Main content viewport layout */}
      <main
        className={`main-content flex-grow flex flex-col min-h-screen w-full transition-all duration-300 ${
          isCollapsed ? "collapsed" : ""
        } pb-[70px] md:pb-0`}
      >
        <div className="flex-1 animate-fade-in">{children}</div>
      </main>

      {authError && (
        <div className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-24px)] max-w-[520px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-xs font-bold text-text-main shadow-sm md:bottom-5">
          <span>{authError}</span>
          <button
            onClick={retryAuthSync}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Mobile Bottom Navigation Tabs */}
      <MobileBottomNav />

      {/* 4. Global Toast Notification Bubble */}
      <Toast />
    </div>
  );
};
