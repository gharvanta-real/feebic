"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

type Step = "credentials" | "totp" | "totp_setup";

type Step1Response = {
  step1_token: string;
  totp_required: boolean;
  totp_setup: boolean;
  username: string;
  role: string;
};

type TOTPSetupResponse = {
  secret: string;
  qr_url: string;
  username: string;
  message: string;
};

type ConfirmResponse = {
  token: string;
  admin: { id: string; username: string; role: string };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("from") || "/admin";

  const [step, setStep] = useState<Step>("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1 result
  const [step1Token, setStep1Token] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // TOTP fields
  const [totpCode, setTotpCode] = useState("");
  const totpInputRef = useRef<HTMLInputElement>(null);

  // TOTP Setup fields
  const [qrUrl, setQrUrl] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ch_admin_token") : null;
    if (token) {
      apiClient.get("/admin-auth/me")
        .then(() => router.replace(returnTo))
        .catch(() => {
          localStorage.removeItem("ch_admin_token");
          document.cookie = "ch_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        });
    }
  }, [router, returnTo]);

  // Auto-focus TOTP input when entering that step
  useEffect(() => {
    if ((step === "totp" || step === "totp_setup") && totpInputRef.current) {
      setTimeout(() => totpInputRef.current?.focus(), 100);
    }
  }, [step]);

  const clearError = () => setError("");

  // ── Step 1: Email + Password ──────────────────────────────────────────────

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      const res = await apiClient.post<Step1Response>("/admin-auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      setStep1Token(res.step1_token);
      setAdminUsername(res.username);
      setAdminRole(res.role);

      if (res.totp_setup) {
        // TOTP not configured — need to set it up
        setStep("totp_setup");
        // Fetch setup QR code
        await fetchTOTPSetup(res.step1_token);
      } else {
        setStep("totp");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch TOTP Setup ───────────────────────────────────────────────────────

  const fetchTOTPSetup = async (tempToken: string) => {
    try {
      // We need to pass the token as header for this special setup step
      // Since the user isn't fully authed yet, we use step1_token in a custom way
      // The API call uses the token we have in step1_token
      // Actually, for totp/setup, we need a full admin JWT — 
      // so we issue a temporary "setup" JWT when totp_setup = true
      // For simplicity, the server will return setup data in step1 response when totp_setup=true
      // We request with the step1 token in Authorization header
      const setupRes = await fetch(`${getApiUrl()}/admin-auth/totp/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tempToken}`,
        },
      });
      if (setupRes.ok) {
        const data: TOTPSetupResponse = await setupRes.json();
        setQrUrl(data.qr_url);
        setTotpSecret(data.secret);
      }
    } catch {
      // QR code fetch failed — user can enter secret manually
    }
  };

  // ── Step 2: TOTP Verify ───────────────────────────────────────────────────

  const handleTOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (totpCode.length < 6) return;
    setLoading(true);

    try {
      const res = await apiClient.post<ConfirmResponse>("/admin-auth/totp/verify", {
        step1_token: step1Token,
        totp_code: totpCode,
      });

      // Store token in both localStorage AND cookie (for middleware)
      localStorage.setItem("ch_admin_token", res.token);
      document.cookie = `ch_admin_token=${res.token}; path=/; secure; samesite=strict; max-age=43200`;

      setInfoMsg("Authentication successful! Entering command center...");
      setTimeout(() => router.replace(returnTo), 800);
    } catch (err: any) {
      setError(err.message || "Invalid authentication code");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  // ── TOTP Setup Confirm ─────────────────────────────────────────────────────

  const handleTOTPSetupConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (setupCode.length < 6) return;
    setLoading(true);

    try {
      // Confirm TOTP is working — we need a full token for this
      // Use step1_token in Authorization header
      const res = await fetch(`${getApiUrl()}/admin-auth/totp/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${step1Token}`,
        },
        body: JSON.stringify({ totp_code: setupCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "TOTP confirmation failed");
      }

      const data = await res.json();
      setRecoveryCodes(data.recovery_codes || []);
      setShowRecoveryCodes(true);
    } catch (err: any) {
      setError(err.message || "Invalid code");
      setSetupCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    // Now do the full TOTP verify with step1_token
    clearError();
    setLoading(true);
    try {
      const res = await apiClient.post<ConfirmResponse>("/admin-auth/totp/verify", {
        step1_token: step1Token,
        totp_code: setupCode, // Reuse the confirmed code
      });
      localStorage.setItem("ch_admin_token", res.token);
      document.cookie = `ch_admin_token=${res.token}; path=/; secure; samesite=strict; max-age=43200`;
      router.replace(returnTo);
    } catch {
      // Setup confirmed — just move to TOTP step for fresh code
      setStep("totp");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  const getApiUrl = () => {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8081/api,https://api.felbic.gharvanta.in/api";
    return configured.split(",")[0].trim();
  };

  const downloadRecoveryCodes = () => {
    const content = `Felbic Admin — Recovery Codes\nGenerated: ${new Date().toISOString()}\nAccount: ${adminUsername}\n\n` + recoveryCodes.join("\n") + "\n\n⚠️ Keep these codes safe and private. Each code can only be used once.";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `felbic-admin-recovery-codes-${adminUsername}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTOTPInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setTotpCode(digits);
  };

  const handleSetupCodeInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setSetupCode(digits);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Animated background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[200px] w-[200px] rounded-full bg-cyan-400/5 blur-[80px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-[440px] mx-4">

        {/* ── STEP 1: Credentials ── */}
        {step === "credentials" && (
          <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/40">
            {/* Header */}
            <div className="text-center space-y-4 mb-8">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center">
                <span className="material-symbols-outlined text-[30px] text-cyan-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                  admin_panel_settings
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">FELBIC OPS</h1>
                <p className="text-xs text-slate-400 font-semibold mt-1.5 uppercase tracking-widest">Secure Command Access</p>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="h-1.5 w-8 rounded-full bg-cyan-500" />
                <div className="h-1.5 w-5 rounded-full bg-slate-700" />
                <div className="h-1.5 w-5 rounded-full bg-slate-700" />
              </div>
            </div>

            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">email</span>
                  Admin Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="admin@felbic.com"
                  required
                  autoComplete="email"
                  className="w-full h-12 bg-slate-950/80 border border-slate-800 rounded-xl px-4 text-sm font-semibold text-white outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-12 bg-slate-950/80 border border-slate-800 rounded-xl px-4 text-sm font-semibold text-white outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl p-3 text-xs font-semibold flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                id="admin-login-btn"
                disabled={loading}
                className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">key</span>
                    Verify Credentials
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[10px] text-slate-600 mt-6 font-medium">
              🔒 Secured with 2FA · All access is logged and audited
            </p>
          </div>
        )}

        {/* ── STEP 2: TOTP Verification ── */}
        {step === "totp" && (
          <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/40">
            {/* Header */}
            <div className="text-center space-y-4 mb-8">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 items-center justify-center">
                <span className="material-symbols-outlined text-[30px] text-violet-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                  phonelink_lock
                </span>
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Two-Factor Auth</h1>
                <p className="text-xs text-slate-400 font-medium mt-1.5">
                  Open your authenticator app and enter the 6-digit code for{" "}
                  <span className="text-violet-400 font-bold">@{adminUsername}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="h-1.5 w-5 rounded-full bg-slate-700" />
                <div className="h-1.5 w-5 rounded-full bg-slate-700" />
                <div className="h-1.5 w-8 rounded-full bg-violet-500" />
              </div>
            </div>

            <form onSubmit={handleTOTPSubmit} className="space-y-5">
              {/* 6-digit segmented input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">dialpad</span>
                  Authenticator Code
                </label>
                <input
                  ref={totpInputRef}
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => { handleTOTPInput(e.target.value); clearError(); }}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="w-full h-16 bg-slate-950/80 border border-slate-800 rounded-xl px-4 text-3xl font-black text-white text-center outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all tracking-[0.5em] placeholder:text-slate-700 placeholder:tracking-[0.3em]"
                />
                <p className="text-center text-[10px] text-slate-500">
                  Or enter a recovery code (format: XXXX-XXXX-XXXX-XXXX)
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl p-3 text-xs font-semibold flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">error</span>
                  {error}
                </div>
              )}

              {infoMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  {infoMsg}
                </div>
              )}

              <button
                type="submit"
                id="totp-verify-btn"
                disabled={loading || totpCode.length < 6}
                className="w-full h-12 bg-violet-500 hover:bg-violet-400 active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    Confirm & Enter
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep("credentials"); setError(""); setTotpCode(""); }}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition font-medium py-2"
              >
                ← Back to credentials
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2b: TOTP First-Time Setup ── */}
        {step === "totp_setup" && !showRecoveryCodes && (
          <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/40">
            <div className="text-center space-y-3 mb-6">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center">
                <span className="material-symbols-outlined text-[30px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                  qr_code_scanner
                </span>
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Setup 2FA</h1>
                <p className="text-xs text-slate-400 mt-1.5">First login — secure your account with an authenticator app</p>
              </div>
            </div>

            {/* QR Code display */}
            {qrUrl ? (
              <div className="bg-white p-3 rounded-2xl flex items-center justify-center mb-4 mx-auto w-fit">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUrl)}&size=160x160&format=png&margin=0`}
                  alt="TOTP QR Code"
                  className="w-40 h-40"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 text-center">
                <p className="text-xs text-slate-400">Loading QR code...</p>
              </div>
            )}

            {totpSecret && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 mb-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">Manual Entry Secret</p>
                <p className="text-xs font-mono text-cyan-400 break-all">{totpSecret}</p>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center mb-4">
              Scan with <strong className="text-white">Google Authenticator</strong>, <strong className="text-white">Authy</strong>, or any TOTP app. Then confirm with a code.
            </p>

            <form onSubmit={handleTOTPSetupConfirm} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Confirm 6-digit Code
                </label>
                <input
                  ref={totpInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => { handleSetupCodeInput(e.target.value); clearError(); }}
                  placeholder="000000"
                  className="w-full h-14 bg-slate-950/80 border border-slate-800 rounded-xl px-4 text-2xl font-black text-white text-center outline-none focus:border-amber-500/60 transition-all tracking-[0.5em] placeholder:text-slate-700"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl p-3 text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || setupCode.length < 6}
                className="w-full h-12 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-widest rounded-full transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Activate 2FA
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── Recovery Codes Screen ── */}
        {step === "totp_setup" && showRecoveryCodes && (
          <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/40">
            <div className="text-center space-y-3 mb-6">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
                <span className="material-symbols-outlined text-[30px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              <div>
                <h1 className="text-xl font-black text-white">2FA Activated!</h1>
                <p className="text-xs text-slate-400 mt-1.5">Save your recovery codes before continuing</p>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">warning</span>
              <p className="text-xs text-amber-300 font-semibold leading-relaxed">
                These 8 recovery codes will NEVER be shown again. Save them somewhere safe. Each can only be used once if you lose access to your authenticator.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {recoveryCodes.map((code, i) => (
                <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-cyan-300 text-center tracking-wider">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={downloadRecoveryCodes}
                className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))}
                className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                Copy All
              </button>
            </div>

            <button
              onClick={handleSetupComplete}
              disabled={loading}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  I&apos;ve saved my codes — Enter Dashboard
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom security note */}
        <p className="text-center text-[10px] text-slate-700 mt-4">
          Felbic Admin · All sessions audited · Unauthorized access is a violation
        </p>
      </main>
    </div>
  );
}
