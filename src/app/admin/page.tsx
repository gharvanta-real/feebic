"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Creator, Post } from "@/lib/mockDb";
import { apiClient } from "@/lib/apiClient";

type AdminModule = "overview" | "users" | "content" | "appeals" | "security" | "settings" | "audit_logs" | "staff_manager";
type UserStatus = "active" | "restricted" | "suspended" | "deactivated";
type ContentDecision = "approved" | "age_gate" | "shadowbanned" | "hidden";
type ChartType = "revenue" | "spam" | "growth";

type AuditUser = {
  username: string;
  name: string;
  avatar: string;
  role: "creator" | "fan";
  status: UserStatus;
  verified: boolean;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  associatedAccounts: string[];
  kycDocType: string;
  kycDocUrl: string;
  kycSelfieUrl: string;
  kycStatus: "none" | "pending" | "approved" | "rejected";
  balanceDue: number;
};

type FlaggedPost = {
  id: string;
  creatorUsername: string;
  creatorAvatar: string;
  content: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "text";
  reason: string;
  reportedBy: string;
  aiScore: number;
  aiBreakdown: { nudity: number; violence: number; spam: number; copyright: number };
  comments: string[];
  decision: ContentDecision;
};

type AppealTicket = {
  id: string;
  username: string;
  avatar: string;
  type: "Hacked Account Recovery" | "VIP Verification Request" | "Post Unban Appeal";
  status: "pending" | "resolved" | "rejected";
  description: string;
  createdAt: string;
  selfieMatchScore: number;
  auditLogs: string[];
  recoveryStep: number; // 0: uninitiated, 1: biometric, 2: flush, 3: restored, 4: complete
};

type SpamAlert = {
  id: string;
  username: string;
  type: "comment_spike" | "dm_spike" | "follow_spike";
  value: string;
  severity: "high" | "critical";
  timestamp: string;
};

type PlatformSettings = {
  newSignups: boolean;
  creatorVerification: boolean;
  autoPayouts: boolean;
  liveMonitoring: boolean;
  platformFee: number;
  maxPpvPrice: number;
};

type OverviewMetrics = {
  revenueTrend: number[];
  spamTrend: number[];
  growthTrend: number[];
};

const defaultSettings: PlatformSettings = {
  newSignups: true,
  creatorVerification: true,
  autoPayouts: false,
  liveMonitoring: true,
  platformFee: 20,
  maxPpvPrice: 999,
};

