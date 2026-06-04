"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, SectionHeader, LoadingSpinner } from "@/components/admin/ui";
import { ConfirmModal, PrimaryBtn } from "@/components/admin/controls";
import {
  adminSettingsApi,
  adminBroadcastApi,
  adminSecurityApi,
  PlatformState,
} from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function OperationsPage() {
  const { adminUser, showToast } = useAdminAuth();
  const [loading, setLoading] = useState(true);

  // Platform state config
  const [state, setState] = useState<PlatformState | null>(null);
  const [lockdown, setLockdown] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [reason, setReason] = useState("");
  const [updatingState, setUpdatingState] = useState(false);

  // Broadcast email state
  const [audience, setAudience] = useState<"all" | "creators" | "fans">("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  // Danger actions states
  const [confirmMassBan, setConfirmMassBan] = useState(false);
  const [massBanning, setMassBanning] = useState(false);

  const fetchOperationsData = async () => {
    setLoading(true);
    try {
      const stateRes = await adminSettingsApi.getState();
      if (stateRes) {
        setState(stateRes);
        setLockdown(stateRes.lockdown);
        setMaintenance(stateRes.maintenance);
        setReason(stateRes.reason || "");
      }
    } catch {
      showToast("Failed to fetch current operations state", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
  }, []);

  const handleUpdatePlatformState = async () => {
    if (adminUser?.role !== "admin") {
      showToast("Administrator role required to change platform state", "warning");
      return;
    }
    setUpdatingState(true);
    try {
      const payload: PlatformState = { lockdown, maintenance, reason };
      await adminSettingsApi.updateState(payload);
      showToast("Platform state has been modified and updated");
      setState({
        ...payload,
        updated_by: adminUser.username,
        updated_at: new Date().toISOString(),
      } as any);
    } catch {
      showToast("Failed to update platform operational state", "error");
    } finally {
      setUpdatingState(false);
    }
  };

  const handleSendEmailSubmit = async () => {
    if (adminUser?.role !== "admin") {
      showToast("Administrator role required to send broadcasts", "warning");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await adminBroadcastApi.sendEmail(subject, body, audience);
      showToast(`System broadcast successfully sent to ${res.recipient_count} recipients.`);
      setSubject("");
      setBody("");
      setConfirmEmail(false);
    } catch {
      showToast("Failed to compile or transmit email broadcast", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMassBanSubmit = async () => {
    if (adminUser?.role !== "admin") {
      showToast("Administrator role required to run bulk bans", "warning");
      return;
    }
    setMassBanning(true);
    try {
      await adminSecurityApi.massBan();
      showToast("Mass bot account suspension executed successfully.");
      setConfirmMassBan(false);
    } catch {
      showToast("Failed to run mass bot suspension", "error");
    } finally {
      setMassBanning(false);
    }
  };

  // Recipient estimations
  const recipientCount = {
    all: "~12,450 users",
    creators: "~840 creators",
    fans: "~11,610 fans",
  }[audience];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operations Control Room"
        sub="Platform emergency triggers, global announcements broadcast engines, and platform live/lockdown management status."
      />

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform state Card */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard>
              <SectionHeader title="Platform Live State & Lockdown" sub="Toggle platform live operational access." />

              <div className="space-y-5 text-xs">
                {/* Big status alert banner */}
                <div className={`p-4 border rounded-2xl flex items-center gap-3.5 ${
                  state?.lockdown
                    ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-800 dark:text-red-400"
                    : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-800 dark:text-emerald-400"
                }`}>
                  <span className="material-symbols-outlined text-[28px] animate-pulse">
                    {state?.lockdown ? "gpp_bad" : "verified_user"}
                  </span>
                  <div>
                    <p className="font-black tracking-wider text-[var(--color-text-main)]">
                      Platform Status: {state?.lockdown ? "LOCKED DOWN" : "LIVE & SECURED"}
                    </p>
                    {state?.reason && <p className="text-[10px] mt-0.5 text-[var(--color-text-muted)] font-medium">Reason: {state.reason}</p>}
                    <p className="text-[9px] text-[var(--color-text-muted)] mt-1">
                      Last adjusted by: <span className="font-semibold text-[var(--color-text-main)]">@{(state as any)?.updated_by || "system"}</span> at{" "}
                      {new Date((state as any)?.updated_at || Date.now()).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Lockdown Toggle */}
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-main)] tracking-wide">Emergency Lockdown Mode</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                      Prevent all financial payouts, suspend creator stream initiations, stop wallet balance withdrawals, and block regular logins.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={adminUser?.role !== "admin"}
                      checked={lockdown}
                      onChange={(e) => setLockdown(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[var(--surface)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--color-text-muted)] peer-checked:after:bg-[var(--color-primary)] after:border-[var(--border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--color-primary)]/10 peer-checked:border-[var(--color-primary)]/30" />
                  </label>
                </div>

                {/* Maintenance Toggle */}
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-main)] tracking-wide">Under Maintenance Mode</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                      Displays a 'System Maintenance' splash screen to web/mobile users. Staff and admin accounts can bypass to run diagnostics.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={adminUser?.role !== "admin"}
                      checked={maintenance}
                      onChange={(e) => setMaintenance(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[var(--surface)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--color-text-muted)] peer-checked:after:bg-[var(--color-primary)] after:border-[var(--border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--color-primary)]/10 peer-checked:border-[var(--color-primary)]/30" />
                  </label>
                </div>

                {/* Reason Text */}
                {(lockdown || maintenance) && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Lockdown / Maintenance Reason Explanation</label>
                    <input
                      type="text"
                      disabled={adminUser?.role !== "admin"}
                      placeholder="e.g. Server core upgrade or security incident remediation"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
                    />
                  </div>
                )}

                {/* Submit State */}
                {adminUser?.role === "admin" && (
                  <div className="border-t border-[var(--border)]/50 pt-4 mt-2">
                    <PrimaryBtn onClick={handleUpdatePlatformState} loading={updatingState} className="w-full">
                      Commit platform operational state change
                      </PrimaryBtn>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* System Broadcast Card */}
            <SectionCard>
              <SectionHeader title="Global Announcement Broadcast" sub="Send mass-email campaigns to platform profiles." />

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Target Recipient Audience</label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as any)}
                      className="w-full h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--color-text-main)] outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-[var(--surface)] text-[var(--color-text-main)]">All Users & Creators</option>
                      <option value="creators" className="bg-[var(--surface)] text-[var(--color-text-main)]">Verified Creators Only</option>
                      <option value="fans" className="bg-[var(--surface)] text-[var(--color-text-main)]">Fans / Regular Accounts Only</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Est. Recipient Reach</label>
                    <div className="w-full h-10 bg-[var(--surface)]/40 border border-[var(--border)] rounded-xl px-3.5 flex items-center font-bold text-[var(--color-text-main)]">
                      {recipientCount}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Email Subject Line</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Important changes to platform terms or scheduled server upgrade downtime"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Announcement Body Text (Supports Plain Text)</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Write the official communication message content..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
                  />
                </div>

                {adminUser?.role === "admin" ? (
                  <button
                    type="button"
                    disabled={!subject || !body}
                    onClick={() => setConfirmEmail(true)}
                    className="w-full h-11 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-black text-xs tracking-wider rounded-full shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    Broadcast System Announcement
                  </button>
                ) : (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold text-center mt-2">🔒 Broadcast permission restricted to Owner accounts.</p>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Sidebar controls */}
          <div className="space-y-6">
            {/* Quick Links with Status */}
            <SectionCard>
              <SectionHeader title="Control Center links" />
              <div className="space-y-3">
                 <Link
                  href="/admin/server"
                  className="flex items-center justify-between p-3 bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-2xl transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-cyan-600 dark:text-cyan-400">memory</span>
                    <span className="text-xs font-bold text-[var(--color-text-main)]">Server Health</span>
                  </div>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </Link>

                <Link
                  href="/admin/storage"
                  className="flex items-center justify-between p-3 bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-2xl transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-violet-600 dark:text-violet-400">cloud_done</span>
                    <span className="text-xs font-bold text-[var(--color-text-main)]">Storage Status</span>
                  </div>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </Link>

                <Link
                  href="/admin/apis"
                  className="flex items-center justify-between p-3 bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-2xl transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">api</span>
                    <span className="text-xs font-bold text-[var(--color-text-main)]">API Endpoint Health</span>
                  </div>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </Link>

                <Link
                  href="/admin/audit-logs"
                  className="flex items-center justify-between p-3 bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-2xl transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-orange-600 dark:text-orange-400">history</span>
                    <span className="text-xs font-bold text-[var(--color-text-main)]">Administrative Audits</span>
                  </div>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </Link>
              </div>
            </SectionCard>

            {/* Danger Zone Actions */}
            <SectionCard className="border-red-500/20 bg-red-500/[0.01]">
              <SectionHeader title="Control Danger Zone" />
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-red-400 tracking-wider">Execute Mass Threat Suspension</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                    Trigger platform security scripts to review follow and comment spikes, immediately suspending matching accounts flagged by threat filters.
                  </p>
                  {adminUser?.role === "admin" ? (
                    <button
                      onClick={() => setConfirmMassBan(true)}
                      className="w-full h-10 mt-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black tracking-wider rounded-xl shadow-lg transition cursor-pointer"
                    >
                      Suspend Flagged Threat Bots
                    </button>
                  ) : (
                    <p className="text-[9px] text-[var(--color-text-muted)] font-medium leading-normal bg-[var(--surface)] p-2 border border-[var(--border)] rounded-xl mt-1.5">
                      🔒 Require full admin privileges to run.
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ConfirmModal: Broadcast Email */}
      <ConfirmModal
        open={confirmEmail}
        onClose={() => setConfirmEmail(false)}
        onConfirm={handleSendEmailSubmit}
        loading={sendingEmail}
        title="Confirm Global Email Broadcast"
        message={`Are you sure you want to broadcast this announcement email to ${recipientCount}? This action triggers background email queue tasks sending messages to registered emails. Double-check subject and content formatting.`}
        confirmLabel="Initiate Broadcast Transmission"
        confirmVariant="primary"
      />

      {/* ConfirmModal: Mass Ban */}
      <ConfirmModal
        open={confirmMassBan}
        onClose={() => setConfirmMassBan(false)}
        onConfirm={handleMassBanSubmit}
        loading={massBanning}
        title="CRITICAL: Run Bulk Threat Bans"
        message="Warning: This triggers bulk query actions that permanently deactivates credentials, invalidates sessions, and restricts wallets for all flagged bots currently registered by security systems. Proceed?"
        confirmLabel="Execute Bulk Suspensions"
        confirmVariant="danger"
      />
    </div>
  );
}
