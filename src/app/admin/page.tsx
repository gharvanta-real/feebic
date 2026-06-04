"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/app/admin/layout";
import { StatCard } from "@/components/admin/StatCard";
import { SparkLine } from "@/components/admin/Charts";
import { SectionCard, SectionHeader, LoadingSpinner } from "@/components/admin/ui";
import {
  adminAnalyticsApi,
  adminUsersApi,
  adminContentApi,
  adminAppealsApi,
  adminSecurityApi,
  adminAuditApi,
  AuditLog,
  OverviewMetrics,
} from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AdminDashboard() {
  const { adminUser } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [creatorCount, setCreatorCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [appealsCount, setAppealsCount] = useState(0);
  const [spamCount, setSpamCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        usersRes,
        flaggedRes,
        appealsRes,
        securityRes,
        logsRes,
        revenueRes,
      ] = await Promise.all([
        adminAnalyticsApi.getOverviewMetrics(),
        adminUsersApi.getAll(),
        adminContentApi.getFlagged(),
        adminAppealsApi.getAll(),
        adminSecurityApi.getAlerts(),
        adminAuditApi.getLogs({ limit: 5 }),
        adminAnalyticsApi.getRevenue(),
      ]);

      setMetrics(metricsRes);
      setUserCount(usersRes?.length || 0);
      setCreatorCount(usersRes?.filter((u) => u.role === "creator" && u.status === "active")?.length || 0);
      setFlaggedCount(flaggedRes?.length || 0);
      setAppealsCount(appealsRes?.filter((a) => a.status === "pending")?.length || 0);
      setSpamCount(securityRes?.length || 0);
      setRecentLogs(logsRes || []);
      setTotalRevenue(revenueRes?.total || 0);
    } catch (err) {
      console.error("Error loading admin dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  // Quick link definitions
  const quickActions = [
    { href: "/admin/users", label: "User Control", icon: "group", color: "cyan" },
    { href: "/admin/content", label: "Moderation", icon: "policy", color: "violet" },
    { href: "/admin/appeals", label: "Appeals Hub", icon: "support_agent", color: "emerald" },
    { href: "/admin/security", label: "Threat Center", icon: "shield", color: "red" },
    { href: "/admin/operations", label: "Control Room", icon: "settings_suggest", color: "amber" },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: "history", color: "blue" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Overview"
        sub="Control center for Felbic operations, security, infrastructure, and user statistics."
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--color-text-main)] bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-full transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh
          </button>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={userCount} icon="group" color="cyan" sub="Registered members" />
        <StatCard label="Active Creators" value={creatorCount} icon="verified" color="violet" sub="Verified creators" />
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon="payments" color="emerald" sub="Gross earnings (INR)" />
        <StatCard label="Flagged Posts" value={flaggedCount} icon="report" color="red" sub="Pending moderation queue" />
        <StatCard label="Open Appeals" value={appealsCount} icon="mail" color="amber" sub="Awaiting resolution" />
        <StatCard label="Spam Alerts" value={spamCount} icon="warning" color="blue" sub="Active bot warning alerts" />
      </div>

      {/* Trend Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard>
          <SectionHeader title="Revenue Trend" sub="Gross billing last 7 cycles" />
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black text-[var(--color-text-main)]">₹{(metrics?.revenueTrend?.[6] || 0).toLocaleString()}</span>
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                +14.2%
              </span>
            </div>
            <div className="h-16 flex items-center justify-center bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2">
              <SparkLine data={metrics?.revenueTrend || [0, 0, 0, 0, 0, 0, 0]} color="emerald" height={50} width={300} />
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader title="User Growth" sub="Daily registrations trend" />
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black text-[var(--color-text-main)]">+{metrics?.growthTrend?.[6] || 0}</span>
              <span className="text-cyan-400 text-xs font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                +8.9%
              </span>
            </div>
            <div className="h-16 flex items-center justify-center bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-2">
              <SparkLine data={metrics?.growthTrend || [0, 0, 0, 0, 0, 0, 0]} color="cyan" height={50} width={300} />
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Spam & Bot Activity" sub="Security threat alerts trend" />
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black text-[var(--color-text-main)]">{metrics?.spamTrend?.[6] || 0}</span>
              <span className="text-red-400 text-xs font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_down</span>
                -12.4%
              </span>
            </div>
            <div className="h-16 flex items-center justify-center bg-red-500/5 border border-red-500/10 rounded-xl p-2">
              <SparkLine data={metrics?.spamTrend || [0, 0, 0, 0, 0, 0, 0]} color="red" height={50} width={300} />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Side-by-Side: Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <SectionCard>
          <SectionHeader title="Quick Navigation" sub="Direct shortcuts to platform control panels" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              // Conditionally hide settings & staff if not admin
              if (action.href === "/admin/settings" && adminUser?.role !== "admin") return null;
              if (action.href === "/admin/staff" && adminUser?.role !== "admin") return null;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--border)]/50 hover:border-[var(--primary)]/40 transition group"
                >
                  <span className="material-symbols-outlined text-[24px] text-[var(--color-text-muted)] group-hover:text-[var(--primary)] transition">
                    {action.icon}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--color-text-main)] text-center">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        {/* Recent Audit Logs */}
        <SectionCard>
          <SectionHeader
            title="Recent Activity"
            sub="Latest operations logged by system administrators"
            action={
              <Link href="/admin/audit-logs" className="text-[10px] font-bold text-[var(--color-primary)] tracking-wider hover:underline">
                View All
              </Link>
            }
          />
          <div className="space-y-3.5">
            {recentLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--color-text-muted)] font-medium">No recent logs found.</div>
            ) : (
              recentLogs.map((log) => {
                // Style action tags
                let tagCls = "bg-[var(--border)] text-[var(--color-text-muted)]";
                if (log.action.startsWith("auth.")) tagCls = "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400";
                if (log.action.startsWith("user.")) tagCls = "bg-violet-500/10 text-violet-700 dark:text-violet-400";
                if (log.action.startsWith("content.")) tagCls = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
                if (log.action.startsWith("security.")) tagCls = "bg-red-500/10 text-red-600 dark:text-red-400";
                if (log.action.startsWith("staff.")) tagCls = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
                if (log.action.startsWith("platform.")) tagCls = "bg-orange-500/10 text-orange-700 dark:text-orange-400";

                return (
                  <div key={log.id} className="flex items-start justify-between gap-3 text-xs leading-tight pb-3 border-b border-[var(--border)]/50 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-[var(--color-text-main)]">@{log.adminUsername}</span>
                        <span className="text-[9px] font-bold text-[var(--color-text-muted)]">({log.adminRole})</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tagCls}`}>
                          {log.action}
                        </span>
                      </div>
                      <p className="text-[var(--color-text-muted)] text-[11px]">
                        Targeted <span className="font-semibold text-[var(--color-text-main)]">{log.targetType}</span> ({log.targetId})
                      </p>
                    </div>
                    <span className="text-[9px] font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
