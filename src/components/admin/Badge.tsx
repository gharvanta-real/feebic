/**
 * Badge — Status / role colored pill badge.
 * Usage: <Badge status="active" /> or <Badge role="admin" /> or <Badge label="Custom" color="cyan" />
 */

type BadgeProps = {
  label?: string;
  status?: "active" | "restricted" | "suspended" | "deactivated" | "pending" | "resolved" | "rejected" | "approved" | "none";
  role?: "admin" | "moderator" | "support";
  severity?: "high" | "critical";
  size?: "sm" | "xs";
};

const statusMap: Record<NonNullable<BadgeProps["status"]>, { label: string; cls: string }> = {
  active:      { label: "Active",      cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  restricted:  { label: "Restricted",  cls: "bg-amber-500/10   text-amber-700   dark:text-amber-400   border-amber-500/20" },
  suspended:   { label: "Suspended",   cls: "bg-red-500/10     text-red-600     dark:text-red-400     border-red-500/20" },
  deactivated: { label: "Deactivated", cls: "bg-slate-500/10   text-slate-600   dark:text-slate-400   border-slate-500/20" },
  pending:     { label: "Pending",     cls: "bg-amber-500/10   text-amber-700   dark:text-amber-400   border-amber-500/20" },
  resolved:    { label: "Resolved",    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  rejected:    { label: "Rejected",    cls: "bg-red-500/10     text-red-600     dark:text-red-400     border-red-500/20" },
  approved:    { label: "Approved",    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  none:        { label: "No KYC",      cls: "bg-slate-500/10   text-slate-600   dark:text-slate-400   border-slate-500/20" },
};

const roleMap: Record<NonNullable<BadgeProps["role"]>, { label: string; cls: string }> = {
  admin:     { label: "Admin",     cls: "bg-red-500/10    text-red-600    dark:text-red-400    border-red-500/20" },
  moderator: { label: "Moderator", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  support:   { label: "Support",   cls: "bg-cyan-500/10   text-cyan-700   dark:text-cyan-400   border-cyan-500/20" },
};

const severityMap: Record<NonNullable<BadgeProps["severity"]>, { label: string; cls: string }> = {
  high:     { label: "High",     cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  critical: { label: "Critical", cls: "bg-red-500/10   text-red-600   dark:text-red-400   border-red-500/20" },
};

export function Badge({ label, status, role, severity, size = "sm" }: BadgeProps) {
  let text = label || "";
  let cls = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";

  if (status && statusMap[status]) { text = label || statusMap[status].label; cls = statusMap[status].cls; }
  if (role && roleMap[role])       { text = label || roleMap[role].label;     cls = roleMap[role].cls; }
  if (severity && severityMap[severity]) { text = label || severityMap[severity].label; cls = severityMap[severity].cls; }

  const sizeClass = size === "xs"
    ? "text-[9px] px-1.5 py-0.5"
    : "text-[10px] px-2 py-0.5";

  return (
    <span className={`inline-flex items-center font-bold border rounded-full ${sizeClass} ${cls}`}>
      {text}
    </span>
  );
}
