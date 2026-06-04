"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, SectionHeader, LoadingSpinner } from "@/components/admin/ui";
import { pingEndpoint } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { API_BASE_URL } from "@/lib/apiClient";

type EndpointCheck = {
  path: string;
  method: "GET" | "POST";
  label: string;
  status: "checking" | "ok" | "slow" | "error" | "idle";
  latency: number | null;
  lastChecked: Date | null;
};

const INITIAL_ENDPOINTS: EndpointCheck[] = [
  { path: "/admin/health", method: "GET", label: "Server Health Services", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/overview/metrics", method: "GET", label: "Analytics Overview", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/users", method: "GET", label: "User Control Directory", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/posts", method: "GET", label: "Content Moderation Queue", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/appeals", method: "GET", label: "Appeals Center", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/security/alerts", method: "GET", label: "Security Bot Threat Alerts", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/audit-logs", method: "GET", label: "Operations Audit Logs", status: "idle", latency: null, lastChecked: null },
  { path: "/admin-auth/staff", method: "GET", label: "Staff Directory Credentials", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/settings", method: "GET", label: "Platform Operational Settings", status: "idle", latency: null, lastChecked: null },
  { path: "/admin/platform/state", method: "GET", label: "Lockdown Operational State", status: "idle", latency: null, lastChecked: null },
];

export default function ApiMonitorPage() {
  const { showToast } = useAdminAuth();
  const [endpoints, setEndpoints] = useState<EndpointCheck[]>(INITIAL_ENDPOINTS);
  const [runningAll, setRunningAll] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Single endpoint checker
  const checkSingleEndpoint = async (index: number) => {
    setEndpoints((prev) =>
      prev.map((e, idx) => (idx === index ? { ...e, status: "checking", latency: null } : e))
    );

    const ep = endpoints[index];
    const res = await pingEndpoint(ep.path, ep.method);

    setEndpoints((prev) =>
      prev.map((e, idx) =>
        idx === index
          ? {
              ...e,
              status: res.status,
              latency: res.latency_ms,
              lastChecked: new Date(),
            }
          : e
      )
    );
  };

  // Run all endpoints in parallel
  const runAllChecks = async () => {
    setRunningAll(true);
    setEndpoints((prev) =>
      prev.map((e) => ({ ...e, status: "checking", latency: null }))
    );

    try {
      await Promise.allSettled(
        endpoints.map(async (ep, idx) => {
          const res = await pingEndpoint(ep.path, ep.method);
          setEndpoints((prev) =>
            prev.map((e, i) =>
              i === idx
                ? {
                    ...e,
                    status: res.status,
                    latency: res.latency_ms,
                    lastChecked: new Date(),
                  }
                : e
            )
          );
        })
      );
      setLastScanTime(new Date());
      showToast("Completed API health checks scan across all nodes.");
    } catch {
      showToast("Error running endpoints checks", "error");
    } finally {
      setRunningAll(false);
    }
  };

  useEffect(() => {
    runAllChecks();
  }, []);

  // Compute stats summary counts
  const summary = useMemo(() => {
    const total = endpoints.length;
    const healthy = endpoints.filter((e) => e.status === "ok" || e.status === "slow").length;
    const error = endpoints.filter((e) => e.status === "error").length;
    return { total, healthy, error };
  }, [endpoints]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="API Health Monitor"
        sub="Monitor platform HTTP endpoints response times, network latencies, database locks, and connection health."
        actions={
          <button
            disabled={runningAll}
            onClick={runAllChecks}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/95 disabled:opacity-50 rounded-full transition cursor-pointer"
          >
            {runningAll ? (
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[14px]">bolt</span>
            )}
            Run Diagnostics
          </button>
        }
      />

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Total Route Nodes</p>
            <p className="text-xl font-black text-[var(--color-text-main)] mt-1">{summary.total}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-cyan-500 dark:text-cyan-400">api</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Healthy Endpoints</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{summary.healthy} / {summary.total}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-emerald-600 dark:text-emerald-400">check_circle</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Offline Nodes</p>
            <p className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{summary.error}</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-red-500">dangerous</span>
        </div>
      </div>

      {/* Endpoint Table */}
      <SectionCard>
        <div className="flex justify-between items-center mb-4">
          <SectionHeader
            title="Operational API Endpoints"
            sub={`Diagnostics run against base path: ${API_BASE_URL}`}
          />
          {lastScanTime && (
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
              Checked: {lastScanTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>

        <div className="overflow-x-auto -mx-5 text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">
                <th className="py-3 px-5">Endpoint Node Service</th>
                <th className="py-3 px-5">Method</th>
                <th className="py-3 px-5">Network Path</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Ping Latency</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/50">
              {endpoints.map((ep, idx) => {
                let statusBadge = "bg-[var(--border)]/20 text-[var(--color-text-muted)] border-[var(--border)]";
                let statusLabel = "Idle";

                if (ep.status === "checking") {
                  statusBadge = "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
                  statusLabel = "Checking...";
                } else if (ep.status === "ok") {
                  statusBadge = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                  statusLabel = "Healthy";
                } else if (ep.status === "slow") {
                  statusBadge = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
                  statusLabel = "Slow Response";
                } else if (ep.status === "error") {
                  statusBadge = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
                  statusLabel = "Offline / Error";
                }

                let latencyCol = "text-[var(--color-text-muted)]";
                if (ep.latency !== null) {
                  if (ep.latency < 200) latencyCol = "text-emerald-600 dark:text-emerald-400";
                  else if (ep.latency < 1000) latencyCol = "text-amber-700 dark:text-amber-400";
                  else latencyCol = "text-red-600 dark:text-red-400";
                }

                return (
                  <tr key={ep.path} className="hover:bg-[var(--border)]/10 transition">
                    <td className="py-3.5 px-5 font-bold text-[var(--color-text-main)]">
                      {ep.label}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-black font-mono text-[10px] text-[var(--color-text-main)] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)]">
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[var(--color-text-muted)] text-[11px]">
                      {ep.path}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5">
                        {ep.status === "checking" && (
                          <div className="h-3.5 w-3.5 border border-[var(--color-primary)] border-t-transparent rounded-full animate-spin shrink-0" />
                        )}
                        <span className={`inline-flex font-black text-[9px] tracking-wider border rounded px-1.5 py-0.5 ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-semibold">
                      {ep.latency !== null ? (
                        <span className={`${latencyCol}`}>{ep.latency} ms</span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => checkSingleEndpoint(idx)}
                        disabled={runningAll || ep.status === "checking"}
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-[var(--border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                        title="Ping Endpoint Node"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
