"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toast } from "../ui/Toast";
import { useSidebar } from "@/context/SidebarContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isCollapsed } = useSidebar();
  const { authStatus, authError, retryAuthSync, user, logout } = useUser();
  const router = useRouter();

  useEffect(() => {
    const publicPaths = ["/login", "/sign-up", "/admin/login"];
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("ch_token");
    
    if (authStatus === "ready" && !hasToken && !publicPaths.includes(currentPath)) {
      if (currentPath.startsWith("/admin")) {
        router.replace("/admin/login");
      } else {
        router.replace("/login");
      }
      return;
    }
  }, [authStatus, router, user]);

  if (authStatus === "ready" && authError && !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 text-text-main">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-3xl border border-red-500/20 bg-surface p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-red-400">cloud_off</span>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-text-main">Backend connection failed</h1>
            <p className="text-sm font-medium text-text-muted">{authError}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <button
              onClick={retryAuthSync}
              className="w-full rounded-full bg-primary py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
            <button
              onClick={logout}
              className="w-full rounded-full border border-border bg-transparent py-2.5 text-sm font-black text-text-muted hover:text-text-main transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === "checking" || authStatus === "syncing") {
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
        <div className="flex-1">{children}</div>
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