// Local storage helpers
const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const formatMoney = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast(null);
    }, 2500);
  };

  const handleAdminLogout = async () => {
    try {
      await apiClient.post("/admin-auth/logout");
    } catch { /* best-effort */ }
    localStorage.removeItem("ch_admin_token");
    document.cookie = "ch_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/admin/login");
  };

  const [activeModule, setActiveModule] = useState<AdminModule>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // States for system email dispatch HUD
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserProfile) return;
    setSendingEmail(true);
    try {
      await apiClient.post(`/admin/users/${selectedUserProfile.username}/email`, {
        subject: emailSubject,
        body: emailBody,
      });
      showToast(`System notice transmitted to @${selectedUserProfile.username} successfully.`);
      setEmailSubject("");
      setEmailBody("");
    } catch (err: any) {
      showToast("Failed to dispatch email: " + (err.message || err));
    } finally {
      setSendingEmail(false);
    }
  };

  // States for interactive panels
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [selectedUserUsername, setSelectedUserUsername] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "creator" | "fan">("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "restricted" | "suspended">("all");

  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");

  const [appeals, setAppeals] = useState<AppealTicket[]>([]);
  const [selectedAppealId, setSelectedAppealId] = useState<string>("");

  const [spamAlerts, setSpamAlerts] = useState<SpamAlert[]>([]);
  const [botCount, setBotCount] = useState(4120);
  const [threatLevel, setThreatLevel] = useState<"SAFE" | "ELEVATED" | "CRITICAL">("CRITICAL");
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [searchQuery, setSearchQuery] = useState("");

  // System Lockdown State
  const [isLockdownActive, setIsLockdownActive] = useState<boolean>(false);

  // SVGs Chart Toggles
  const [activeChart, setActiveChart] = useState<ChartType>("revenue");

  const [metrics, setMetrics] = useState<OverviewMetrics>({
    revenueTrend: [12000, 15000, 18000, 22000, 28000, 35000, 48000],
    spamTrend: [15, 30, 22, 45, 68, 52, 34],
    growthTrend: [40, 45, 52, 60, 75, 88, 110],
  });

  const getSvgPathForTrend = (trend: number[]) => {
    if (!trend || trend.length === 0) return "";
    const maxVal = Math.max(...trend, 1);
    const points = trend.map((val, idx) => {
      const x = (idx / (trend.length - 1)) * 500;
      const y = 130 - (val / maxVal) * 110;
      return `${x} ${y}`;
    });
    return `M ${points.join(" L ")}`;
  };

  const getSvgFillPathForTrend = (trend: number[]) => {
    if (!trend || trend.length === 0) return "";
    const path = getSvgPathForTrend(trend);
    return `${path} L 500 150 L 0 150 Z`;
  };

  // Terminal Live Logs State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Initialize data
  const reloadData = async () => {
    try {
      const [usersData, postsData, appealsData, settingsData, alertsData, metricsData] = await Promise.all([
        apiClient.get<AuditUser[]>("/admin/users"),
        apiClient.get<FlaggedPost[]>("/admin/posts"),
        apiClient.get<AppealTicket[]>("/admin/appeals"),
        apiClient.get<PlatformSettings>("/admin/settings"),
        apiClient.get<SpamAlert[]>("/admin/security/alerts"),
        apiClient.get<OverviewMetrics>("/admin/overview/metrics"),
      ]);

      if (usersData) {
        setUsers(usersData);
        setSelectedUserUsername(current => {
          if (current && usersData.some(u => u.username === current)) return current;
          return usersData[0]?.username || "";
        });
      }

      if (postsData) {
        setFlaggedPosts(postsData);
        setSelectedPostId(current => {
          if (current && postsData.some(p => p.id === current)) return current;
          return postsData[0]?.id || "";
        });
      }

      if (appealsData) {
        setAppeals(appealsData);
        setSelectedAppealId(current => {
          if (current && appealsData.some(a => a.id === current)) return current;
          return appealsData[0]?.id || "";
        });
      }

      if (settingsData) {
        setSettings(settingsData);
      }

      if (alertsData) {
        setSpamAlerts(alertsData);
        setBotCount(alertsData.length * 1373);
        setThreatLevel(alertsData.length > 0 ? "CRITICAL" : "SAFE");
      } else {
        setSpamAlerts([]);
        setBotCount(0);
        setThreatLevel("SAFE");
      }

      if (metricsData) {
        setMetrics(metricsData);
      }

      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SYSTEM] Connected to Supabase DB: synced ${usersData?.length || 0} user records, ${postsData?.length || 0} moderation queues, and ${appealsData?.length || 0} appeal tickets.`
      ]);
    } catch (err: any) {
      console.error(err);
      showToast("Error loading live audit metrics: " + (err.message || err));
    }
  };

  // Secure admin auth check — uses admin-specific JWT endpoint
  // NEVER uses /users/profile or hardcoded email checks
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ch_admin_token") : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    apiClient.get("/admin-auth/me")
      .then((adminData) => {
        if (adminData && adminData.id && adminData.role) {
          setAdminUser(adminData);
          setLoadingAdmin(false);
        } else {
          localStorage.removeItem("ch_admin_token");
          document.cookie = "ch_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          router.replace("/admin/login");
        }
      })
      .catch((err) => {
        console.error("Admin verification error:", err);
        localStorage.removeItem("ch_admin_token");
        document.cookie = "ch_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.replace("/admin/login");
      });
  }, [router]);

  // Automatically reload dashboard metrics when adminUser is verified
  useEffect(() => {
    if (adminUser) {
      reloadData();
    }
  }, [adminUser]);

  // Scrolling Terminal Simulator
  useEffect(() => {
    const alerts = [
      "[INFO] Rate-limiter triggered on API route /posts",
      "[WARN] Suspicious login signature blocked for IP 185.220.101.4",
      "[SECURITY] 2FA validation challenge sent to @hacker_anonymous",
      "[INFO] Database backup triggered successfully.",
      "[INFO] Payout queue audited. 0 alerts triggered.",
      "[WARN] Bot-net scanning detected active ports probing.",
      "[SECURITY] Firewall blocked DDoS burst from bot network."
    ];

    const interval = setInterval(() => {
      const randomLog = alerts[Math.floor(Math.random() * alerts.length)];
      const timestamp = new Date().toLocaleTimeString();
      setTerminalLogs(prev => {
        const next = [...prev, `[${timestamp}] ${randomLog}`];
        return next.slice(-25); // Limit logs to last 25 items
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal log to bottom
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Update handlers
  const handleUpdateUserStatus = async (username: string, status: UserStatus) => {
    try {
      await apiClient.put(`/admin/users/${username}/status`, { status });
      setUsers(current =>
        current.map(u => (u.username === username ? { ...u, status } : u))
      );
      showToast(`User @${username} status marked as ${status}`);
    } catch (err: any) {
      showToast("Failed to update status: " + (err.message || err));
    }
  };

  const handleBlockAccount = () => {
    if (!selectedUserProfile) return;
    handleUpdateUserStatus(selectedUserProfile.username, "suspended");
  };

  const handleDeleteAccount = async () => {
    if (!selectedUserProfile) return;
    const confirmed = window.confirm(`⚠️ WARNING: Are you sure you want to permanently delete @${selectedUserProfile.username}? This action is irreversible and will purge all transactions, posts, and profile records.`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/admin/users/${selectedUserProfile.username}`);
      showToast(`Account @${selectedUserProfile.username} has been permanently deleted.`);
      
      const deletedUsername = selectedUserProfile.username;
      setUsers(current => current.filter(u => u.username !== deletedUsername));
      setSelectedUserUsername("");
    } catch (err: any) {
      showToast("Failed to delete user: " + (err.message || err));
    }
  };

  const handleApproveKYC = async (username: string) => {
    try {
      await apiClient.put(`/admin/users/${username}/kyc`, { status: "approved" });
      setUsers(current =>
        current.map(u => (u.username === username ? { ...u, kycStatus: "approved", verified: true } : u))
      );
      showToast(`KYC Approved for @${username}. Blue verified badge unlocked.`);
    } catch (err: any) {
      showToast("Failed to approve KYC: " + (err.message || err));
    }
  };

  const handleRejectKYC = async (username: string) => {
    try {
      await apiClient.put(`/admin/users/${username}/kyc`, { status: "rejected" });
      setUsers(current =>
        current.map(u => (u.username === username ? { ...u, kycStatus: "rejected", verified: false } : u))
      );
      showToast(`KYC Rejected for @${username}. Documents locked.`);
    } catch (err: any) {
      showToast("Failed to reject KYC: " + (err.message || err));
    }
  };

  const handleModerationDecision = async (postId: string, decision: ContentDecision) => {
    try {
      await apiClient.put(`/admin/posts/${postId}/decision`, { decision });
      setFlaggedPosts(current =>
        current.map(p => (p.id === postId ? { ...p, decision } : p))
      );
      showToast(`Moderation action: Marked post as ${decision}`);
    } catch (err: any) {
      showToast("Failed to moderate post: " + (err.message || err));
    }
  };

  const handleResolveAppeal = async (appealId: string, status: "resolved" | "rejected") => {
    try {
      await apiClient.put(`/admin/appeals/${appealId}/resolve`, { status, recoveryStep: status === "resolved" ? 4 : 0 });
      setAppeals(current =>
        current.map(a => (a.id === appealId ? { ...a, status, recoveryStep: status === "resolved" ? 4 : a.recoveryStep } : a))
      );
      showToast(`Appeal ticket marked as ${status}`);
    } catch (err: any) {
      showToast("Failed to resolve appeal: " + (err.message || err));
    }
  };

  const handleAdvanceRecoveryStep = async (appealId: string) => {
    const currentAppeal = appeals.find(a => a.id === appealId);
    if (!currentAppeal || currentAppeal.status !== "pending") return;

    const nextStep = (currentAppeal.recoveryStep + 1) % 5;
    try {
      await apiClient.put(`/admin/appeals/${appealId}/resolve`, { status: nextStep === 4 ? "resolved" : "pending", recoveryStep: nextStep });
      setAppeals(current =>
        current.map(a => (a.id === appealId ? { ...a, recoveryStep: nextStep, status: nextStep === 4 ? "resolved" : "pending" } : a))
      );

      const stepMsgs = [
        "Recovery reset to uninitiated.",
        "Step 1 Complete: Biometric ID Verification Pass.",
        "Step 2 Complete: Terminated all active user sessions.",
        "Step 3 Complete: Restoration token sent to original email.",
        "Step 4 Complete: Profile restored. Account fully unlocked!"
      ];
      showToast(stepMsgs[nextStep]);
    } catch (err: any) {
      showToast("Failed to advance recovery step: " + (err.message || err));
    }
  };

  const handleMassBan = async () => {
    try {
      setThreatLevel("SAFE");
      showToast("Running security scan on active bot-net nodes...");
      await apiClient.post("/admin/security/mass-ban");
      setTimeout(async () => {
        setBotCount(0);
        setSpamAlerts([]);
        showToast("Mass Ban Complete! Suspicious fake accounts suspended globally.");
        setTerminalLogs(prev => [
          ...prev,
          `[SECURITY] MASS BAN TRIGGERED BY AUDITOR @gharvanta. Suspending bot nodes...`,
          `[SECURITY] Cleanroom secure. Threat level dropped to SAFE.`
        ]);
        const usersData = await apiClient.get<AuditUser[]>("/admin/users");
        if (usersData) {
          setUsers(usersData);
        }
      }, 1200);
    } catch (err: any) {
      showToast("Failed to run mass ban: " + (err.message || err));
    }
  };

  const handleBanSingleBot = async (username: string) => {
    try {
      await apiClient.put(`/admin/users/${username}/status`, { status: "suspended" });
      setSpamAlerts(current => current.filter(a => a.username !== username));
      showToast(`Spammer @${username} has been banned and DMs scrubbed.`);
      setTerminalLogs(prev => [...prev, `[SECURITY] Banned abusive account @${username}. Session invalidated.`]);
      
      const usersData = await apiClient.get<AuditUser[]>("/admin/users");
      if (usersData) {
        setUsers(usersData);
      }
    } catch (err: any) {
      showToast("Failed to ban bot: " + (err.message || err));
    }
  };

  const handleUpdateSetting = async <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await apiClient.put("/admin/settings", next);
      showToast("Global system parameter saved.");
    } catch (err: any) {
      showToast("Failed to save settings: " + (err.message || err));
    }
  };

  const handleToggleLockdown = () => {
    const nextState = !isLockdownActive;
    setIsLockdownActive(nextState);
    if (nextState) {
      showToast("⚠️ DANGER: PLATFORM SYSTEM LOCKDOWN ACTIVATED! Signups and withdrawals frozen.");
      setTerminalLogs(prev => [...prev, `[CRITICAL] PLATFORM UNDER LOCKDOWN BY AUDITOR. Core APIs frozen.`]);
    } else {
      showToast("✅ System Lockdown lifted. Platform operational.");
      setTerminalLogs(prev => [...prev, `[INFO] Lockdown lifted. Core APIs responsive.`]);
    }
  };

  // Memo calculations for display
  const selectedUserProfile = useMemo(() => {
    return users.find(u => u.username === selectedUserUsername) || users[0];
  }, [selectedUserUsername, users]);

  const selectedPostProfile = useMemo(() => {
    return flaggedPosts.find(p => p.id === selectedPostId) || flaggedPosts[0];
  }, [selectedPostId, flaggedPosts]);

  const selectedAppealProfile = useMemo(() => {
    return appeals.find(a => a.id === selectedAppealId) || appeals[0];
  }, [selectedAppealId, appeals]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      const matchesStatus = userStatusFilter === "all" || u.status === userStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [searchQuery, userRoleFilter, userStatusFilter, users]);

  if (loadingAdmin) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-bold tracking-wider uppercase text-cyan-400">Authenticating Auditor...</p>
          <p className="text-xs text-slate-500 font-medium animate-pulse">Establishing secure link to Command Center</p>
        </div>
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-background text-text-main font-sans antialiased transition-all duration-500 ${
      isLockdownActive ? "border-[6px] border-red-600 shadow-[inset_0_0_50px_rgba(220,38,38,0.35)] animate-pulse-border" : ""
    }`}>
      {/* ── DEDICATED ADMIN SIDEBAR ── */}
      <aside
        className={`flex h-full flex-col border-r border-border bg-surface transition-all duration-300 ${
          isSidebarCollapsed ? "w-[76px] px-3" : "w-[260px] px-5"
        } py-5 shrink-0 select-none`}
      >
        {/* Brand logo header */}
        <div className="flex items-center gap-3 border-b border-border/80 pb-5 select-none justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className={`material-symbols-outlined text-[26px] ${isLockdownActive ? "text-red-500 animate-spin" : "text-primary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              admin_panel_settings
            </span>
            {!isSidebarCollapsed && (
              <span className="text-[19px] font-black tracking-tighter text-text-main flex items-center gap-1.5">
                felbic
                <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-md ${
                  isLockdownActive ? "bg-red-600 text-white animate-pulse" : "bg-primary/10 text-primary"
                }`}>
                  {isLockdownActive ? "LOCKDOWN" : "ops"}
                </span>
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="rounded-full p-1 text-text-muted hover:bg-primary/5 hover:text-text-main transition"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSidebarCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {/* Dedicated Admin Navigation Menu */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar mt-5">
          {[
            { id: "overview", label: "Command Room", icon: "dashboard" },
            { id: "users", label: "360° User Audit", icon: "group" },
            { id: "content", label: "Moderation Queue", icon: "policy" },
            { id: "appeals", label: "Appeals Center", icon: "support_agent" },
            { id: "security", label: "Security & Bots", icon: "shield" },
            { id: "settings", label: "Platform Rules", icon: "tune" },
            { id: "audit_logs", label: "Audit Logs", icon: "history" },
            ...(adminUser?.role === "admin" ? [{ id: "staff_manager", label: "Staff Manager", icon: "manage_accounts" }] : []),
          ].map(item => {
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id as AdminModule)}
                className={`flex w-full items-center rounded-xl transition ${
                  isSidebarCollapsed ? "justify-center h-11 w-11 mx-auto" : "px-4 py-3 gap-3.5"
                } ${
                  active
                    ? "bg-primary text-white font-bold shadow-md shadow-primary/15"
                    : "text-text-muted hover:text-text-main hover:bg-primary/5"
                }`}
              >
                <span className="material-symbols-outlined text-[22px] shrink-0">{item.icon}</span>
                {!isSidebarCollapsed && <span className="text-xs font-bold tracking-wide">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="border-t border-border/80 my-4" />

        {/* Return to User Site Button */}
        <button
          onClick={() => router.push("/")}
          className={`flex items-center rounded-xl border border-border text-text-muted hover:border-primary hover:text-primary transition py-2.5 ${
            isSidebarCollapsed ? "justify-center h-10 w-10 mx-auto" : "px-4 gap-3 text-xs font-bold"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          {!isSidebarCollapsed && <span>Go to User Feed</span>}
        </button>

        {/* Profile Admin Badge */}
        <div className={`mt-4 flex items-center justify-between bg-primary/5 border border-primary/10 rounded-2xl p-2 select-none ${isSidebarCollapsed ? "justify-center" : ""}`}>
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/082f4723389abb44b68b64dfc082268b.png"
              alt="Admin Avatar"
              className="h-9 w-9 rounded-full object-cover border border-primary/20 shrink-0"
            />
            {!isSidebarCollapsed && (
              <div className="text-left">
                <p className="text-xs font-extrabold text-text-main leading-none">Gharvanta Admin</p>
                <p className="text-[10px] text-text-muted mt-1 leading-none font-bold">System Auditor</p>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={handleAdminLogout}
              className="material-symbols-outlined text-[18px] text-text-muted hover:text-accent cursor-pointer"
            >
              logout
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT VIEWPORT ── */}
      <main className="flex-1 h-full overflow-hidden flex flex-col bg-background">
        {/* Module Header Bar */}
        <header className="border-b border-border/80 bg-surface px-6 py-4 flex items-center justify-between select-none z-10">
          <div>
            <h1 className="text-lg font-black text-text-main font-sans uppercase tracking-tight">
              {activeModule === "overview" && "System Command Center"}
              {activeModule === "users" && "360° User & Creator Audits"}
              {activeModule === "content" && "Content Policy Moderation"}
              {activeModule === "appeals" && "Appeals & Support Desk"}
              {activeModule === "security" && "Threat & Bot-net Room"}
              {activeModule === "settings" && "Platform Global Controls"}
              {activeModule === "audit_logs" && "Admin Audit Logs"}
              {activeModule === "staff_manager" && "Staff Account Manager"}
            </h1>
            <p className="text-[11px] text-text-muted font-medium mt-0.5">
              Authenticated: <span className="text-cyan-400 font-bold">@{adminUser.username}</span> · Role: <span className="text-violet-400 font-bold uppercase">{adminUser.role}</span> · 2FA: <span className={adminUser.totp_enabled ? "text-emerald-400" : "text-amber-400"}>{adminUser.totp_enabled ? "Active" : "⚠️ Not Set"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeModule === "overview" && (
              <button
                onClick={handleToggleLockdown}
                className={`rounded-full px-5 py-2 text-xs font-black tracking-wider uppercase transition shadow-md flex items-center gap-1.5 cursor-pointer ${
                  isLockdownActive
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isLockdownActive ? "lock_open" : "lock"}
                </span>
                {isLockdownActive ? "Lift Lockdown" : "System Lockdown"}
              </button>
            )}
            <button
              onClick={reloadData}
              className="rounded-full bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 text-xs font-bold hover:bg-primary hover:text-white transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Reload Logs
            </button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
          {/* MODULE 1: COMMAND CENTER (OVERVIEW) */}
          {activeModule === "overview" && (
            <div className="space-y-6">
              {/* Emergency Lockdown Alert banner */}
              {isLockdownActive && (
                <div className="bg-red-600 text-white p-4 rounded-2xl flex gap-3 items-center shadow-lg border border-red-500/20 select-none animate-pulse">
                  <span className="material-symbols-outlined text-[32px] font-black">gavel</span>
                  <div className="flex-grow">
                    <p className="font-extrabold text-sm uppercase">SYSTEM LOCKDOWN PROTOCOL ACTIVE</p>
                    <p className="text-xs font-medium opacity-90 mt-0.5">
                      New visitor registrations, creator withdrawals, and wallet deposits are currently locked globally. Lifting lockdown requires verification check.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 select-none">
                <div className="bg-surface border border-border rounded-2xl p-4 relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-wider">Active Auditors</p>
                  <p className="text-xl font-black text-primary mt-2">1 online</p>
                  <p className="text-[10px] text-text-muted font-bold mt-1">@gharvanta</p>
                  <span className="material-symbols-outlined text-[44px] absolute right-3 bottom-3 text-primary opacity-10 font-black">verified_user</span>
                </div>
                <div className="bg-surface border border-border rounded-2xl p-4 relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-wider">Open Reports</p>
                  <p className="text-xl font-black text-accent mt-2">{flaggedPosts.filter(p => p.decision !== "approved").length} active</p>
                  <p className="text-[10px] text-text-muted font-bold mt-1">Awaiting policy decision</p>
                  <span className="material-symbols-outlined text-[44px] absolute right-3 bottom-3 text-accent opacity-10">warning</span>
                </div>
                <div className="bg-surface border border-border rounded-2xl p-4 relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-wider">Pending Appeals</p>
                  <p className="text-xl font-black text-success mt-2">{appeals.filter(a => a.status === "pending").length} tickets</p>
                  <p className="text-[10px] text-text-muted font-bold mt-1">KYC & user claims</p>
                  <span className="material-symbols-outlined text-[44px] absolute right-3 bottom-3 text-success opacity-10">support_agent</span>
                </div>
                <div className="bg-surface border border-border rounded-2xl p-4 relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase text-text-muted tracking-wider">Threat Level</p>
                  <p className={`text-xl font-black mt-2 ${
                    threatLevel === "CRITICAL" ? "text-red-500 animate-pulse" : "text-success"
                  }`}>{threatLevel}</p>
                  <p className="text-[10px] text-text-muted font-bold mt-1">{botCount} active bot nodes</p>
                  <span className="material-symbols-outlined text-[44px] absolute right-3 bottom-3 text-red-500 opacity-10">shield</span>
                </div>
              </div>

              {/* Interactive SVG Chart Card */}
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/85 pb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase text-text-main tracking-wider select-none">Platform Volumetric & Audit Trends</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Visualizing database transactions and safety pressures over the last 7 days.</p>
                  </div>
                  <div className="flex gap-1">
                    {[
                      { id: "revenue", label: "Revenue Share", color: "bg-success text-white" },
                      { id: "spam", label: "Spam Pressure", color: "bg-accent text-white" },
                      { id: "growth", label: "Creator Signups", color: "bg-primary text-white" }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setActiveChart(btn.id as ChartType)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition ${
                          activeChart === btn.id
                            ? btn.color + " border-transparent"
                            : "border-border text-text-muted hover:border-text-muted"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Line Graph */}
                <div className="h-44 w-full flex items-center justify-center relative overflow-hidden">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={
                          activeChart === "revenue" ? "hsl(var(--success-hsl))" : activeChart === "spam" ? "hsl(var(--accent-hsl))" : "hsl(var(--primary-hsl))"
                        } stopOpacity="0.25"/>
                        <stop offset="100%" stopColor={
                          activeChart === "revenue" ? "hsl(var(--success-hsl))" : activeChart === "spam" ? "hsl(var(--accent-hsl))" : "hsl(var(--primary-hsl))"
                        } stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guidelines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="var(--border)" strokeWidth="0.75" strokeDasharray="4 4" />
                    <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border)" strokeWidth="0.75" strokeDasharray="4 4" />
                    <line x1="0" y1="120" x2="500" y2="120" stroke="var(--border)" strokeWidth="0.75" strokeDasharray="4 4" />

                    {/* SVG Paths dynamically selected */}
                    {activeChart === "revenue" && (
                      <>
                        <path d={getSvgFillPathForTrend(metrics.revenueTrend)} fill="url(#chartGrad)" />
                        <path d={getSvgPathForTrend(metrics.revenueTrend)} fill="none" stroke="hsl(var(--success-hsl))" strokeWidth="2.5" strokeLinecap="round" />
                      </>
                    )}
                    {activeChart === "spam" && (
                      <>
                        <path d={getSvgFillPathForTrend(metrics.spamTrend)} fill="url(#chartGrad)" />
                        <path d={getSvgPathForTrend(metrics.spamTrend)} fill="none" stroke="hsl(var(--accent-hsl))" strokeWidth="2.5" strokeLinecap="round" />
                      </>
                    )}
                    {activeChart === "growth" && (
                      <>
                        <path d={getSvgFillPathForTrend(metrics.growthTrend)} fill="url(#chartGrad)" />
                        <path d={getSvgPathForTrend(metrics.growthTrend)} fill="none" stroke="hsl(var(--primary-hsl))" strokeWidth="2.5" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                  {/* Floating Metric Indicator */}
                  <div className="absolute top-2 left-4 text-xs font-black text-text-main flex gap-3 select-none">
                    <span>Mon: 25k</span>
                    <span>Wed: 48k</span>
                    <span>Fri: 82k</span>
                  </div>
                </div>
              </div>

              {/* Status and Emergency actions */}
              <div className="grid gap-5 lg:grid-cols-3">
                {/* System Activity */}
                <div className="bg-surface border border-border rounded-2xl p-5 lg:col-span-2 space-y-4">
                  <h2 className="text-xs font-black uppercase text-text-muted tracking-wider border-b border-border/80 pb-2.5">
                    Platform Safety Monitoring
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: "Content Moderation Queue Depth", value: 34, color: "bg-accent" },
                      { label: "Bot-net Attack Pressure", value: botCount > 0 ? 82 : 4, color: "bg-primary" },
                      { label: "KYC Compliance rate", value: 92, color: "bg-success" },
                    ].map(item => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-text-main">{item.label}</span>
                          <span className="text-text-muted">{item.value}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[hsl(var(--border-hsl)/0.4)]">
                          <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operations checklist */}
                <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                  <h2 className="text-xs font-black uppercase text-text-muted tracking-wider border-b border-border/80 pb-2.5">
                    Admin Emergency Controls
                  </h2>
                  <div className="space-y-3">
                    {[
                      { key: "newSignups", label: "Allow New Signups" },
                      { key: "creatorVerification", label: "Require Identity Verification" },
                      { key: "liveMonitoring", label: "Enable AI Live Streams Audit" },
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between border border-border rounded-xl p-3 cursor-pointer hover:border-primary/50 transition">
                        <span className="text-xs font-black text-text-main">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={settings[item.key as keyof PlatformSettings] as boolean}
                          onChange={e => handleUpdateSetting(item.key as keyof PlatformSettings, e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 2: 360° USER AUDIT */}
          {activeModule === "users" && (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* User List Sidebar */}
              <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2 max-h-[600px] overflow-y-auto no-scrollbar">
                <p className="text-[10px] font-black uppercase text-text-muted tracking-wider pb-2 border-b border-border/80 mb-2">Registered Accounts</p>
                
                {/* Search Account handle */}
                <div className="relative mb-1">
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[14px] text-text-muted">search</span>
                  <input
                    type="text"
                    placeholder="Find account..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg text-[10px] font-bold pl-8 pr-2 py-1.5 text-text-main outline-none focus:border-primary placeholder-text-muted"
                  />
                </div>

                {/* Filters */}
                <div className="space-y-2 mb-3">
                  <div className="grid grid-cols-2 gap-1.5 select-none">
                    <select
                      value={userRoleFilter}
                      onChange={e => setUserRoleFilter(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg text-[10px] font-bold p-1.5 text-text-muted outline-none focus:border-primary"
                    >
                      <option value="all">All Roles</option>
                      <option value="creator">Creators</option>
                      <option value="fan">Fans</option>
                    </select>
                    <select
                      value={userStatusFilter}
                      onChange={e => setUserStatusFilter(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg text-[10px] font-bold p-1.5 text-text-muted outline-none focus:border-primary"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="restricted">Restricted</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4 select-none">No users match filters.</p>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = selectedUserUsername === u.username;
                    return (
                      <button
                        key={u.username}
                        onClick={() => setSelectedUserUsername(u.username)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${
                          isSelected
                            ? "border-primary bg-primary/5 animate-fade-in"
                            : "border-border hover:border-text-muted bg-transparent"
                        }`}
                      >
                        <img src={u.avatar} alt="" className="h-9 w-9 rounded-full object-cover border border-border shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-text-main truncate leading-none">{u.name}</p>
                          <p className="text-[10px] text-text-muted mt-1 leading-none truncate">@{u.username}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* 360° Profile Details */}
              {selectedUserProfile && (
                <div className="space-y-6 animate-fade-in">
                  {/* Summary Card */}
                  <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <img src={selectedUserProfile.avatar} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/20 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-extrabold text-text-main leading-none">{selectedUserProfile.name}</h3>
                          {selectedUserProfile.verified && (
                            <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-1 font-bold">@{selectedUserProfile.username} • {selectedUserProfile.role === "creator" ? "Creator Account" : "Fan / Visitor"}</p>
                        <span className={`inline-block mt-2 rounded-full px-3 py-1 text-[9px] font-black uppercase ${
                          selectedUserProfile.status === "active" ? "bg-success/15 text-success" : selectedUserProfile.status === "restricted" ? "bg-accent/15 text-accent" : "bg-red-500/15 text-red-500"
                        }`}>
                          {selectedUserProfile.status}
                        </span>
                      </div>
                    </div>

                    {/* Status Modifiers */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-text-muted tracking-wider select-none mb-1">Set Account Status</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(["active", "restricted", "suspended", "deactivated"] as UserStatus[]).map(st => (
                          <button
                            key={st}
                            onClick={() => handleUpdateUserStatus(selectedUserProfile.username, st)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition ${
                              selectedUserProfile.status === st
                                ? "bg-primary text-white border-primary"
                                : "border-border hover:border-text-muted text-text-muted"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Audit Details */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Device & IP Footprint */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-1.5 select-none">
                        <span className="material-symbols-outlined text-[18px] text-primary">devices</span>
                        Device & Security Footprint
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between border-b border-border/80 pb-1.5">
                          <span className="text-text-muted">Registered Hardware</span>
                          <span className="font-bold text-text-main">{selectedUserProfile.device}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/80 pb-1.5">
                          <span className="text-text-muted">Last Logged IP</span>
                          <span className="font-bold text-text-main font-mono">{selectedUserProfile.ip}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/80 pb-1.5">
                          <span className="text-text-muted">Network Location</span>
                          <span className="font-bold text-text-main">{selectedUserProfile.location}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-text-muted">Activity Logs</span>
                          <span className="font-bold text-text-main">{selectedUserProfile.lastActive}</span>
                        </div>
                      </div>
                    </div>

                    {/* Associated / Alt Accounts */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-1.5 select-none">
                        <span className="material-symbols-outlined text-[18px] text-primary">join_inner</span>
                        Associated Profiles (IP/Phone Link)
                      </h4>
                      <div className="space-y-2">
                        {(selectedUserProfile.associatedAccounts || []).length === 0 ? (
                          <p className="text-xs text-text-muted">No duplicate account fingerprints detected on device / IP.</p>
                        ) : (
                          (selectedUserProfile.associatedAccounts || []).map(alt => (
                            <div key={alt} className="flex items-center justify-between border border-border rounded-xl px-3.5 py-2.5 bg-background">
                              <span className="text-xs font-bold text-text-main">@{alt}</span>
                              <span className="text-[10px] text-accent font-black uppercase bg-accent/15 px-2 py-0.5 rounded-full">Shared Device</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KYC Review Details */}
                  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-1.5 select-none">
                      <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
                      Identity Verification (KYC) Review Wizard
                    </h4>
                    {selectedUserProfile.kycStatus === "none" ? (
                      <p className="text-xs text-text-muted">This user has not submitted KYC details yet.</p>
                    ) : (
                      <div className="grid gap-5 sm:grid-cols-2 text-xs">
                        <div className="space-y-3">
                          <div className="flex justify-between border-b border-border/80 pb-1.5">
                            <span className="text-text-muted">KYC Document Type</span>
                            <span className="font-bold text-text-main">{selectedUserProfile.kycDocType}</span>
                          </div>
                          <div>
                            <span className="text-text-muted block mb-1">Document Status Check</span>
                            <p className="font-bold text-text-main bg-background p-2.5 rounded-lg border border-border font-mono">{selectedUserProfile.kycDocUrl}</p>
                          </div>
                          <div>
                            <span className="text-text-muted block mb-1">Biometric Selfie Validation</span>
                            <p className="font-bold text-text-main bg-background p-2.5 rounded-lg border border-border font-mono">{selectedUserProfile.kycSelfieUrl}</p>
                          </div>
                        </div>

                        {/* Video Review Interface */}
                        <div className="border border-border rounded-xl p-4 flex flex-col justify-between bg-background">
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-text-muted tracking-wider">Selfie Video Liveness Mock</span>
                            <div className="h-28 rounded-lg bg-black border border-border flex items-center justify-center relative overflow-hidden">
                              <span className="material-symbols-outlined text-[36px] text-white/50 animate-pulse">videocam</span>
                              <div className="absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                                LIVENESS
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleApproveKYC(selectedUserProfile.username)}
                              disabled={selectedUserProfile.kycStatus === "approved"}
                              className="flex-1 bg-success hover:opacity-95 text-white py-2 rounded-full font-bold text-[11px] transition shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              Approve KYC & Verify
                            </button>
                            <button
                              onClick={() => handleRejectKYC(selectedUserProfile.username)}
                              disabled={selectedUserProfile.kycStatus === "rejected"}
                              className="flex-1 bg-accent hover:opacity-95 text-white py-2 rounded-full font-bold text-[11px] transition shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              Reject Request
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* System Email Dispatch HUD */}
                  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-1.5 select-none">
                      <span className="material-symbols-outlined text-[18px] text-primary">mail</span>
                      Auditor System Email Dispatch
                    </h4>
                    <form onSubmit={handleSendEmail} className="space-y-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Email Subject (e.g. System Warning Notice)"
                          value={emailSubject}
                          onChange={e => setEmailSubject(e.target.value)}
                          required
                          className="w-full bg-background border border-border rounded-xl text-xs font-bold px-3.5 py-2 text-text-main outline-none focus:border-primary placeholder-text-muted animate-fade-in"
                        />
                      </div>
                      <div>
                        <textarea
                          placeholder="Type system warning message or audit details to deliver to the user's registered inbox..."
                          value={emailBody}
                          onChange={e => setEmailBody(e.target.value)}
                          required
                          rows={3}
                          className="w-full bg-background border border-border rounded-xl text-xs font-semibold px-3.5 py-2 text-text-main outline-none focus:border-primary placeholder-text-muted resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sendingEmail}
                        className="w-full bg-primary hover:opacity-95 text-white py-2 rounded-full text-[11px] font-black tracking-wider uppercase transition shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                      >
                        {sendingEmail ? "Transmitting Signal..." : "Transmit System Email"}
                      </button>
                    </form>
                  </div>

                  {/* Destructive Administrative Actions */}
                  <div className="bg-surface border border-red-500/20 bg-red-500/5 rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-red-500 tracking-wider flex items-center gap-1.5 select-none">
                        <span className="material-symbols-outlined text-[18px] text-red-500">gavel</span>
                        Destructive Auditor Actions
                      </h4>
                      <p className="text-[10px] text-text-muted mt-1 leading-normal max-w-[480px]">
                        Suspend blocks the account immediately. Purge permanently deletes the account and all associated records from the database.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleBlockAccount}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-sm cursor-pointer whitespace-nowrap"
                      >
                        Block / Suspend Account
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-sm cursor-pointer whitespace-nowrap"
                      >
                        Purge & Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODULE 3: MODERATION QUEUE */}
          {activeModule === "content" && (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              {/* Flagged Posts list */}
              <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2 max-h-[600px] overflow-y-auto no-scrollbar">
                <p className="text-[10px] font-black uppercase text-text-muted tracking-wider pb-2 border-b border-border/80 mb-2">Pending Policy Audits</p>
                {flaggedPosts.map(p => {
                  const isSelected = selectedPostId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPostId(p.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-text-muted bg-transparent"
                      }`}
                    >
                      <div className="h-10 w-10 shrink-0 bg-background border border-border rounded-lg flex items-center justify-center text-[10px] text-text-muted relative overflow-hidden">
                        {p.mediaUrl ? (
                          <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          "Text"
                        )}
                        {p.aiScore >= 90 && (
                          <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-text-main truncate leading-none">@{p.creatorUsername}</p>
                        <p className="text-[9px] text-text-muted mt-1 leading-none truncate">Score: {p.aiScore}% • {p.decision}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Moderation Details */}
              {selectedPostProfile && (
                <div className="space-y-6 animate-fade-in">
                  {/* Main Details and View */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Media Preview Box */}
                    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-text-muted tracking-wider select-none">Media Payload</p>
                        <div className="h-56 bg-background border border-border rounded-xl flex items-center justify-center overflow-hidden">
                          {selectedPostProfile.mediaUrl ? (
                            <img src={selectedPostProfile.mediaUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="p-4 text-center max-w-[240px]">
                              <span className="material-symbols-outlined text-[32px] text-text-muted">notes</span>
                              <p className="text-xs text-text-muted mt-1 font-bold leading-normal">
                                "{selectedPostProfile.content}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleModerationDecision(selectedPostProfile.id, "approved")}
                          className={`flex-1 min-w-[70px] py-2 rounded-full text-[10px] font-black cursor-pointer border transition ${
                            selectedPostProfile.decision === "approved"
                              ? "bg-success text-white border-success"
                              : "border-border text-text-muted hover:border-success hover:text-success"
                          }`}
                        >
                          Approve Post
                        </button>
                        <button
                          onClick={() => handleModerationDecision(selectedPostProfile.id, "age_gate")}
                          className={`flex-1 min-w-[70px] py-2 rounded-full text-[10px] font-black cursor-pointer border transition ${
                            selectedPostProfile.decision === "age_gate"
                              ? "bg-primary text-white border-primary"
                              : "border-border text-text-muted hover:border-primary hover:text-primary"
                          }`}
                        >
                          Apply 18+
                        </button>
                        <button
                          onClick={() => handleModerationDecision(selectedPostProfile.id, "shadowbanned")}
                          className={`flex-1 min-w-[70px] py-2 rounded-full text-[10px] font-black cursor-pointer border transition ${
                            selectedPostProfile.decision === "shadowbanned"
                              ? "bg-accent text-white border-accent"
                              : "border-border text-text-muted hover:border-accent hover:text-accent"
                          }`}
                        >
                          Shadowban
                        </button>
                        <button
                          onClick={() => handleModerationDecision(selectedPostProfile.id, "hidden")}
                          className={`flex-1 min-w-[70px] py-2 rounded-full text-[10px] font-black cursor-pointer border transition ${
                            selectedPostProfile.decision === "hidden"
                              ? "bg-red-500 text-white border-red-500"
                              : "border-border text-text-muted hover:border-red-500 hover:text-red-500"
                          }`}
                        >
                          Hide Post
                        </button>
                      </div>
                    </div>

                    {/* Report Audit */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-1.5 select-none">
                          <span className="material-symbols-outlined text-[18px] text-accent animate-pulse">warning</span>
                          Report Metadata & AI Audit
                        </h4>

                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between border-b border-border/80 pb-1.5">
                            <span className="text-text-muted">Creator ID</span>
                            <span className="font-bold text-text-main font-mono">@{selectedPostProfile.creatorUsername}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/80 pb-1.5">
                            <span className="text-text-muted">Report Reason</span>
                            <span className="font-bold text-accent">{selectedPostProfile.reason}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/80 pb-1.5">
                            <span className="text-text-muted">Reported By</span>
                            <span className="font-bold text-text-main">{selectedPostProfile.reportedBy}</span>
                          </div>
                          <div className="flex justify-between pb-1 items-center">
                            <span className="text-text-muted">AI Risk Probability</span>
                            <span className={`font-black text-xs px-2.5 py-0.5 rounded-full ${
                              selectedPostProfile.aiScore >= 90 ? "bg-red-500/15 text-red-500 animate-pulse" : "bg-accent/15 text-accent"
                            }`}>
                              {selectedPostProfile.aiScore}%
                            </span>
                          </div>
                        </div>

                        {/* AI Breakdown bars */}
                        <div className="border border-border rounded-xl p-3 bg-background space-y-2">
                          <span className="text-[9px] font-black uppercase text-text-muted tracking-wider block">AI Classification Scores</span>
                          {[
                            { label: "Nudity", value: selectedPostProfile.aiBreakdown.nudity, color: "bg-red-500" },
                            { label: "Violence", value: selectedPostProfile.aiBreakdown.violence, color: "bg-orange-500" },
                            { label: "Spam Link", value: selectedPostProfile.aiBreakdown.spam, color: "bg-accent" },
                            { label: "Copyright Match", value: selectedPostProfile.aiBreakdown.copyright, color: "bg-primary" },
                          ].map(bar => (
                            <div key={bar.label} className="space-y-1">
                              <div className="flex justify-between text-[9px] font-bold">
                                <span className="text-text-muted">{bar.label}</span>
                                <span className="text-text-main font-mono">{bar.value}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-border">
                                <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Comments feed */}
                      <div className="border border-border rounded-xl p-4 bg-background max-h-[120px] overflow-y-auto no-scrollbar space-y-2">
                        <span className="text-[9px] font-black uppercase text-text-muted tracking-wider block border-b border-border/60 pb-1 mb-2">Recent Post Comments</span>
                        {selectedPostProfile.comments.map((comm, idx) => (
                          <div key={idx} className="text-[10px] text-text-main bg-surface p-2 rounded-lg border border-border">
                            {comm}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODULE 4: HELP DESK & APPEALS */}
          {activeModule === "appeals" && (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              {/* Ticket selector list */}
              <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2 max-h-[600px] overflow-y-auto no-scrollbar">
                <p className="text-[10px] font-black uppercase text-text-muted tracking-wider pb-2 border-b border-border/80 mb-2">Active Appeals</p>
                {appeals.map(a => {
                  const isSelected = selectedAppealId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAppealId(a.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-text-muted bg-transparent"
                      }`}
                    >
                      <img src={a.avatar} alt="" className="h-9 w-9 rounded-full object-cover border border-border shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-text-main truncate leading-none">@{a.username}</p>
                        <p className="text-[9px] text-text-muted mt-1 leading-none truncate">{a.type} • {a.status}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Appeal profile details */}
              {selectedAppealProfile && (
                <div className="space-y-6 animate-fade-in">
                  {/* Summary */}
                  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <h3 className="text-sm font-black text-text-main">{selectedAppealProfile.type}</h3>
                        <p className="text-[10px] text-text-muted mt-0.5">Ticket ID: {selectedAppealProfile.id} • Created: {selectedAppealProfile.createdAt}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase ${
                        selectedAppealProfile.status === "pending" ? "bg-accent/15 text-accent animate-pulse" : selectedAppealProfile.status === "resolved" ? "bg-success/15 text-success" : "bg-red-500/15 text-red-500"
                      }`}>
                        {selectedAppealProfile.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-2">
                      <span className="text-text-muted block font-bold select-none">Appeal Statement / Description</span>
                      <p className="text-text-main bg-background border border-border rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
                        {selectedAppealProfile.description}
                      </p>
                    </div>
                  </div>

                  {/* Verification comparison check & Logs */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Selfie Biometrics Compare & Recovery Steps */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between bg-surface">
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-1.5 select-none">
                          <span className="material-symbols-outlined text-[18px] text-primary">face</span>
                          Recovery Selfie & Account Restoration
                        </h4>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Verify user identity biometrics and execute step-by-step credentials reset override.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 bg-background border border-border rounded-xl text-center relative overflow-hidden">
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-text-muted font-bold block">Live Selfie ID</span>
                          <div className="h-20 rounded bg-black/60 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px] text-white/40 animate-pulse">videocam</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-text-muted font-bold block">Original Profile</span>
                          <div className="h-20 rounded bg-cover bg-center" style={{ backgroundImage: `url(${selectedAppealProfile.avatar})` }} />
                        </div>
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center select-none">
                          <span className="text-white text-xs font-black tracking-wider uppercase bg-primary px-3 py-1 rounded-full shadow-sm">
                            {selectedAppealProfile.selfieMatchScore}% match
                          </span>
                          <span className="text-white text-[9px] font-bold mt-1.5 leading-none">Automated Biometric Confidence</span>
                        </div>
                      </div>

                      {/* Interactive Restoration Wizard (Systemic Feature) */}
                      {selectedAppealProfile.type === "Hacked Account Recovery" && (
                        <div className="border border-border rounded-xl p-3 bg-background space-y-2 mt-2">
                          <span className="text-[9px] font-black uppercase text-text-muted tracking-wider block">Account Recovery Wizard</span>
                          <div className="flex justify-between text-[9px] font-black uppercase">
                            <span className={selectedAppealProfile.recoveryStep >= 1 ? "text-success" : "text-text-muted"}>1. ID</span>
                            <span className={selectedAppealProfile.recoveryStep >= 2 ? "text-success" : "text-text-muted"}>2. Flush</span>
                            <span className={selectedAppealProfile.recoveryStep >= 3 ? "text-success" : "text-text-muted"}>3. Reset</span>
                            <span className={selectedAppealProfile.recoveryStep >= 4 ? "text-success" : "text-text-muted"}>4. Done</span>
                          </div>
                          <div className="h-1 bg-border rounded-full flex overflow-hidden">
                            <div className="bg-success transition-all duration-300" style={{ width: `${selectedAppealProfile.recoveryStep * 25}%` }} />
                          </div>
                          <button
                            onClick={() => handleAdvanceRecoveryStep(selectedAppealProfile.id)}
                            disabled={selectedAppealProfile.status !== "pending"}
                            className="w-full bg-primary/10 border border-primary/20 text-primary py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-primary hover:text-white transition cursor-pointer disabled:opacity-50"
                          >
                            {selectedAppealProfile.recoveryStep === 0 && "Start Recovery Steps"}
                            {selectedAppealProfile.recoveryStep > 0 && selectedAppealProfile.recoveryStep < 4 && `Advance to Step ${selectedAppealProfile.recoveryStep + 1}`}
                            {selectedAppealProfile.recoveryStep === 4 && "Recovery Fully Completed"}
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleResolveAppeal(selectedAppealProfile.id, "resolved")}
                          disabled={selectedAppealProfile.status !== "pending"}
                          className="flex-1 bg-success hover:opacity-95 text-white py-2 rounded-full font-bold text-[11px] transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          Verify & Approve
                        </button>
                        <button
                          onClick={() => handleResolveAppeal(selectedAppealProfile.id, "rejected")}
                          disabled={selectedAppealProfile.status !== "pending"}
                          className="flex-1 bg-accent hover:opacity-95 text-white py-2 rounded-full font-bold text-[11px] transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          Deny Appeal
                        </button>
                      </div>
                    </div>

                    {/* Timeline Audit Logs */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-1.5 select-none">
                        <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                        Account Action Log Timeline
                      </h4>

                      <div className="space-y-3.5 relative border-l border-border/80 ml-2.5 pl-4 py-1 text-xs">
                        {selectedAppealProfile.auditLogs.map((log, idx) => (
                          <div key={idx} className="relative">
                            <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                            <p className="text-text-muted text-[10px] font-bold">{log.split(" - ")[0]}</p>
                            <p className="text-text-main mt-0.5 leading-relaxed font-semibold">{log.split(" - ")[1]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODULE 5: SECURITY & BOTS ROOM */}
          {activeModule === "security" && (
            <div className="space-y-6">
              {/* Bot-net Attack Header Widget */}
              <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-text-main uppercase tracking-tight flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[20px] ${
                      threatLevel === "CRITICAL" ? "text-red-500 animate-pulse" : "text-success"
                    }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      shield_alert
                    </span>
                    Anti-Abuse Bot-net Control
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-normal max-w-[480px]">
                    Suspicious automated accounts are quarantined by the network audit layer. Run a Mass Ban script to suspend fake nodes instantly.
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Abusive Bot Nodes</p>
                    <p className="text-xl font-black text-accent">{botCount.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={handleMassBan}
                    disabled={botCount === 0}
                    className="bg-accent hover:opacity-95 text-white px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase transition shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                  >
                    Mass Ban Bot-net
                  </button>
                </div>
              </div>

              {/* Scrolling Terminal Simulator */}
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-border/80 pb-2">
                  <h4 className="text-xs font-black uppercase text-text-main tracking-wider select-none">
                    Live Security Shield Logs
                  </h4>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black text-accent uppercase tracking-wider animate-pulse">
                    Streaming
                  </span>
                </div>
                <div className="h-48 rounded-xl bg-neutral-900 border border-neutral-800 p-4 font-mono text-[10px] text-emerald-400 overflow-y-auto no-scrollbar space-y-1.5 shadow-inner">
                  {terminalLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed hover:bg-neutral-800/40 px-1 rounded transition-colors select-text">
                      {log}
                    </div>
                  ))}
                  <div ref={terminalBottomRef} />
                </div>
              </div>

              {/* Alerts feed */}
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase text-text-main tracking-wider select-none border-b border-border/80 pb-2">
                  Real-time Spam Spike Activity Log
                </h4>

                {spamAlerts.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <span className="material-symbols-outlined text-[54px] text-success" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <p className="text-sm font-black text-text-main">Cleanroom Secure: No Active Threats</p>
                    <p className="text-xs text-text-muted max-w-[280px] mx-auto leading-relaxed">
                      All bot alerts have been neutralized. Spam activity is within baseline parameters.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    {spamAlerts.map(alert => (
                      <article key={alert.id} className="border border-border rounded-xl p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-background">
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined text-[24px] ${
                            alert.severity === "critical" ? "text-red-500 animate-pulse" : "text-accent"
                          }`}>
                            warning
                          </span>
                          <div>
                            <p className="text-xs font-black text-text-main">
                              @{alert.username}
                              <span className={`ml-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                alert.severity === "critical" ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-accent/10 text-accent"
                              }`}>
                                {alert.severity}
                              </span>
                            </p>
                            <p className="text-[10px] text-text-muted mt-1 leading-none font-bold">
                              Type: {alert.type} • rate: {alert.value}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-between">
                          <span className="text-[10px] font-bold text-text-muted font-mono">{alert.timestamp}</span>
                          <button
                            onClick={() => handleBanSingleBot(alert.username)}
                            className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                          >
                            Ban User
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE 6: PLATFORM SETTINGS */}
          {activeModule === "settings" && (
            <section className="bg-surface border border-border rounded-2xl p-5 space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-xs font-black uppercase text-text-main tracking-wider">Monetization & Signups Parameters</h2>
                <p className="text-[10px] font-semibold text-text-muted">Adjust system rules and verification parameters.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Platform fee */}
                <label className="border border-border rounded-xl p-4 flex flex-col justify-between gap-3 bg-background">
                  <div className="flex justify-between items-center select-none border-b border-border/60 pb-2">
                    <span className="text-xs font-black text-text-main">Platform Revenue Share</span>
                    <span className="text-xs font-black text-primary">{settings.platformFee}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="35"
                    value={settings.platformFee}
                    onChange={e => handleUpdateSetting("platformFee", Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer mt-2"
                  />
                  <span className="text-[10px] text-text-muted">Fee deducted from creator PPV sales and subscriptions.</span>
                </label>

                {/* Maximum PPV price */}
                <label className="border border-border rounded-xl p-4 flex flex-col justify-between gap-3 bg-background">
                  <div className="flex justify-between items-center select-none border-b border-border/60 pb-2">
                    <span className="text-xs font-black text-text-main">Max PPV Post Price Limit</span>
                    <span className="text-xs font-black text-primary font-mono">₹{settings.maxPpvPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="99"
                    max="2499"
                    value={settings.maxPpvPrice}
                    onChange={e => handleUpdateSetting("maxPpvPrice", Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer mt-2"
                  />
                  <span className="text-[10px] text-text-muted">Maximum price creators can assign to single pay-to-unlock post.</span>
                </label>

                {/* Switches */}
                {[
                  { key: "newSignups", label: "Allow Registration for Visitors" },
                  { key: "creatorVerification", label: "Perform Automatic KYC Validations" },
                  { key: "autoPayouts", label: "Auto-approve creator payouts" },
                  { key: "liveMonitoring", label: "Live Streams active threat filter" },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between border border-border bg-background rounded-xl p-4 cursor-pointer hover:border-primary/50 transition">
                    <div>
                      <span className="text-xs font-black text-text-main block">{item.label}</span>
                      <span className="text-[10px] text-text-muted mt-1 block">Toggle database registration / checks</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[item.key as keyof PlatformSettings] as boolean}
                      onChange={e => handleUpdateSetting(item.key as keyof PlatformSettings, e.target.checked)}
                      className="h-4.5 w-4.5 accent-primary cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* ── MODULE 7: AUDIT LOGS ── */}
          {activeModule === "audit_logs" && (
            <AuditLogsModule adminUser={adminUser} showToast={showToast} />
          )}

          {/* ── MODULE 8: STAFF MANAGER (admin only) ── */}
          {activeModule === "staff_manager" && adminUser?.role === "admin" && (
            <StaffManagerModule adminUser={adminUser} showToast={showToast} />
          )}
        </div>
      </main>

      {/* Operations Center Custom Toast */}
      {adminToast && (
        <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-cyan-500/20 bg-slate-900 px-6 py-3 shadow-2xl select-none animate-fade-in">
          <span className="material-symbols-outlined text-cyan-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield
          </span>
          <span className="text-xs font-bold tracking-wide text-white">
            {adminToast}
          </span>
        </div>
      )}
    </div>
  );
}
// ─── Audit Logs Module ────────────────────────────────────────────────────────

type AuditLog = {
  id: string;
  adminUsername: string;
  adminRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: any;
  createdAt: string;
};

function AuditLogsModule({ adminUser, showToast }: { adminUser: any; showToast: (m: string) => void }) {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterAdmin, setFilterAdmin] = React.useState("");
  const [filterAction, setFilterAction] = React.useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterAdmin) params.set("admin", filterAdmin);
      if (filterAction) params.set("action", filterAction);
      const data = await apiClient.get<AuditLog[]>(`/admin/audit-logs?${params}`);
      setLogs(data || []);
    } catch (err: any) {
      showToast("Failed to load audit logs: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadLogs(); }, []);

  const getActionColor = (action: string) => {
    if (action.startsWith("auth.")) return "text-cyan-400";
    if (action.includes("deleted") || action.startsWith("security.")) return "text-red-400";
    if (action.startsWith("user.")) return "text-violet-400";
    if (action.startsWith("content.")) return "text-amber-400";
    if (action.startsWith("platform.")) return "text-orange-400";
    if (action.startsWith("staff.")) return "text-emerald-400";
    return "text-text-muted";
  };

  const exportCSV = () => {
    const rows = [["Time", "Admin", "Role", "Action", "Target Type", "Target ID"]];
    logs.forEach(l => rows.push([l.createdAt, l.adminUsername, l.adminRole, l.action, l.targetType, l.targetId]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `audit-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <section className="space-y-5">
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-text-main uppercase tracking-wide">Admin Action History</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Every mutating admin action is permanently recorded in the database</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs font-bold text-text-muted border border-border rounded-lg px-3 py-1.5 hover:border-primary hover:text-primary transition cursor-pointer">
              <span className="material-symbols-outlined text-[15px]">download</span>Export CSV
            </button>
            <button onClick={loadLogs} className="flex items-center gap-1 text-xs font-bold text-primary border border-primary/20 bg-primary/5 rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition cursor-pointer">
              <span className="material-symbols-outlined text-[15px]">refresh</span>Refresh
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="Filter by admin..." value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)}
            className="flex-1 h-9 bg-background border border-border rounded-lg px-3 text-xs text-text-main outline-none focus:border-primary/50" />
          <input type="text" placeholder="Filter by action (e.g. user.ban)..." value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="flex-1 h-9 bg-background border border-border rounded-lg px-3 text-xs text-text-main outline-none focus:border-primary/50" />
          <button onClick={loadLogs} className="h-9 px-4 bg-primary/10 border border-primary/20 text-primary font-bold text-xs rounded-lg hover:bg-primary hover:text-white transition cursor-pointer">Search</button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-xs">
            <span className="material-symbols-outlined text-[40px] mb-2 block opacity-30">history</span>
            No audit logs found. Logs appear after admin actions.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 bg-background border border-border/60 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-black ${getActionColor(log.action)}`}>{log.action}</span>
                    {log.targetId && <span className="text-[10px] text-text-muted font-medium bg-surface border border-border/50 rounded-md px-1.5 py-0.5">{log.targetType}: {log.targetId}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-muted">by <strong className="text-text-main">@{log.adminUsername}</strong></span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${log.adminRole === "admin" ? "bg-red-500/10 text-red-400" : log.adminRole === "moderator" ? "bg-violet-500/10 text-violet-400" : "bg-cyan-500/10 text-cyan-400"}`}>{log.adminRole}</span>
                  </div>
                </div>
                <span className="text-[10px] text-text-muted shrink-0 font-mono">{log.createdAt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Staff Manager Module ─────────────────────────────────────────────────────

type StaffMember = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "moderator" | "support";
  totpEnabled: boolean;
  isActive: boolean;
  lastLogin: string;
  lastLoginIp: string;
  createdAt: string;
};

function StaffManagerModule({ adminUser, showToast }: { adminUser: any; showToast: (m: string) => void }) {
  const [staff, setStaff] = React.useState<StaffMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState<"moderator" | "support" | "admin">("moderator");

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<StaffMember[]>("/admin-auth/staff");
      setStaff(data || []);
    } catch (err: any) {
      showToast("Failed to load staff: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadStaff(); }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiClient.post("/admin-auth/staff", { username: newUsername, email: newEmail, password: newPassword, role: newRole });
      showToast(`Staff @${newUsername} created!`);
      setShowCreate(false); setNewUsername(""); setNewEmail(""); setNewPassword(""); setNewRole("moderator");
      await loadStaff();
    } catch (err: any) {
      showToast("Failed: " + (err.message || err));
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string, username: string) => {
    if (!confirm(`Deactivate @${username}?`)) return;
    try {
      await apiClient.delete(`/admin-auth/staff/${id}`);
      showToast(`@${username} deactivated`); await loadStaff();
    } catch (err: any) { showToast("Failed: " + (err.message || err)); }
  };

  const handleReactivate = async (id: string, username: string) => {
    try {
      await apiClient.post(`/admin-auth/staff/${id}/reactivate`);
      showToast(`@${username} reactivated`); await loadStaff();
    } catch (err: any) { showToast("Failed: " + (err.message || err)); }
  };

  const handleChangeRole = async (id: string, username: string, role: string) => {
    try {
      await apiClient.put(`/admin-auth/staff/${id}/role`, { role });
      showToast(`@${username} → ${role}`); await loadStaff();
    } catch (err: any) { showToast("Failed: " + (err.message || err)); }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-400 border-red-500/20",
    moderator: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    support: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  return (
    <section className="space-y-5">
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-text-main uppercase tracking-wide">Staff Accounts</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Create login IDs for your moderation and support team</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 text-xs font-black text-white bg-primary rounded-full px-4 py-2 hover:bg-primary/80 transition cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            {showCreate ? "Cancel" : "Create Staff"}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateStaff} className="bg-background border border-border rounded-xl p-4 mb-5 space-y-3">
            <h3 className="text-xs font-black text-text-main uppercase tracking-wide">New Staff Account</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider block mb-1">Username</label>
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required placeholder="staff_username"
                  className="w-full h-10 bg-surface border border-border rounded-lg px-3 text-xs text-text-main outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider block mb-1">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="staff@felbic.com"
                  className="w-full h-10 bg-surface border border-border rounded-lg px-3 text-xs text-text-main outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider block mb-1">Password (min 10)</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={10} placeholder="••••••••••"
                  className="w-full h-10 bg-surface border border-border rounded-lg px-3 text-xs text-text-main outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider block mb-1">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as any)}
                  className="w-full h-10 bg-surface border border-border rounded-lg px-3 text-xs text-text-main outline-none">
                  <option value="moderator">Moderator</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={creating} className="w-full h-10 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/80 transition cursor-pointer disabled:opacity-50">
              {creating ? "Creating..." : "Create Staff Account"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {staff.map(s => (
              <div key={s.id} className={`border rounded-xl p-4 ${s.isActive ? "border-border bg-background" : "border-border/40 bg-background/50 opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                      {s.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-text-main">@{s.username}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${roleColors[s.role]}`}>{s.role}</span>
                        {!s.isActive && <span className="text-[9px] font-black uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">DEACTIVATED</span>}
                        {s.totpEnabled ? <span className="text-[9px] text-emerald-400 font-bold">🔒 2FA Active</span> : <span className="text-[9px] text-amber-400 font-bold">⚠️ No 2FA</span>}
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">{s.email}</p>
                      <p className="text-[10px] text-text-muted/60">{s.lastLogin ? `Last: ${s.lastLogin} · ${s.lastLoginIp || "unknown IP"}` : "Never logged in"}</p>
                    </div>
                  </div>
                  {s.id !== adminUser?.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <select value={s.role} onChange={e => handleChangeRole(s.id, s.username, e.target.value)}
                        className="h-8 bg-surface border border-border rounded-lg px-2 text-[11px] text-text-main outline-none cursor-pointer">
                        <option value="moderator">Moderator</option>
                        <option value="support">Support</option>
                        <option value="admin">Admin</option>
                      </select>
                      {s.isActive
                        ? <button onClick={() => handleDeactivate(s.id, s.username)} className="h-8 px-3 text-[11px] font-bold text-red-400 border border-red-500/20 bg-red-500/5 rounded-lg hover:bg-red-500/10 transition cursor-pointer">Deactivate</button>
                        : <button onClick={() => handleReactivate(s.id, s.username)} className="h-8 px-3 text-[11px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 rounded-lg hover:bg-emerald-500/10 transition cursor-pointer">Reactivate</button>
                      }
                    </div>
                  ) : (
                    <span className="text-[10px] text-primary font-bold bg-primary/5 border border-primary/20 px-2 py-1 rounded-lg shrink-0">You</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
