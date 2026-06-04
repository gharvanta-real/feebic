"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/admin/Badge";
import { ActionBtn, ConfirmModal, Modal, PrimaryBtn } from "@/components/admin/controls";
import { adminUsersApi, AuditUser } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function UserManagementPage() {
  const { adminUser, showToast } = useAdminAuth();
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filters state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Selected/expanded user details
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Modal control states
  const [emailUser, setEmailUser] = useState<AuditUser | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [deleteUser, setDeleteUser] = useState<AuditUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminUsersApi.getAll();
      setUsers(data || []);
    } catch (err) {
      showToast("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered & searched users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.ip.includes(search);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      const matchKyc = kycFilter === "all" || u.kycStatus === kycFilter;
      return matchSearch && matchRole && matchStatus && matchKyc;
    });
  }, [users, search, roleFilter, statusFilter, kycFilter]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(offset, offset + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

  // Handler functions
  const handleStatusChange = async (username: string, newStatus: string) => {
    try {
      await adminUsersApi.updateStatus(username, newStatus);
      showToast(`User ${username} status updated to ${newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, status: newStatus as any } : u))
      );
    } catch {
      showToast(`Failed to update status for ${username}`, "error");
    }
  };

  const handleKycAction = async (username: string, newKycStatus: "approved" | "rejected") => {
    try {
      await adminUsersApi.updateKyc(username, newKycStatus);
      showToast(`KYC for ${username} has been ${newKycStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, kycStatus: newKycStatus } : u))
      );
    } catch {
      showToast(`Failed to update KYC status for ${username}`, "error");
    }
  };

  const handleForceLogout = async (username: string) => {
    try {
      await adminUsersApi.forceLogout(username);
      showToast(`Session invalidated and force-logout triggered for ${username}`);
    } catch {
      showToast(`Failed to force logout ${username}`, "error");
    }
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailUser) return;
    setSendingEmail(true);
    try {
      await adminUsersApi.sendEmail(emailUser.username, emailSubject, emailBody);
      showToast(`System email sent to @${emailUser.username} successfully`);
      setEmailUser(null);
      setEmailSubject("");
      setEmailBody("");
    } catch {
      showToast(`Failed to send email to ${emailUser.username}`, "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await adminUsersApi.deleteUser(deleteUser.username);
      showToast(`User @${deleteUser.username} permanently deleted from database`);
      setUsers((prev) => prev.filter((u) => u.username !== deleteUser.username));
      setDeleteUser(null);
    } catch {
      showToast(`Failed to delete user ${deleteUser.username}`, "error");
    } finally {
      setDeleting(false);
    }
  };

  const exportToCsv = () => {
    const headers = ["Username", "Name", "Email", "Role", "Status", "KYC Status", "Location", "IP", "Last Active"];
    const rows = filteredUsers.map((u) => [
      u.username,
      u.name,
      u.email,
      u.role,
      u.status,
      u.kycStatus,
      u.location,
      u.ip,
      u.lastActive,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${x}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `felbic_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Control Center"
        sub="Monitor and moderate platform accounts, adjust roles, process KYC verifications, and manage security settings."
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportToCsv}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--text-main)] bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] rounded-full transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Export CSV
            </button>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary)]/95 rounded-full transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Reload
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <SectionCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="lg:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by username, name, email or IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 bg-[var(--background)] border border-[var(--border)] rounded-xl pl-10 pr-4 text-xs font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50 transition-colors"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 text-xs font-semibold text-[var(--text-main)] outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="creator">Creators Only</option>
              <option value="fan">Fans Only</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 text-xs font-semibold text-[var(--text-main)] outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="restricted">Restricted</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <div>
            <select
              value={kycFilter}
              onChange={(e) => {
                setKycFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 text-xs font-semibold text-[var(--text-main)] outline-none cursor-pointer"
            >
              <option value="all">All KYC States</option>
              <option value="none">No Document Submitted</option>
              <option value="pending">Verification Pending</option>
              <option value="approved">Approved Verification</option>
              <option value="rejected">Rejected / Flagged</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* User List Table */}
      <SectionCard className="overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon="group_off" message="No matches found" sub="Refine your search queries or change filter criteria." />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider">
                    <th className="py-3 px-5">User Profile</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">KYC Status</th>
                    <th className="py-3 px-5">Session Info</th>
                    <th className="py-3 px-5">Last Online</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/50">
                  {paginatedUsers.map((u) => {
                    const expanded = expandedUser === u.username;
                    return (
                      <React.Fragment key={u.username}>
                        <tr
                          className={`hover:bg-[var(--border)]/10 transition cursor-pointer text-xs ${
                            expanded ? "bg-[var(--border)]/15" : ""
                          }`}
                          onClick={() => setExpandedUser(expanded ? null : u.username)}
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 text-[var(--color-primary)] font-black text-sm">
                                {u.username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-[var(--color-text-main)] hover:underline leading-none">{u.name}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <Badge role={u.role as any} />
                          </td>
                          <td className="py-3.5 px-5">
                            <Badge status={u.status} />
                          </td>
                          <td className="py-3.5 px-5">
                            <Badge status={u.kycStatus} />
                          </td>
                          <td className="py-3.5 px-5">
                            <p className="font-semibold text-[var(--color-text-main)]">{u.location}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)] font-mono mt-0.5">{u.ip}</p>
                          </td>
                          <td className="py-3.5 px-5 text-[11px] text-[var(--color-text-muted)]">
                            {new Date(u.lastActive).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {/* Quick Action Toggle Dropdown / Buttons */}
                              <select
                                value={u.status}
                                onChange={(e) => handleStatusChange(u.username, e.target.value)}
                                className="bg-[var(--surface)] border border-[var(--border)] text-[10px] font-bold text-[var(--color-text-main)] rounded px-2 py-1 outline-none mr-2 cursor-pointer"
                              >
                                <option value="active" className="bg-[var(--surface)] text-[var(--color-text-main)]">Activate</option>
                                <option value="restricted" className="bg-[var(--surface)] text-[var(--color-text-main)]">Restrict</option>
                                <option value="suspended" className="bg-[var(--surface)] text-[var(--color-text-main)]">Suspend</option>
                                <option value="deactivated" className="bg-[var(--surface)] text-[var(--color-text-main)]">Deactivate</option>
                              </select>

                              <ActionBtn icon="mail" label="Send System Email" onClick={() => setEmailUser(u)} />
                              <ActionBtn icon="logout" label="Force Terminate Session" onClick={() => handleForceLogout(u.username)} />
                              {adminUser?.role === "admin" && (
                                <ActionBtn icon="delete" variant="danger" label="Permanently Delete User" onClick={() => setDeleteUser(u)} />
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {expanded && (
                          <tr className="bg-[var(--border)]/15" onClick={(e) => e.stopPropagation()}>
                            <td colSpan={7} className="p-5 border-b border-[var(--border)]">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[var(--color-text-muted)]">
                                <div>
                                  <h4 className="text-[10px] font-bold text-[var(--color-text-main)] mb-2">Associated Network Accounts</h4>
                                  {u.associatedAccounts.length === 0 ? (
                                    <p>No associated duplicate accounts detected.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {u.associatedAccounts.map((acc) => (
                                        <span key={acc} className="bg-[var(--surface)] border border-[var(--border)] rounded-full px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-main)]">
                                          @{acc}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-4">
                                    <h4 className="text-[10px] font-bold text-[var(--color-text-main)] mb-1.5">Device Identifier</h4>
                                    <p className="font-semibold text-[var(--color-text-main)]">{u.device}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-[10px] font-bold text-[var(--color-text-main)] mb-2">KYC Verification Documents</h4>
                                  {u.kycStatus === "none" ? (
                                    <p>Verification papers not uploaded yet.</p>
                                  ) : (
                                    <div className="space-y-2.5">
                                      <p>Document Type: <span className="font-semibold text-[var(--color-text-main)] capitalize">{u.kycDocType || "N/A"}</span></p>
                                      <div className="flex gap-2">
                                        <a
                                          href={u.kycDocUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/30 rounded-xl px-3 py-1.5 hover:bg-[var(--color-primary)] hover:text-white transition"
                                        >
                                          View Document ID
                                        </a>
                                        <a
                                          href={u.kycSelfieUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/30 rounded-xl px-3 py-1.5 hover:bg-[var(--color-primary)] hover:text-white transition"
                                        >
                                          View Verification Selfie
                                        </a>
                                      </div>
                                      {u.kycStatus === "pending" && (
                                        <div className="flex gap-2 mt-3">
                                          <button
                                            onClick={() => handleKycAction(u.username, "approved")}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded px-3 py-1.5 cursor-pointer"
                                          >
                                            Approve KYC
                                          </button>
                                          <button
                                            onClick={() => handleKycAction(u.username, "rejected")}
                                            className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded px-3 py-1.5 cursor-pointer"
                                          >
                                            Reject KYC
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="text-[10px] font-bold text-[var(--color-text-main)] mb-2">Finance & Earnings Status</h4>
                                  <div className="space-y-2 bg-[var(--surface)] p-4 border border-[var(--border)] rounded-2xl">
                                    <p className="flex justify-between">
                                      <span>Balance Due (Outstanding):</span>
                                      <span className="font-bold text-[var(--color-text-main)]">₹{u.balanceDue?.toLocaleString()}</span>
                                    </p>
                                    <p className="flex justify-between">
                                      <span>Associated Wallet Path:</span>
                                      <span className="font-mono text-[10px] text-[var(--color-text-main)]">felbic_wallet_{u.username.substring(0, 5)}</span>
                                    </p>
                                    <button
                                      onClick={() => showToast(`Initiated balance reconciliation report for @${u.username}`)}
                                      className="w-full mt-2 bg-[var(--surface)] border border-[var(--border)] text-[11px] font-bold text-[var(--color-text-main)] py-2 rounded-xl hover:bg-[var(--border)]/50 transition cursor-pointer"
                                    >
                                      Reconcile Financials
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]/50 pt-4">
              <p>
                Showing {Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                {Math.min(filteredUsers.length, currentPage * itemsPerPage)} of {filteredUsers.length} users
              </p>
              <div className="flex gap-2">
                                <button
                                  disabled={currentPage === 1}
                                  onClick={() => setCurrentPage((c) => c - 1)}
                                  className="h-8 border border-[var(--border)] text-[var(--color-text-main)] bg-[var(--surface)] rounded-lg px-3.5 text-xs font-bold hover:bg-[var(--border)]/15 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Previous
                                </button>
                                <span className="h-8 flex items-center px-2 font-black text-[var(--color-text-main)] text-[11px]">
                                  {currentPage} of {totalPages}
                                </span>
                                <button
                                  disabled={currentPage === totalPages}
                                  onClick={() => setCurrentPage((c) => c + 1)}
                                  className="h-8 border border-[var(--border)] text-[var(--color-text-main)] bg-[var(--surface)] rounded-lg px-3.5 text-xs font-bold hover:bg-[var(--border)]/15 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Modal: Send Email */}
      <Modal open={!!emailUser} onClose={() => setEmailUser(null)} title={`Send System Email to @${emailUser?.username}`}>
        <form onSubmit={handleSendEmailSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider">Email Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. Account security alert or KYC updates"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full h-10 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 font-semibold text-[var(--text-main)] outline-none focus:border-[var(--primary)]/50 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider">Email Content Body</label>
            <textarea
              required
              rows={6}
              placeholder="Write the formal communication body here..."
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-3.5 font-semibold text-[var(--text-main)] outline-none focus:border-[var(--primary)]/50 transition-colors"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setEmailUser(null)}
              className="flex-1 h-10 bg-transparent border border-[var(--border)] text-[var(--color-text-muted)] font-bold rounded-xl hover:border-slate-500 transition cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryBtn type="submit" loading={sendingEmail} className="flex-1">
              Send Email
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      {/* ConfirmModal: Delete User */}
      <ConfirmModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteSubmit}
        loading={deleting}
        title="Permanently Purge Account"
        message={`Are you absolutely sure you want to permanently delete @${deleteUser?.username}? This action purges all user relationships, posts, transactions, files, wallets, KYC docs, and profile records from the database. THIS ACTION CANNOT BE UNDONE.`}
        confirmLabel="Purge User Account"
        confirmVariant="danger"
      />
    </div>
  );
}
