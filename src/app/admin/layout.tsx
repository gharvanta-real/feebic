"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { useTheme } from "@/context/ThemeContext";

// ─── Navigation config ────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  group?: string;
};

const NAV: NavItem[] = [
  // Core
  { href: "/admin",            label: "Overview",       icon: "dashboard",          group: "Core" },
  { href: "/admin/users",      label: "Users",          icon: "group",              group: "Core" },
  { href: "/admin/content",    label: "Content",        icon: "policy",             group: "Core" },
  { href: "/admin/appeals",    label: "Appeals",        icon: "support_agent",      group: "Core" },
  // Security
  { href: "/admin/security",   label: "Security",       icon: "shield",             group: "Security" },
  { href: "/admin/audit-logs", label: "Audit Logs",     icon: "history",            group: "Security" },
  // Ops
  { href: "/admin/operations", label: "Operations",     icon: "settings_suggest",   group: "Operations" },
  { href: "/admin/settings",   label: "Settings",       icon: "tune",               group: "Operations", adminOnly: true },
  // Infrastructure
  { href: "/admin/server",     label: "Server",         icon: "memory",             group: "Infrastructure" },
  { href: "/admin/storage",    label: "Storage",        icon: "cloud_done",         group: "Infrastructure" },
  { href: "/admin/apis",       label: "API Health",     icon: "api",                group: "Infrastructure" },
  // Team
  { href: "/admin/staff",      label: "Staff",          icon: "manage_accounts",    group: "Team", adminOnly: true },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { adminUser, handleLogout } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();

  const groups = [...new Set(NAV.map((n) => n.group))];

  const filteredNav = NAV.filter((n) => {
    if (n.adminOnly && adminUser?.role !== "admin") return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`h-screen flex flex-col bg-[var(--background)] border-r border-[var(--color-border)] transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      } shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border)] ${collapsed ? "justify-center" : ""}`}>
        <div className="h-8 w-8 rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
            admin_panel_settings
          </span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-text-main)] leading-none">Felbic</p>
            <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Ops Center</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto h-6 w-6 rounded-lg flex items-center justify-center hover:bg-[var(--color-border)] transition cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[14px] text-[var(--color-text-muted)]">
            {collapsed ? "menu_open" : "menu"}
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {groups.map((group) => {
          const items = filteredNav.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] px-2 pt-3 pb-1.5 opacity-60">
                  {group}
                </p>
              )}
              {collapsed && <div className="my-1.5 border-t border-[var(--color-border)]" />}
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                      active
                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-border)]/50"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <span
                      className="material-symbols-outlined text-[18px] shrink-0"
                      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className={`text-[11px] font-bold truncate ${active ? "text-[var(--color-primary)]" : ""}`}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={`border-t border-[var(--color-border)] p-3 ${collapsed ? "flex justify-center" : ""}`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 text-[var(--color-primary)] font-black text-xs">
              {adminUser?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-[var(--color-text-main)] truncate">@{adminUser?.username}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] font-bold capitalize">{adminUser?.role}</p>
            </div>
            <button
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">
                {theme === "light" ? "dark_mode" : "light_mode"}
              </span>
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <button
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === "light" ? "dark_mode" : "light_mode"}
              </span>
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

export function AdminPageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  const { adminUser } = useAdminAuth();
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-black text-[var(--color-text-main)] tracking-tight">{title}</h1>
        {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">{sub}</p>}
        {adminUser && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            <span className="text-[var(--color-primary)] font-bold">@{adminUser.username}</span>
            {" · "}
            <span className="capitalize font-bold">{adminUser.role}</span>
            {" · "}
            <span className={adminUser.totp_enabled ? "text-emerald-400" : "text-amber-400"}>
              {adminUser.totp_enabled ? "🔒 2FA Active" : "⚠️ 2FA Not Set"}
            </span>
          </p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Inner shell (used after auth is verified) ─────────────────────────────────

function AdminShell({ children }: { children: React.ReactNode }) {
  const { loading } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[var(--color-text-muted)]">
            Verifying Admin Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─── Root Admin Layout ────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
