"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, SectionHeader, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/admin/Badge";
import { adminAuditApi, AuditLog } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AuditLogsPage() {
  const { showToast } = useAdminAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [actionCategory, setActionCategory] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");

  // Expanded log row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch audit logs
      const data = await adminAuditApi.getLogs({ limit: 500 });
      setLogs(data || []);
    } catch {
      showToast("Failed to fetch administrative audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Unique lists of admins for filter dropdown
  const adminOptions = useMemo(() => {
    const list = logs.map((l) => l.adminUsername);
    return ["all", ...new Set(list)];
  }, [logs]);

  // Filtered logs list
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        l.adminUsername.toLowerCase().includes(search.toLowerCase()) ||
        l.targetId.toLowerCase().includes(search.toLowerCase()) ||
        l.targetType.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        actionCategory === "all" || l.action.startsWith(actionCategory);

      const matchAdmin = adminFilter === "all" || l.adminUsername === adminFilter;

      return matchSearch && matchCategory && matchAdmin;
    });
  }, [logs, search, actionCategory, adminFilter]);

  // Paginated logs list
  const paginatedLogs = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(offset, offset + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));

  // Compute logs daily activity stats
  const stats = useMemo(() => {
    const total = logs.length;
    const actionsToday = logs.filter((l) => {
      const today = new Date().toDateString();
      const logDay = new Date(l.createdAt).toDateString();
      return today === logDay;
    }).length;

    // Determine most active admin
    const counts: Record<string, number> = {};
    logs.forEach((l) => {
      counts[l.adminUsername] = (counts[l.adminUsername] || 0) + 1;
    });
    let mostActive = "N/A";
    let max = 0;
    Object.entries(counts).forEach(([admin, count]) => {
      if (count > max) {
        max = count;
        mostActive = `@${admin}`;
      }
    });

    return { total, actionsToday, mostActive };
  }, [logs]);

  const exportToCsv = () => {
    const headers = ["Timestamp", "Admin User", "Role", "Action Type", "Target Entity", "Target ID", "Payload Context"];
    const rows = filteredLogs.map((l) => [
      l.createdAt,
      l.adminUsername,
      l.adminRole,
      l.action,
      l.targetType,
      l.targetId,
      JSON.stringify(l.details),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${x.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `felbic_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith("auth.")) return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
    if (action.startsWith("user.")) return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    if (action.startsWith("content.")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    if (action.startsWith("security.")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    if (action.startsWith("staff.")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (action.startsWith("platform.")) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    return "bg-[var(--border)]/15 text-[var(--color-text-muted)] border-[var(--border)]";
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Audit Logs"
        sub="Track, search, and audit actions executed by support staff, moderators, and owners across the platform database."
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportToCsv}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--color-text-main)] bg-[var(--surface)] hover:bg-[var(--border)]/15 border border-[var(--border)] rounded-full transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Export CSV
            </button>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 rounded-full transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Reload Logs
            </button>
          </div>
        }
      />

      {/* Summary Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Total Actions Logged</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.total}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-cyan-500 dark:text-cyan-400">history_edu</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Actions Done Today</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{stats.actionsToday}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-emerald-500 dark:text-emerald-400">today</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Most Active Admin</p>
            <p className="text-sm font-black text-[var(--color-text-main)] mt-2 truncate max-w-[150px]">{stats.mostActive}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-violet-500 dark:text-violet-400">account_circle</span>
        </div>
      </div>

      {/* Filter Row */}
      <SectionCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
              search
            </span>
            <input
              type="text"
              placeholder="Search target ID, details payload..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 bg-[var(--surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />
          </div>

          <div>
            <select
              value={actionCategory}
              onChange={(e) => {
                setActionCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 text-xs font-semibold text-[var(--color-text-main)] outline-none cursor-pointer"
            >
              <option value="all">All Action Categories</option>
              <option value="auth.">Authentication (auth.*)</option>
              <option value="user.">User Control (user.*)</option>
              <option value="content.">Moderation (content.*)</option>
              <option value="security.">Threat Security (security.*)</option>
              <option value="staff.">Staff Management (staff.*)</option>
              <option value="platform.">Platform Settings (platform.*)</option>
            </select>
          </div>

          <div>
            <select
              value={adminFilter}
              onChange={(e) => {
                setAdminFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 text-xs font-semibold text-[var(--color-text-main)] outline-none cursor-pointer"
            >
              <option value="all">All Administrators</option>
              {adminOptions.filter((o) => o !== "all").map((opt) => (
                <option key={opt} value={opt}>
                  @{opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Logs Table Card */}
      <SectionCard className="overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : filteredLogs.length === 0 ? (
          <EmptyState icon="history" message="No audit logs matched search criteria" sub="Try selecting another category or username filter." />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto -mx-5 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">
                    <th className="py-3 px-5">Admin Username</th>
                    <th className="py-3 px-5">Action Type</th>
                    <th className="py-3 px-5">Target Entity</th>
                    <th className="py-3 px-5">Target ID</th>
                    <th className="py-3 px-5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/50">
                  {paginatedLogs.map((log) => {
                    const expanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedLogId(expanded ? null : log.id)}
                          className={`hover:bg-[var(--border)]/10 transition cursor-pointer ${
                            expanded ? "bg-[var(--border)]/15" : ""
                          }`}
                        >
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--color-text-main)]">@{log.adminUsername}</span>
                              <span className="text-[9px] font-black tracking-wider bg-[var(--border)]/15 text-[var(--color-text-muted)] border border-[var(--border)] rounded px-1.5 py-0.5">
                                {log.adminRole}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <span className={`inline-flex font-black text-[9px] tracking-wider border rounded px-1.5 py-0.5 ${getActionBadgeColor(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-[var(--color-text-muted)] font-semibold tracking-wider text-[10px]">
                            {log.targetType}
                          </td>
                          <td className="py-3 px-5 font-mono text-[var(--color-text-main)]">
                            {log.targetId}
                          </td>
                          <td className="py-3 px-5 text-right text-[10px] text-[var(--color-text-muted)]">
                            {new Date(log.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="bg-[var(--border)]/10">
                            <td colSpan={5} className="p-4 border-b border-[var(--border)]">
                              <div className="space-y-2.5">
                                <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-widest leading-none">
                                  Action Payload JSON Metadata Context
                                </p>
                                <pre className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 font-mono text-[10px] text-[var(--color-text-main)] leading-relaxed overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
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

            {/* Pagination */}
            <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] border-t border-[var(--border)]/50 pt-4">
              <p>
                Showing {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                {Math.min(filteredLogs.length, currentPage * itemsPerPage)} of {filteredLogs.length} entries
              </p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c) => c - 1)}
                  className="h-8 border border-[var(--border)] text-[var(--color-text-main)] rounded-lg px-3.5 text-xs font-bold hover:bg-[var(--border)]/15 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--surface)]"
                >
                  Previous
                </button>
                <span className="h-8 flex items-center px-2 font-black text-[var(--color-text-main)] text-[11px]">
                  {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((c) => c + 1)}
                  className="h-8 border border-[var(--border)] text-[var(--color-text-main)] rounded-lg px-3.5 text-xs font-bold hover:bg-[var(--border)]/15 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--surface)]"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
