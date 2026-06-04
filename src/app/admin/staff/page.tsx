"use client";

import React, { useEffect, useState } from "react";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, SectionHeader, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/admin/Badge";
import { ActionBtn, Modal, ConfirmModal, PrimaryBtn } from "@/components/admin/controls";
import { adminAuthApi, StaffMember } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function StaffManagerPage() {
  const { adminUser, showToast } = useAdminAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("support");
  const [creating, setCreating] = useState(false);

  // Status toggle confirmation modal state
  const [confirmToggle, setConfirmToggle] = useState<StaffMember | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await adminAuthApi.getStaff();
      setStaff(data || []);
    } catch {
      showToast("Failed to fetch platform staff list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      showToast("Password must be at least 10 characters long", "warning");
      return;
    }
    setCreating(true);
    try {
      await adminAuthApi.createStaff({ username, email, password, role });
      showToast(`Staff member @${username} created successfully.`);
      setCreateOpen(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("support");
      fetchStaff();
    } catch {
      showToast("Failed to create new staff credentials", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (memberId: string, username: string, newRole: string) => {
    try {
      await adminAuthApi.updateStaffRole(memberId, newRole);
      showToast(`Updated @${username} role permission to ${newRole}`);
      setStaff((prev) =>
        prev.map((s) => (s.id === memberId ? { ...s, role: newRole as any } : s))
      );
    } catch {
      showToast(`Failed to update role for @${username}`, "error");
    }
  };

  const handleDeactivateReactivate = async () => {
    if (!confirmToggle) return;
    setToggling(true);
    try {
      if (confirmToggle.isActive) {
        await adminAuthApi.deactivateStaff(confirmToggle.id);
        showToast(`Deactivated staff credentials for @${confirmToggle.username}`);
      } else {
        await adminAuthApi.reactivateStaff(confirmToggle.id);
        showToast(`Reactivated staff credentials for @${confirmToggle.username}`);
      }
      setStaff((prev) =>
        prev.map((s) => (s.id === confirmToggle.id ? { ...s, isActive: !confirmToggle.isActive } : s))
      );
      setConfirmToggle(null);
    } catch {
      showToast(`Failed to toggle account activation for @${confirmToggle.username}`, "error");
    } finally {
      setToggling(false);
    }
  };

  // Enforce Administrator role constraint
  if (adminUser?.role !== "admin") {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Staff Manager" sub="Configure operational roles and credentials for operations center staff." />
        <SectionCard className="border-red-500/20 bg-red-500/[0.02]">
          <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
            <span className="material-symbols-outlined text-[48px] text-red-400">gavel</span>
            <div>
              <p className="text-sm font-black text-red-400 tracking-wider">Access Denied: Administrator Role Required</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5 max-w-md mx-auto leading-relaxed">
                Your account is currently assigned the role <span className="font-bold text-[var(--color-text-main)]">@{adminUser?.role}</span>. Managing staff credentials and setting role permissions is strictly restricted to platform owners and executive administrators.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff Credentials & Access"
        sub="Create accounts for support agents or moderators, edit permission roles, review 2FA status, and suspend keys."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 rounded-full transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Create Staff
            </button>
            <button
              onClick={fetchStaff}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--color-text-main)] bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-full transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Reload Directory
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Table */}
        <div className="lg:col-span-2">
          <SectionCard>
            <SectionHeader title="Staff Accounts Directory" sub="Monitor active administrators and credentials." />

            {loading ? (
              <LoadingSpinner size="md" />
            ) : staff.length === 0 ? (
              <EmptyState icon="manage_accounts" message="No staff accounts found" />
            ) : (
              <div className="overflow-x-auto -mx-5 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">
                      <th className="py-3 px-5">Staff Member</th>
                      <th className="py-3 px-5">Role Permission</th>
                      <th className="py-3 px-5">2FA / TOTP</th>
                      <th className="py-3 px-5">Last Login IP</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/50">
                    {staff.map((member) => (
                      <tr key={member.id} className="hover:bg-[var(--border)]/10 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 text-[var(--color-primary)] font-black text-sm">
                              {member.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--color-text-main)]">@{member.username}</p>
                              <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-mono">{member.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5" onClick={(e) => e.stopPropagation()}>
                          {member.id === adminUser.id ? (
                            <Badge role={member.role} />
                          ) : (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, member.username, e.target.value)}
                              className="bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--color-text-main)] rounded px-2.5 py-1 outline-none cursor-pointer"
                            >
                              <option value="admin" className="bg-[var(--surface)] text-[var(--color-text-main)]">Administrator</option>
                              <option value="moderator" className="bg-[var(--surface)] text-[var(--color-text-main)]">Moderator</option>
                              <option value="support" className="bg-[var(--surface)] text-[var(--color-text-main)]">Support Agent</option>
                            </select>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1.5 font-semibold">
                            {member.totpEnabled ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                Active
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-[var(--color-text-main)]">{member.lastLoginIp || "Never"}</p>
                          {member.lastLogin && (
                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                              {new Date(member.lastLogin).toLocaleDateString([], { dateStyle: "short" })}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          {member.isActive ? (
                            <span className="inline-flex items-center text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              Suspended
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex justify-end gap-1.5">
                            {member.id !== adminUser.id ? (
                              <button
                                onClick={() => setConfirmToggle(member)}
                                className={`text-[10px] font-black tracking-wider px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                                  member.isActive
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                                }`}
                              >
                                {member.isActive ? "Deactivate" : "Reactivate"}
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-[var(--color-text-muted)] italic pr-2">Self</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Role Explanations */}
        <div>
          <SectionCard>
            <SectionHeader title="Staff Access Matrix" sub="Policy guidelines per operational role definition." />

            <div className="space-y-4 text-xs text-[var(--color-text-muted)] leading-relaxed">
              <div className="p-3 bg-red-500/[0.02] border border-red-500/15 rounded-2xl">
                <p className="font-black text-red-400 tracking-wider mb-1">Platform Administrator</p>
                <p>Full operations permission scope. Capability to alter pricing setting ranges, execute system lockdowns, provision new support agents, update roles, and purge user data accounts.</p>
              </div>

              <div className="p-3 bg-violet-500/[0.02] border border-violet-500/15 rounded-2xl">
                <p className="font-black text-violet-400 tracking-wider mb-1">Content Moderator</p>
                <p>Restricted control room access. Main access centers around the Content Moderation queue and Appeals Ticket resolution steps. Restricted from modifying system fees or staff directories.</p>
              </div>

              <div className="p-3 bg-cyan-500/[0.02] border border-cyan-500/15 rounded-2xl">
                <p className="font-black text-cyan-400 tracking-wider mb-1">Support Agent</p>
                <p>User relations scope. Capabilities restricted to viewing the user directory, processing KYC verification documents, sending notification emails, and force-terminating active sessions.</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Modal: Create Staff */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Provision New Staff Account">
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Username</label>
            <input
              type="text"
              required
              placeholder="e.g. janesupport"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              className="w-full h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. jane@felbic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Initial Password (Min 10 characters)</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Staff Permission Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--color-text-main)] outline-none cursor-pointer"
            >
              <option value="support" className="bg-[var(--surface)] text-[var(--color-text-main)]">Support Agent</option>
              <option value="moderator" className="bg-[var(--surface)] text-[var(--color-text-main)]">Content Moderator</option>
              <option value="admin" className="bg-[var(--surface)] text-[var(--color-text-main)]">Platform Administrator</option>
            </select>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 h-10 bg-transparent border border-[var(--border)] text-[var(--color-text-muted)] font-bold rounded-xl hover:border-[var(--color-text-muted)] transition cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryBtn type="submit" loading={creating} className="flex-1">
              Create Staff Keys
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      {/* ConfirmModal: Deactivate / Reactivate */}
      <ConfirmModal
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={handleDeactivateReactivate}
        loading={toggling}
        title={confirmToggle?.isActive ? "Suspend Staff Credentials" : "Reactivate Staff Credentials"}
        message={`Are you sure you want to ${
          confirmToggle?.isActive ? "deactivate and suspend" : "reactivate"
        } @${confirmToggle?.username}'s account? Suspended members are blocked from logging in or calling API endpoints immediately.`}
        confirmLabel={confirmToggle?.isActive ? "Suspend Account" : "Reactivate Account"}
        confirmVariant={confirmToggle?.isActive ? "danger" : "primary"}
      />
    </div>
  );
}
