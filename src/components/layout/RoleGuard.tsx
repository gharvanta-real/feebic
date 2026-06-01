"use client";

import React, { useEffect } from "react";
import { useUser } from "@/context/UserContext";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("creator" | "fan")[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, updateProfile, showToast } = useUser();

  useEffect(() => {
    if (user) {
      const isAllowed = allowedRoles.includes(user.role);
      
      if (!isAllowed) {
        const nextRole = allowedRoles[0];
        updateProfile({ role: nextRole });
        showToast(`Switched to ${nextRole === "creator" ? "Creator" : "Visitor"} mode for this page`);
      }
    }
  }, [user, allowedRoles, updateProfile, showToast]);

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-text-muted">
        <div className="flex flex-col items-center gap-md">
          {/* A premium, minimal spinner aligned with HSL colors */}
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="font-sans font-medium text-sm">Verifying access credentials...</p>
        </div>
      </div>
    );
  }

  const isAllowed = allowedRoles.includes(user.role);
  if (!isAllowed) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-text-muted">
        <div className="flex flex-col items-center gap-md">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="font-sans font-medium text-sm">Switching account mode...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
