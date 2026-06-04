"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { adminAuthApi, AdminUser } from "@/lib/adminApi";

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

// ─── Context Types ────────────────────────────────────────────────────────────

type AdminAuthContextValue = {
  adminUser: AdminUser | null;
  loading: boolean;
  showToast: (message: string, variant?: ToastVariant) => void;
  handleLogout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = String(++toastIdRef.current);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const clearAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ch_admin_token");
      document.cookie = "ch_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }, []);

  const fetchUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ch_admin_token") : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    try {
      const user = await adminAuthApi.getMe();
      if (user?.id && user?.role) {
        setAdminUser(user);
      } else {
        clearAuth();
        router.replace("/admin/login");
      }
    } catch {
      clearAuth();
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router, clearAuth]);

  useEffect(() => {
    void Promise.resolve().then(fetchUser);
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const handleLogout = useCallback(async () => {
    try {
      await adminAuthApi.logout();
    } catch { /* best-effort */ }
    clearAuth();
    router.replace("/admin/login");
  }, [router, clearAuth]);

  const toastIcons: Record<ToastVariant, string> = {
    success: "check_circle",
    error: "error",
    info: "info",
    warning: "warning",
  };

  const toastColors: Record<ToastVariant, string> = {
    success: "border-emerald-500/30 text-emerald-400",
    error: "border-red-500/30 text-red-400",
    info: "border-cyan-500/30 text-cyan-400",
    warning: "border-amber-500/30 text-amber-400",
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, loading, showToast, handleLogout, refreshUser }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 bg-slate-900 border rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur-md animate-slide-up ${toastColors[t.variant]}`}
          >
            <span
              className="material-symbols-outlined text-[18px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {toastIcons[t.variant]}
            </span>
            <span className="text-xs font-bold text-white max-w-[280px] leading-tight">{t.message}</span>
          </div>
        ))}
      </div>
    </AdminAuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
