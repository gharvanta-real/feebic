/**
 * StatCard — KPI metric card with optional trend indicator.
 * Usage: <StatCard label="Total Users" value="12,450" icon="group" trend={+8.2} />
 */
type StatCardProps = {
  label: string;
  value: string | number;
  icon: string;
  trend?: number; // positive = up, negative = down, undefined = no trend
  sub?: string;
  color?: "cyan" | "violet" | "emerald" | "amber" | "red" | "blue";
  loading?: boolean;
};

const colorMap: Record<NonNullable<StatCardProps["color"]>, { icon: string; bg: string; border: string }> = {
  cyan:    { icon: "text-cyan-600 dark:text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  violet:  { icon: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
  emerald: { icon: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  amber:   { icon: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  red:     { icon: "text-red-600 dark:text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
  blue:    { icon: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
};

export function StatCard({ label, value, icon, trend, sub, color = "cyan", loading = false }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex items-start gap-4 hover:border-[var(--border)]/80 transition-all">
      <div className={`flex-shrink-0 h-11 w-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
        <span
          className={`material-symbols-outlined text-[22px] ${c.icon}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black tracking-widest text-[var(--color-text-muted)] mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-20 bg-[var(--border)] rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-black text-[var(--color-text-main)] leading-none truncate">{value}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {trend !== undefined && !loading && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              <span className="material-symbols-outlined text-[12px]">
                {trend >= 0 ? "trending_up" : "trending_down"}
              </span>
              {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
            </span>
          )}
          {sub && (
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">{sub}</span>
          )}
        </div>
      </div>
    </div>
  );
}
