"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!user) return null;

  const links: { href: string; label: string; icon: string; key: string; role: string[]; badgeValue?: number }[] = [
    { href: "/", label: "Home", icon: "home", key: "home", role: ["fan", "creator"] },
    { href: "/explore", label: "Explore", icon: "explore", key: "explore", role: ["fan", "creator"] },
    { 
      href: "/notifications", 
      label: "Notifications", 
      icon: "notifications", 
      key: "notifications", 
      role: ["fan", "creator"]
    },
    { 
      href: "/chat", 
      label: "Messages", 
      icon: "chat", 
      key: "chat", 
      role: ["fan", "creator"]
    },
    { href: "/collections", label: "Collections", icon: "collections_bookmark", key: "collections", role: ["fan", "creator"] },
    { href: "/subscriptions", label: "Subscriptions", icon: "card_membership", key: "subscriptions", role: ["fan", "creator"] },
    { href: "/lists", label: "Lists", icon: "list_alt", key: "lists", role: ["fan", "creator"] },
    { href: "/create-post", label: "Create Post", icon: "add_circle", key: "create-post", role: ["creator"] },
    { href: "/profile", label: "Profile", icon: "person", key: "profile", role: ["fan", "creator"] },
    { href: "/wallet", label: "Wallet", icon: "account_balance_wallet", key: "wallet", role: ["fan", "creator"] },
    { href: "/settings", label: "Settings", icon: "settings", key: "settings", role: ["fan", "creator"] },
    { href: "/studio", label: "Studio", icon: "dashboard", key: "studio", role: ["creator"] }
  ];

  // Filter links by user role
  const visibleLinks = links.filter((link) => link.role.includes(user.role));

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-surface py-5 px-5 transition-all duration-300 ${
        isCollapsed ? "w-[80px]" : "w-[260px]"
      } max-md:hidden`}
    >
      {/* 1. Brand Logo Row (Lowercase Sky-Blue - OnlyFans Style) */}
      <div className={`flex items-center gap-2 pb-6 select-none ${isCollapsed ? "justify-center" : "px-1"}`}>
        <div 
          onClick={toggleSidebar}
          className="flex items-center gap-1.5 cursor-pointer group hover:opacity-90 transition-opacity"
        >
          {/* Cloud Icon mimicking OnlyFans */}
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            cloud
          </span>
          {!isCollapsed && (
            <span className="text-[23px] font-black text-primary tracking-tighter leading-none font-sans lowercase">
              felbic
            </span>
          )}
        </div>
      </div>

      {/* 2. Navigation Menu Links list (Rounded pills style) */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-0.5 no-scrollbar mt-1">
        {visibleLinks.map((lnk) => {
          const active = isLinkActive(lnk.href);
          return (
            <Link
              key={lnk.key}
              href={lnk.href}
              title={isCollapsed ? lnk.label : undefined}
              className={`flex items-center rounded-full transition-all duration-150 relative cursor-pointer ${
                isCollapsed ? "justify-center h-12 w-12 mx-auto my-1" : "px-4 py-2.5 gap-4"
              } ${
                active
                  ? "bg-primary/10 text-primary font-bold shadow-none"
                  : "text-text-main hover:bg-primary/5 hover:text-primary"
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px] shrink-0"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {lnk.icon}
              </span>
              
              {!isCollapsed && (
                <span className="text-[14.5px] font-bold tracking-wide flex-grow select-none">
                  {lnk.label}
                </span>
              )}

              {/* Dynamic Badge Counts (Image 1 style) */}
              {lnk.badgeValue && (
                <div className={`flex items-center justify-center font-extrabold shrink-0 bg-primary text-white rounded-full ${
                  isCollapsed 
                    ? "absolute top-1 right-1 text-[8px] h-4 w-4 border border-surface shadow-md"
                    : "text-[11px] px-2 py-0.5 min-w-[20px] h-5"
                }`}>
                  {lnk.badgeValue}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. Theme Toggle Row (Directly above profile) */}
      <div
        onClick={toggleTheme}
        className={`flex items-center pt-3 pb-3 select-none cursor-pointer border-t border-border/80 ${
          isCollapsed ? "justify-center px-0 mt-2" : "justify-between px-3"
        }`}
      >
        {!isCollapsed && (
          <span className="text-text-muted flex items-center gap-2 text-xs font-extrabold tracking-wide">
            <span className="material-symbols-outlined text-[20px] text-text-muted leading-none">
              dark_mode
            </span>
            Theme
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTheme();
          }}
          className={`relative h-5.5 w-10 cursor-pointer rounded-full border border-border transition-colors p-[2px] ${
            theme === "dark" ? "bg-primary border-primary" : "bg-gray-200"
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
              theme === "dark" ? "translate-x-4.5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* 4. User Profile Card (100% Screenshot replica) */}
      <div 
        onClick={() => setShowMoreMenu(!showMoreMenu)}
        className={`border-t border-border/80 pt-4.5 flex items-center justify-between select-none cursor-pointer hover:bg-primary/5 rounded-2xl p-1 transition-colors ${
          isCollapsed ? "justify-center px-0" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              className="h-10 w-10 rounded-full object-cover border border-border"
              src={user.avatar}
              alt={user.displayName}
            />
            {/* Green active status indicator dot */}
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 border-2 border-surface rounded-full" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col text-left">
              <span className="text-[13.5px] font-black text-text-main leading-none">
                {user.displayName}
              </span>
              <span className="text-[11px] text-text-muted mt-1 leading-none font-semibold">
                @{user.username}
              </span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <span className="material-symbols-outlined text-text-muted hover:text-text-main text-[20px]">
            more_horiz
          </span>
        )}
      </div>

      {/* Floating expanded Context Menu */}
      {!isCollapsed && showMoreMenu && (
        <div className="absolute bottom-[80px] left-6 right-6 bg-surface border border-border rounded-2xl shadow-xl p-2 z-[60] animate-fade-in flex flex-col space-y-0.5">
          <button 
            onClick={() => { router.push("/profile"); setShowMoreMenu(false); }}
            className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold hover:bg-primary/5 text-text-main hover:text-primary rounded-xl w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>My Profile</span>
          </button>
          <button 
            onClick={() => { router.push("/wallet"); setShowMoreMenu(false); }}
            className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold hover:bg-primary/5 text-text-main hover:text-primary rounded-xl w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Wallet Account</span>
          </button>
          <button 
            onClick={() => { router.push("/settings"); setShowMoreMenu(false); }}
            className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold hover:bg-primary/5 text-text-main hover:text-primary rounded-xl w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>Settings</span>
          </button>
          <hr className="border-border/50 my-1" />
          <button 
            onClick={() => { 
              localStorage.clear(); 
              window.location.href = "/onboarding"; 
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold hover:bg-accent/10 text-accent rounded-xl w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
};
