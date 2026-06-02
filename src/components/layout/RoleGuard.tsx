"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { roleHome, roleLabel } from "@/lib/roleAccess";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("creator" | "fan")[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user } = useUser();
  const router = useRouter();

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
    const requiredLabel = allowedRoles.map((role) => roleLabel[role]).join(" or ");
    const currentLabel = roleLabel[user.role];
    const fallbackHref = roleHome[user.role];

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-text-muted">
        <div className="flex max-w-[420px] flex-col items-center gap-4 px-6 text-center">
          <span className="material-symbols-outlined text-[44px] text-primary">lock</span>
          <div className="space-y-2">
            <h1 className="text-lg font-black text-text-main">Access restricted</h1>
            <p className="font-sans text-sm font-medium text-text-muted">
              This page is for {requiredLabel} mode. Your current mode is {currentLabel}.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => router.push("/settings")}
              className="rounded-full bg-primary px-5 py-2 text-xs font-black text-white"
            >
              Switch Mode
            </button>
            <button
              onClick={() => router.push(fallbackHref)}
              className="rounded-full border border-border px-5 py-2 text-xs font-black text-text-main"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
