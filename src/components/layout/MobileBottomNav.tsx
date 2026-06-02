"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { filterByRole, mobileNavLinks } from "@/lib/roleAccess";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user, unreadNotificationsCount } = useUser();

  if (!user) return null;

  const visibleTabs = filterByRole(mobileNavLinks, user.role);

  const isTabActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-surface/90 backdrop-blur-md md:hidden">
      {visibleTabs.map((t) => {
        const active = isTabActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-all duration-150 active:scale-95 ${
              active ? "text-primary font-bold" : "text-text-muted"
            }`}
          >
            {/* The icon slot */}
            <span
              className="material-symbols-outlined text-[24px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {t.icon}
            </span>

            {/* The text label */}
            <span className="text-[10px] leading-none">{t.label}</span>

            {/* Premium Dynamic Notification Badge */}
            {t.href === "/notifications" && unreadNotificationsCount > 0 && (
              <span className="absolute right-[14px] top-[2px] h-[7px] w-[7px] rounded-full bg-accent border border-surface"></span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};
