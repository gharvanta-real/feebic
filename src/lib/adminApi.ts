/**
 * adminApi.ts — Typed helpers for every admin API endpoint.
 * Keeps all fetch logic out of page components.
 * Uses the shared apiClient (auto-attaches ch_admin_token on /admin paths).
 */
import { apiClient } from "./apiClient";
import { API_BASE_URL } from "./apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "moderator" | "support";
  totp_enabled: boolean;
  last_login: string;
  last_login_ip: string;
};

export type AuditUser = {
  username: string;
  name: string;
  avatar: string;
  email: string;
  role: "creator" | "fan";
  status: "active" | "restricted" | "suspended" | "deactivated";
  verified: boolean;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  associatedAccounts: string[];
  kycDocType: string;
  kycDocUrl: string;
  kycSelfieUrl: string;
  kycStatus: "none" | "pending" | "approved" | "rejected";
  balanceDue: number;
};

export type FlaggedPost = {
  id: string;
  creatorUsername: string;
  creatorAvatar: string;
  content: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "text";
  reason: string;
  reportedBy: string;
  aiScore: number;
  aiBreakdown: { nudity: number; violence: number; spam: number; copyright: number };
  comments: string[];
  decision: string;
};

export type AppealTicket = {
  id: string;
  username: string;
  avatar: string;
  type: string;
  status: "pending" | "resolved" | "rejected";
  description: string;
  createdAt: string;
  selfieMatchScore: number;
  auditLogs: string[];
  recoveryStep: number;
};

export type SpamAlert = {
  id: string;
  username: string;
  type: "comment_spike" | "dm_spike" | "follow_spike";
  value: string;
  severity: "high" | "critical";
  timestamp: string;
};

export type PlatformSettings = {
  newSignups: boolean;
  creatorVerification: boolean;
  autoPayouts: boolean;
  liveMonitoring: boolean;
  platformFee: number;
  maxPpvPrice: number;
};

export type PlatformState = {
  lockdown: boolean;
  maintenance: boolean;
  reason: string;
};

export type AuditLog = {
  id: string;
  adminUsername: string;
  adminRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type StaffMember = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "moderator" | "support";
  totpEnabled: boolean;
  isActive: boolean;
  lastLogin: string;
  lastLoginIp: string;
  createdAt: string;
};

export type OverviewMetrics = {
  revenueTrend: number[];
  spamTrend: number[];
  growthTrend: number[];
};

export type RevenueAnalytics = {
  daily: { date: string; revenue: number; transactions: number }[];
  total: number;
  currency: string;
};

export type GrowthStats = {
  daily: { date: string; signups: number; fans: number; creators: number }[];
  total_users: number;
};

export type ServerHealth = {
  status: string;
  uptime_seconds: number;
  goroutines: number;
  memory_alloc_mb: number;
  memory_sys_mb: number;
  num_gc: number;
  db_status: string;
  db_ping_ms: number;
  version: string;
};

export type StorageStats = {
  total_files: number;
  total_bytes: number;
  images: number;
  videos: number;
  limit_bytes: number;
  used_percent: number;
};

