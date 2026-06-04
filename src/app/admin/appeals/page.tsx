"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, SectionHeader, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/admin/Badge";
import { ActionBtn, Modal, PrimaryBtn } from "@/components/admin/controls";
import { adminAppealsApi, AppealTicket } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AppealsPage() {
  const { showToast } = useAdminAuth();
  const [appeals, setAppeals] = useState<AppealTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & selection state
  const [activeFilter, setActiveFilter] = useState<"pending" | "resolved" | "rejected">("pending");
  const [selectedAppeal, setSelectedAppeal] = useState<AppealTicket | null>(null);

  // Stepper labels
  const recoverySteps = ["Uninitiated", "Biometric Verified", "Data Flushed", "Account Restored", "Completed"];

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const data = await adminAppealsApi.getAll();
      setAppeals(data || []);
    } catch {
      showToast("Failed to fetch appeals data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  // Compute Stats
  const stats = useMemo(() => {
    const pending = appeals.filter((a) => a.status === "pending").length;
    const resolved = appeals.filter((a) => a.status === "resolved").length;
    const rejected = appeals.filter((a) => a.status === "rejected").length;
    return { pending, resolved, rejected };
  }, [appeals]);

  // Filtered list
  const filteredAppeals = useMemo(() => {
    return appeals.filter((a) => a.status === activeFilter);
  }, [appeals, activeFilter]);

  // Step Incrementor
  const handleAdvanceStep = async (appeal: AppealTicket) => {
    if (appeal.recoveryStep >= 4) return;
    const nextStep = appeal.recoveryStep + 1;
    const nextStatus = nextStep === 4 ? "resolved" : "pending";

    try {
      await adminAppealsApi.update(appeal.id, nextStatus, nextStep);
      showToast(`Appeal for @${appeal.username} advanced to: ${recoverySteps[nextStep]}`);
      
      // Update local state
      setAppeals((prev) =>
        prev.map((a) =>
          a.id === appeal.id ? { ...a, recoveryStep: nextStep, status: nextStatus as any } : a
        )
      );

      // Keep detail view in sync
      if (selectedAppeal?.id === appeal.id) {
        setSelectedAppeal((prev) =>
          prev ? { ...prev, recoveryStep: nextStep, status: nextStatus as any } : null
        );
      }
    } catch {
      showToast("Failed to update appeal recovery step", "error");
    }
  };

  const handleResolve = async (appeal: AppealTicket) => {
    try {
      await adminAppealsApi.update(appeal.id, "resolved", 4);
      showToast(`Appeal ticket for @${appeal.username} marked as RESOLVED.`);
      setAppeals((prev) =>
        prev.map((a) => (a.id === appeal.id ? { ...a, status: "resolved", recoveryStep: 4 } : a))
      );
      if (selectedAppeal?.id === appeal.id) {
        setSelectedAppeal((prev) => (prev ? { ...prev, status: "resolved", recoveryStep: 4 } : null));
      }
    } catch {
      showToast("Failed to resolve appeal ticket", "error");
    }
  };

  const handleReject = async (appeal: AppealTicket) => {
    try {
      await adminAppealsApi.update(appeal.id, "rejected", appeal.recoveryStep);
      showToast(`Appeal ticket for @${appeal.username} has been REJECTED.`);
      setAppeals((prev) =>
        prev.map((a) => (a.id === appeal.id ? { ...a, status: "rejected" } : a))
      );
      if (selectedAppeal?.id === appeal.id) {
        setSelectedAppeal((prev) => (prev ? { ...prev, status: "rejected" } : null));
      }
    } catch {
      showToast("Failed to reject appeal ticket", "error");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Appeals Control Center"
        sub="Review hacked accounts, handle identity validation disputes, process VIP requests, and execute verification restoration steps."
        actions={
          <button
            onClick={fetchAppeals}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 rounded-full transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh Tickets
          </button>
        }
      />

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveFilter("pending")}
          className={`text-left p-4 rounded-2xl border transition ${
            activeFilter === "pending"
              ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40"
              : "bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--color-text-muted)]"
          }`}
        >
          <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Awaiting Staff Review</p>
          <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.pending}</p>
        </button>

        <button
          onClick={() => setActiveFilter("resolved")}
          className={`text-left p-4 rounded-2xl border transition ${
            activeFilter === "resolved"
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--color-text-muted)]"
          }`}
        >
          <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Resolved Tickets</p>
          <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.resolved}</p>
        </button>

        <button
          onClick={() => setActiveFilter("rejected")}
          className={`text-left p-4 rounded-2xl border transition ${
            activeFilter === "rejected"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--color-text-muted)]"
          }`}
        >
          <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Rejected Appeals</p>
          <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.rejected}</p>
        </button>
      </div>

      {/* Split Panel: Ticket List & Sidebar details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard>
            <SectionHeader title={`${activeFilter} Appeals Queue`} sub="Select any appeal request card to review details." />
            
            {loading ? (
              <LoadingSpinner size="md" />
            ) : filteredAppeals.length === 0 ? (
              <EmptyState icon="support_agent" message="No appeals match filters" sub="Review details in other ticket states." />
            ) : (
              <div className="space-y-3.5">
                {filteredAppeals.map((appeal) => {
                  let matchColor = "text-emerald-500 dark:text-emerald-400";
                  if (appeal.selfieMatchScore < 50) matchColor = "text-red-500 dark:text-red-400";
                  else if (appeal.selfieMatchScore < 85) matchColor = "text-amber-500 dark:text-amber-400";

                  const selected = selectedAppeal?.id === appeal.id;

                  return (
                    <div
                      key={appeal.id}
                      onClick={() => setSelectedAppeal(appeal)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        selected
                          ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-text-main)]"
                          : "bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--color-text-muted)] text-[var(--color-text-main)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-black text-sm">
                          {appeal.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--color-text-main)]">@{appeal.username}</p>
                          <span className="inline-block mt-1 text-[9px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-full">
                            {appeal.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs justify-between sm:justify-end">
                        <div>
                          <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Biometric Score</p>
                          <p className={`font-black mt-0.5 ${matchColor}`}>{appeal.selfieMatchScore}% Match</p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Current Stage</p>
                          <p className="font-bold text-[var(--color-text-main)] mt-0.5">{recoverySteps[appeal.recoveryStep]}</p>
                        </div>

                        <span className="material-symbols-outlined text-[16px] text-[var(--color-text-muted)] shrink-0">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Ticket Details Panel */}
        <div>
          {selectedAppeal ? (
            <SectionCard className="sticky top-6 flex flex-col gap-5">
              <SectionHeader title="Appeal Assessment" sub={`Ticket ID: ${selectedAppeal.id}`} />

              {/* Header */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--border)]">
                <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] font-black text-base">
                  {selectedAppeal.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-[var(--color-text-main)]">@{selectedAppeal.username}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Submitted {new Date(selectedAppeal.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Bio selfie match meter */}
              <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-widest mb-1.5">Automated Identity Match</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[var(--surface)] border border-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        selectedAppeal.selfieMatchScore > 80
                          ? "bg-emerald-500"
                          : selectedAppeal.selfieMatchScore > 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${selectedAppeal.selfieMatchScore}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-[var(--color-text-main)] leading-none">{selectedAppeal.selfieMatchScore}%</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-widest mb-1">User Statement</p>
                <p className="text-xs text-[var(--color-text-main)] leading-relaxed italic bg-[var(--background)] p-3 border border-[var(--border)] rounded-2xl">
                  "{selectedAppeal.description}"
                </p>
              </div>

              {/* Stepper Progress */}
              <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-widest mb-3">Recovery Workflow Stepper</p>
                <div className="relative pl-4 space-y-4 border-l border-[var(--border)] ml-2">
                  {recoverySteps.map((step, idx) => {
                    const active = selectedAppeal.recoveryStep === idx;
                    const done = selectedAppeal.recoveryStep > idx;

                    return (
                      <div key={step} className="relative flex items-center gap-3 text-xs leading-none">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-[20.5px] h-3.5 w-3.5 rounded-full flex items-center justify-center border transition ${
                            done
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : active
                              ? "bg-[var(--color-primary)] border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20"
                              : "bg-[var(--surface)] border border-[var(--border)]"
                          }`}
                        >
                          {done && (
                            <span className="material-symbols-outlined text-[9px] font-bold">check</span>
                          )}
                        </div>
                        <span className={`font-bold ${active ? "text-[var(--color-primary)] font-black" : done ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-muted)]"}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audit history logs inside appeal */}
              <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-widest mb-2">Audit Verification Trail</p>
                <div className="bg-[var(--background)] rounded-2xl border border-[var(--border)] p-3 text-[10px] space-y-1.5 leading-relaxed font-mono">
                  {selectedAppeal.auditLogs.map((log, index) => (
                    <p key={index} className="text-[var(--color-text-muted)]">
                      <span className="text-cyan-500">#</span> {log}
                    </p>
                  ))}
                </div>
              </div>

              {/* Action Rows */}
              {selectedAppeal.status === "pending" && (
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-[var(--border)]/50">
                  <PrimaryBtn
                    onClick={() => handleAdvanceStep(selectedAppeal)}
                    disabled={selectedAppeal.recoveryStep >= 4}
                    icon="trending_flat"
                  >
                    Advance Step ({recoverySteps[Math.min(4, selectedAppeal.recoveryStep + 1)]})
                  </PrimaryBtn>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleResolve(selectedAppeal)}
                      className="h-10 rounded-full text-xs font-black tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleReject(selectedAppeal)}
                      className="h-10 rounded-full text-xs font-black tracking-wider bg-red-500/10 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/20 transition cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          ) : (
            <div className="h-full bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center text-xs text-[var(--color-text-muted)]">
              <span className="material-symbols-outlined text-[36px] opacity-40 mb-2">info</span>
              <p className="font-bold">No Ticket Selected</p>
              <p className="mt-1">Pick a request from the list to initiate auditing and review verification recovery steps.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
