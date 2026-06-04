"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, SectionHeader, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/admin/Badge";
import { ActionBtn, ConfirmModal, PrimaryBtn } from "@/components/admin/controls";
import {
  adminSecurityApi,
  adminUsersApi,
  adminAuditApi,
  adminSettingsApi,
  SpamAlert,
  AuditLog,
  PlatformState,
} from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function SecurityPage() {
  const { adminUser, showToast } = useAdminAuth();
  const [alerts, setAlerts] = useState<SpamAlert[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [state, setState] = useState<PlatformState | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & triggers
  const [banUser, setBanUser] = useState<string | null>(null);
  const [banning, setBanning] = useState(false);

  const [confirmMassBan, setConfirmMassBan] = useState(false);
  const [massBanning, setMassBanning] = useState(false);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [alertsRes, logsRes, stateRes] = await Promise.all([
        adminSecurityApi.getAlerts(),
        adminAuditApi.getLogs({ action: "security", limit: 10 }),
        adminSettingsApi.getState(),
      ]);

      setAlerts(alertsRes || []);
      setLogs(logsRes || []);
      setState(stateRes || null);
    } catch {
      showToast("Failed to fetch platform security configurations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();

    // Auto-refresh alerts and logs every 30 seconds
    const interval = setInterval(() => {
      adminSecurityApi.getAlerts().then(setAlerts).catch(console.error);
      adminAuditApi.getLogs({ action: "security", limit: 10 }).then(setLogs).catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Compute threat stats counts
  const stats = useMemo(() => {
    const activeBots = alerts.length;
    const comments = alerts.filter((a) => a.type === "comment_spike").length;
    const dms = alerts.filter((a) => a.type === "dm_spike").length;
    const follows = alerts.filter((a) => a.type === "follow_spike").length;
    return { activeBots, comments, dms, follows };
  }, [alerts]);

  const handleBanUserSubmit = async () => {
    if (!banUser) return;
    setBanning(true);
    try {
      await adminUsersApi.updateStatus(banUser, "suspended");
      showToast(`Account @${banUser} suspended for bot activity.`);
      setAlerts((prev) => prev.filter((a) => a.username !== banUser));
      setBanUser(null);
    } catch {
      showToast(`Failed to suspend @${banUser}`, "error");
    } finally {
      setBanning(false);
    }
  };

  const handleMassBanSubmit = async () => {
    setMassBanning(true);
    try {
      await adminSecurityApi.massBan();
      showToast("Mass bot account suspension executed successfully.");
      setAlerts([]);
      setConfirmMassBan(false);
    } catch {
      showToast("Failed to run mass bot suspension", "error");
    } finally {
      setMassBanning(false);
    }
  };

  // Alert Icon Helper
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "comment_spike":
        return "comment_bank";
      case "dm_spike":
        return "chat_bubble";
      case "follow_spike":
        return "person_add";
      default:
        return "warning";
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Security & Threat Center"
        sub="Audit live platform spam metrics, track follow/comment spikes, monitor active bot warnings, and execute defensive lockdowns."
        actions={
          <div className="flex gap-2">
            <button
              onClick={loadSecurityData}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--color-text-main)] bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-full transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Refresh Logs
            </button>
            {adminUser?.role === "admin" && (
              <button
                disabled={alerts.length === 0}
                onClick={() => setConfirmMassBan(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-full transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                Mass Ban Bots
              </button>
            )}
          </div>
        }
      />

      {/* Threat Stats Summary Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Active Bot Warnings</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.activeBots}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-red-600 dark:text-red-400">smart_toy</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Comment Spikes</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.comments}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-amber-700 dark:text-amber-400">forum</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">DM Spikes</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.dms}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-violet-600 dark:text-violet-400">mail</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Follow Spikes</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.follows}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-cyan-600 dark:text-cyan-400">person_add</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Threat Alerts List */}
        <div className="lg:col-span-2">
          <SectionCard>
            <SectionHeader
              title="Live Spam & Bot Alerts"
              sub="Real-time warning anomalies. Auto-refreshing every 30 seconds."
            />

            {loading ? (
              <LoadingSpinner size="md" />
            ) : alerts.length === 0 ? (
              <EmptyState icon="security" message="No threat anomalies detected" sub="Automated spam filters are running clean." />
            ) : (
              <div className="divide-y divide-[var(--color-border)]/50">
                {alerts.map((alert) => (
                  <div key={alert.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{getAlertIcon(alert.type)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[var(--color-text-main)] text-xs">@{alert.username}</p>
                          <Badge severity={alert.severity} />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
                          Detected anomaly: <span className="text-[var(--color-text-main)] font-bold">{alert.value}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        onClick={() => setBanUser(alert.username)}
                        className="bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-600 dark:text-red-400 text-[10px] font-black tracking-wider px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Ban Account
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Posture & Recent Logs column */}
        <div className="space-y-6">
          {/* Posture Status Card */}
          <SectionCard>
            <SectionHeader title="Platform Posture" />
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                <div>
                  <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Lockdown State</p>
                  <p className="text-xs font-black tracking-wider mt-1 text-[var(--color-text-main)] flex items-center gap-1.5">
                    {state?.lockdown ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        🔒 Secured / Locked
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        🟢 Live / Secured
                      </>
                    )}
                  </p>
                </div>
                {adminUser?.role === "admin" && (
                  <Link
                    href="/admin/operations"
                    className="bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-[10px] font-black tracking-wider px-3 py-1.5 rounded-xl transition"
                  >
                    Adjust
                  </Link>
                )}
              </div>

              <div className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                <p>Lockdown state prevents unauthorized API creations, restricts database migrations, flags transaction withdrawals, and implements 3FA/TOTP auditing prompts.</p>
              </div>
            </div>
          </SectionCard>

          {/* Recent Security Logs */}
          <SectionCard>
            <SectionHeader title="Recent Security Logs" sub="Audit logs matching security.*" />
            <div className="space-y-3.5">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--color-text-muted)] font-medium">No recent security audits.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-xs leading-tight pb-3 border-b border-[var(--border)]/50 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[var(--color-text-main)]">@{log.adminUsername}</span>
                      <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-red-600 dark:text-red-400 tracking-widest">{log.action}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate">
                      Target: {log.targetType} ({log.targetId})
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ConfirmModal: Ban User */}
      <ConfirmModal
        open={!!banUser}
        onClose={() => setBanUser(null)}
        onConfirm={handleBanUserSubmit}
        loading={banning}
        title="Confirm Bot Account Suspension"
        message={`Are you sure you want to suspend @${banUser}? This action logs them out of all active devices, restricts API access, and hides their creator files and payments.`}
        confirmLabel="Suspend Bot Account"
        confirmVariant="danger"
      />

      {/* ConfirmModal: Mass Ban */}
      <ConfirmModal
        open={confirmMassBan}
        onClose={() => setConfirmMassBan(false)}
        onConfirm={handleMassBanSubmit}
        loading={massBanning}
        title="CRITICAL: Mass Suspend Detected Bots"
        message={`Warning: You are about to initiate a mass suspend audit that blocks ALL ${alerts.length} currently flagged usernames in this session. This action permanently restricts their credentials. Continue?`}
        confirmLabel="Execute Mass Suspension"
        confirmVariant="danger"
      />
    </div>
  );
}