export type ApiEndpointHealth = {
  endpoint: string;
  method: string;
  status: "ok" | "slow" | "error" | "unknown";
  latency_ms: number;
  last_checked: string;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const adminAuthApi = {
  getMe: () => apiClient.get<AdminUser>("/admin-auth/me"),
  logout: () => apiClient.post("/admin-auth/logout"),
  getStaff: () => apiClient.get<StaffMember[]>("/admin-auth/staff"),
  createStaff: (data: { username: string; email: string; password: string; role: string }) =>
    apiClient.post<{ id: string }>("/admin-auth/staff", data),
  updateStaffRole: (id: string, role: string) =>
    apiClient.put(`/admin-auth/staff/${id}/role`, { role }),
  deactivateStaff: (id: string) => apiClient.delete(`/admin-auth/staff/${id}`),
  reactivateStaff: (id: string) => apiClient.post(`/admin-auth/staff/${id}/reactivate`),
  setupTotp: () => apiClient.post<{ secret: string; qr_url: string }>("/admin-auth/totp/setup"),
  confirmTotp: (totp_code: string) =>
    apiClient.post<{ recovery_codes: string[] }>("/admin-auth/totp/confirm", { totp_code }),
};

// ─── Dashboard / Analytics ─────────────────────────────────────────────────────

export const adminAnalyticsApi = {
  getOverviewMetrics: () => apiClient.get<OverviewMetrics>("/admin/overview/metrics"),
  getRevenue: () => apiClient.get<RevenueAnalytics>("/admin/analytics/revenue"),
  getGrowth: () => apiClient.get<GrowthStats>("/admin/analytics/growth"),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const adminUsersApi = {
  getAll: () => apiClient.get<AuditUser[]>("/admin/users"),
  updateStatus: (username: string, status: string) =>
    apiClient.put(`/admin/users/${username}/status`, { status }),
  updateKyc: (username: string, status: string) =>
    apiClient.put(`/admin/users/${username}/kyc`, { status }),
  sendEmail: (username: string, subject: string, body: string) =>
    apiClient.post(`/admin/users/${username}/email`, { subject, body }),
  forceLogout: (username: string) =>
    apiClient.post(`/admin/users/${username}/force-logout`),
  deleteUser: (username: string) => apiClient.delete(`/admin/users/${username}`),
};

// ─── Content ──────────────────────────────────────────────────────────────────

export const adminContentApi = {
  getFlagged: () => apiClient.get<FlaggedPost[]>("/admin/posts"),
  moderate: (id: string, decision: string) =>
    apiClient.put(`/admin/posts/${id}/decision`, { decision }),
};

// ─── Appeals ──────────────────────────────────────────────────────────────────

export const adminAppealsApi = {
  getAll: () => apiClient.get<AppealTicket[]>("/admin/appeals"),
  update: (id: string, status: string, recoveryStep: number) =>
    apiClient.put(`/admin/appeals/${id}/resolve`, { status, recoveryStep }),
};

// ─── Security ─────────────────────────────────────────────────────────────────

export const adminSecurityApi = {
  getAlerts: () => apiClient.get<SpamAlert[]>("/admin/security/alerts"),
  massBan: () => apiClient.post("/admin/security/mass-ban"),
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const adminSettingsApi = {
  get: () => apiClient.get<PlatformSettings>("/admin/settings"),
  update: (settings: PlatformSettings) => apiClient.put("/admin/settings", settings),
  getState: () => apiClient.get<PlatformState>("/admin/platform/state"),
  updateState: (state: PlatformState) => apiClient.put("/admin/platform/state", state),
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const adminAuditApi = {
  getLogs: (params?: { admin?: string; action?: string; limit?: number; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.admin) q.set("admin", params.admin);
    if (params?.action) q.set("action", params.action);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.page) q.set("page", String(params.page));
    return apiClient.get<AuditLog[]>(`/admin/audit-logs?${q}`);
  },
};

// ─── Broadcast ────────────────────────────────────────────────────────────────

export const adminBroadcastApi = {
  sendEmail: (subject: string, body: string, audience: "all" | "creators" | "fans") =>
    apiClient.post<{ recipient_count: number }>("/admin/broadcast/email", { subject, body, audience }),
};

// ─── Server Health ─────────────────────────────────────────────────────────────

export const adminServerApi = {
  getHealth: () => apiClient.get<ServerHealth>("/admin/health"),
};

// ─── Storage ──────────────────────────────────────────────────────────────────

export const adminStorageApi = {
  getStats: () => apiClient.get<StorageStats>("/admin/storage/stats"),
};

// ─── API Health ───────────────────────────────────────────────────────────────

export const adminApiHealthApi = {
  getEndpointHealth: () => apiClient.get<ApiEndpointHealth[]>("/admin/api-health"),
};

// ─── Utility: ping an endpoint and measure latency ───────────────────────────

export async function pingEndpoint(
  path: string,
  method: "GET" | "POST" = "GET"
): Promise<{ status: "ok" | "slow" | "error"; latency_ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("ch_admin_token") || "" : ""}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    const latency_ms = Date.now() - start;
    if (!res.ok && res.status >= 500) return { status: "error", latency_ms };
    return { status: latency_ms > 1000 ? "slow" : "ok", latency_ms };
  } catch {
    return { status: "error", latency_ms: Date.now() - start };
  }
}
