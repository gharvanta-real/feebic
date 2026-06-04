"use client";

import React from "react";

/**
 * Modal — Centered overlay modal with backdrop blur.
 * Usage:
 *   <Modal open={open} onClose={() => setOpen(false)} title="Confirm Action">
 *     <p>Are you sure?</p>
 *   </Modal>
 */
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
};

export function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-lg" }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className={`relative z-10 w-full ${maxWidth} bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-2xl shadow-black/50 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-base font-black text-[var(--color-text-main)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-[var(--color-border)]/50 flex items-center justify-center hover:bg-[var(--color-border)] transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[var(--color-text-muted)]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * ConfirmModal — A simple yes/no confirmation modal.
 */
type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  loading?: boolean;
};

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = "Confirm", confirmVariant = "danger", loading = false,
}: ConfirmModalProps) {
  const btnCls = confirmVariant === "danger"
    ? "bg-red-500 hover:bg-red-400 text-white"
    : "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white";

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 h-10 bg-transparent border border-[var(--color-border)] text-[var(--color-text-muted)] font-bold text-xs rounded-xl hover:border-[var(--color-text-muted)] transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 h-10 ${btnCls} font-black text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5`}
        >
          {loading && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/**
 * ActionBtn — Small icon button for tables/lists.
 */
type ActionBtnProps = {
  icon: string;
  onClick: () => void;
  label?: string;
  variant?: "default" | "danger" | "success" | "warning";
  disabled?: boolean;
  size?: "sm" | "xs";
};

const variantCls: Record<NonNullable<ActionBtnProps["variant"]>, string> = {
  default: "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-border)]",
  danger:  "text-red-600 dark:text-red-400 hover:text-red-500 hover:bg-red-500/10",
  success: "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10",
  warning: "text-amber-700 dark:text-amber-400 hover:text-amber-500 hover:bg-amber-500/10",
};

export function ActionBtn({ icon, onClick, label, variant = "default", disabled = false, size = "sm" }: ActionBtnProps) {
  const sizeClass = size === "xs" ? "h-6 w-6 text-[14px]" : "h-8 w-8 text-[18px]";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`${sizeClass} rounded-lg flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantCls[variant]}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "inherit" }}>{icon}</span>
    </button>
  );
}

/**
 * PrimaryBtn — Full-width or inline primary action button.
 */
type PrimaryBtnProps = {
  onClick?: () => void;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
};

export function PrimaryBtn({
  onClick, type = "button", loading = false, disabled = false,
  icon, children, variant = "primary", size = "md", className = "",
}: PrimaryBtnProps) {
  const base = "flex items-center justify-center gap-2 font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-full";
  const sizeClass = size === "sm" ? "h-9 px-4 text-[11px]" : "h-11 px-6 text-xs";
  const variantClass = {
    primary: "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white shadow-lg",
    danger:  "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20",
    ghost:   "bg-transparent border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
  }[variant];

  return (
    <button type={type} onClick={onClick} disabled={loading || disabled} className={`${base} ${sizeClass} ${variantClass} ${className}`}>
      {loading
        ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>
      }
      {children}
    </button>
  );
}
