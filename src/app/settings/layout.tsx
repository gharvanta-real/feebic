"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  if (!user) return null;

  const menu = [
    { href: "/settings/edit-profile", label: "Edit Profile", icon: "edit", role: ["fan", "creator"] },
    { href: "/settings/email", label: "Email Notifications", icon: "mail", role: ["fan", "creator"] },
    { href: "/settings/security", label: "Security & Password", icon: "lock", role: ["fan", "creator"] },
    { href: "/settings/blocked-users", label: "Blocked Users", icon: "block", role: ["fan", "creator"] },
    { href: "/settings/monetization", label: "Monetization Settings", icon: "monetization_on", role: ["creator"] },
    { href: "/settings/verification", label: "Identity Verification", icon: "verified_user", role: ["creator"] },
    { href: "/settings/referrals", label: "Referrals Program", icon: "group", role: ["creator"] },
    { href: "/settings/payments", label: "Payment Methods", icon: "credit_card", role: ["fan", "creator"] },
    { href: "/settings/delete-account", label: "Delete Account", icon: "delete_forever", role: ["fan", "creator"] }
  ];

  const visibleMenu = menu.filter((item) => item.role.includes(user.role));

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <AppShell>
      {/* Mobile Top Header */}
      <MobileHeader>
        {pathname !== "/settings" ? (
          <button
            onClick={() => router.push("/settings")}
            className="text-text-muted hover:text-primary transition-colors cursor-pointer mr-1"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">arrow_back</span>
          </button>
        ) : null}
        <span className="text-sm font-bold text-text-muted select-none">Settings</span>
      </MobileHeader>

      <div className="app-page-wide flex overflow-hidden">
        {/* Left Column Settings Navigation Sub-menu (Hidden on sub-page Mobile views) */}
        <div className={`w-[240px] border-r border-border shrink-0 bg-background flex flex-col transition-all select-none ${
          pathname !== "/settings" ? "max-sm:hidden" : "max-sm:w-full"
        }` }>
          <div className="px-4 pt-5 pb-3 border-b border-border">
            <h2 className="text-sm font-extrabold text-text-main">Settings</h2>
          </div>
          <div className="flex-grow overflow-y-auto no-scrollbar py-1">
            {visibleMenu.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full px-4 py-2.5 flex items-center gap-2.5 transition-colors text-left text-xs font-semibold ${
                    active
                      ? "bg-primary/5 text-primary font-bold border-r-2 border-primary"
                      : "text-text-muted hover:text-text-main hover:bg-[hsl(var(--border-hsl)/0.4)]"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[19px]"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
          {/* Logout at sidebar bottom */}
          <div className="p-3 border-t border-border mt-auto">
            <button
              onClick={() => { localStorage.setItem("ch_logged_out", "true"); router.push("/login"); }}
              className="w-full px-3 py-2 flex items-center gap-2.5 rounded-xl border border-border text-xs font-bold text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[19px]">logout</span>
              Log Out
            </button>
          </div>
        </div>

        {/* Right Column Settings Contents Viewer (Hidden on main Settings root on Mobile views) */}
        <div className={`flex-grow h-full overflow-y-auto p-4 md:p-6 no-scrollbar ${
          pathname === "/settings" ? "max-sm:hidden" : "max-sm:w-full"
        }`}>
          <div className="app-page-readable">
            {children}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
