"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toast } from "../ui/Toast";
import { useSidebar } from "@/context/SidebarContext";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isCollapsed } = useSidebar();
  const { refreshUserProfile } = useUser();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Proactively refresh session values when mounting layout shells
    refreshUserProfile();

    // Verify onboarding is complete
    const loggedOut = localStorage.getItem("ch_logged_out") === "true";
    const onboardingDone = localStorage.getItem("ch_onboarding_done") === "true";
    const publicPaths = ["/onboarding", "/login", "/sign-up"];
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    
    if (loggedOut && currentPath !== "/login" && currentPath !== "/sign-up") {
      router.replace("/login");
      return;
    }

    if (!onboardingDone && !publicPaths.includes(currentPath)) {
      localStorage.setItem("ch_onboarding_done", "true");
      refreshUserProfile();
    }
  }, []);

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

      {/* 3. Mobile Bottom Navigation Tabs */}
      <MobileBottomNav />

      {/* 4. Global Toast Notification Bubble */}
      <Toast />
    </div>
  );
};
