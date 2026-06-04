/**
 * EmptyState — Placeholder for empty lists/tables.
 * Usage: <EmptyState icon="group" message="No users found" />
 */
type EmptyStateProps = {
  icon?: string;
  message: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
};

export function EmptyState({ icon = "inbox", message, sub, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span
        className="material-symbols-outlined text-[48px] text-[var(--color-border)] opacity-60"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-[var(--color-text-muted)]">{message}</p>
        {sub && <p className="text-xs text-[var(--color-text-muted)] opacity-70 mt-1">{sub}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 text-xs font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 rounded-full px-4 py-2 hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * LoadingSpinner — Centered spinner.
 */
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <div className="flex items-center justify-center py-16">
      <div className={`${s} border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}

/**
 * SectionCard — Consistent section wrapper.
 */
type SectionCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

/**
 * SectionHeader — Title + optional action button row.
 */
type SectionHeaderProps = {
  title: string;
  sub?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, sub, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-sm font-black text-[var(--color-text-main)]">{title}</h2>
        {sub && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-medium">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
