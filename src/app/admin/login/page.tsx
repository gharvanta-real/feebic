"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useAdminAuth } from "@/context/AdminAuthContext";

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

function AdminLoginPageContent() {
  const router = useRouter();
  const { showToast } = useAdminAuth();
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

  // Auto-focus TOTP input
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

      if (res.totp_setup) {
        setStep("totp_setup");
        await fetchTOTPSetup(res.step1_token);
      } else {
        setStep("totp");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid administrative credentials");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch TOTP Setup ───────────────────────────────────────────────────────
  const fetchTOTPSetup = async (tempToken: string) => {
    try {
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
      // Setup QR code fallback
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

      persistAdminSession(res.token);

      setInfoMsg("Access granted. Launching Operations Center...");
      setTimeout(() => router.replace(returnTo), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid 2FA authentication code");
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
        throw new Error(data.error || "2FA activation failed");
      }

      const data = await res.json();
      setRecoveryCodes(data.recovery_codes || []);
      setShowRecoveryCodes(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid confirmation code");
      setSetupCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    clearError();
    setLoading(true);
    try {
      const res = await apiClient.post<ConfirmResponse>("/admin-auth/totp/verify", {
        step1_token: step1Token,
        totp_code: setupCode,
      });
      persistAdminSession(res.token);
      router.replace(returnTo);
    } catch {
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

  const persistAdminSession = (token: string) => {
    localStorage.setItem("ch_admin_token", token);
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `ch_admin_token=${token}; path=/; samesite=strict; max-age=43200${secure}`;
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

  return (
    <main className="grid min-h-screen bg-[var(--background)] text-[var(--color-text-main)] lg:grid-cols-[minmax(520px,50vw)_1fr]">
      
      {/* Left split-pane: RED color design block */}
      <section className="relative hidden min-h-screen overflow-hidden bg-red-600 lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#b91c1c_0%,#dc2626_56%,#ef4444_100%)]" />
        <div className="absolute -left-56 bottom-[-34vh] h-[78vh] w-[78vh] rounded-full bg-white/10" />
        <div className="absolute bottom-[-18vh] left-[12vw] h-[68vh] w-[68vh] rotate-[-13deg] rounded-[44%] bg-white/12" />
        <div className="absolute right-[-14vw] top-[18vh] h-[38vh] w-[38vh] rounded-full bg-white/10" />
        
        <div className="absolute left-[18%] top-[15%] max-w-[430px] text-white">
          <div className="mb-10 flex items-center gap-3">
            <img src="/logo.png" alt="Felbic logo" className="h-11 w-11 object-contain brightness-0 invert" />
            <span className="text-4xl font-semibold tracking-tight">felbic <span className="text-red-300 font-light text-xl tracking-wider pl-1.5">Admin</span></span>
          </div>
          <p className="text-[40px] font-normal leading-tight tracking-normal">
            access control room & operations
          </p>
        </div>
      </section>

      {/* Right split-pane: Authentication Flow forms */}
      <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[390px] space-y-6">
          
          {/* Mobile view Logo header */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Felbic logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-semibold tracking-tight text-[var(--color-text-main)]">
                <span>fel</span>
                <span className="text-red-500">bic</span>
                <span className="text-[var(--color-text-muted)] font-light text-xs pl-1.5 tracking-widest">Admin</span>
              </span>
            </div>
          </div>

          {/* Step 1: Credentials input */}
          {step === "credentials" && (
            <form onSubmit={handleCredentialSubmit} className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-tight text-[var(--color-text-main)]">
                  log in to Felbic Admin
                </h1>
                <p className="text-sm font-normal leading-6 text-[var(--color-text-muted)]">
                  authorized operations staff access only. credentials verification and all activities are monitored.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]">admin email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    placeholder="admin@felbic.com"
                    autoComplete="email"
                    className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal text-[var(--color-text-main)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-red-100 focus:border-red-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]">password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    placeholder="minimum 10 characters"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal text-[var(--color-text-main)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-red-100 focus:border-red-500"
                  />
                </label>
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-md bg-red-600 text-sm font-semibold text-white outline-none transition hover:bg-red-700 focus:ring-2 focus:ring-red-100 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? "verifying..." : "log in as admin"}
              </button>
            </form>
          )}

          {/* Step 2: 2FA/TOTP Code prompt */}
          {step === "totp" && (
            <form onSubmit={handleTOTPSubmit} className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-tight text-[var(--color-text-main)] font-bold">
                  Enter 2FA Code
                </h1>
                <p className="text-sm font-normal leading-6 text-[var(--color-text-muted)]">
                  enter the 6-digit verification code from your authenticator app for <span className="font-semibold text-[var(--color-text-main)]">@{adminUsername}</span>.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]">verification code</span>
                  <input
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, "")); clearError(); }}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-center text-lg font-bold text-[var(--color-text-main)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-red-100 focus:border-red-500 tracking-[0.2em]"
                  />
                </label>
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              {infoMsg && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {infoMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || totpCode.length < 6}
                className="h-11 w-full rounded-md bg-red-600 text-sm font-semibold text-white outline-none transition hover:bg-red-700 focus:ring-2 focus:ring-red-100 disabled:opacity-60 cursor-pointer"
              >
                {loading ? "authenticating..." : "verify and enter"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("credentials"); setError(""); setTotpCode(""); }}
                className="w-full text-center text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition hover:underline"
              >
                back to credentials
              </button>
            </form>
          )}

          {/* Step 2b: First-time TOTP Setup with recovery codes */}
          {step === "totp_setup" && !showRecoveryCodes && (
            <form onSubmit={handleTOTPSetupConfirm} className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-tight text-[var(--color-text-main)]">
                  Configure Two-Factor Auth
                </h1>
                <p className="text-sm font-normal leading-6 text-[var(--color-text-muted)]">
                  first login detect. scan this QR code with Google Authenticator or Authy to configure 2FA.
                </p>
              </div>

              {qrUrl ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] p-3.5 rounded-xl flex items-center justify-center w-fit mx-auto shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUrl)}&size=150x150&format=png&margin=0`}
                    alt="2FA QR Code"
                    className="w-36 h-36"
                  />
                </div>
              ) : (
                <div className="h-36 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                  loading scanner parameters...
                </div>
              )}

              {totpSecret && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-xs leading-normal">
                  <p className="text-[10px] font-black text-[var(--color-text-muted)] tracking-wider mb-1">Manual secret entry key</p>
                  <p className="font-mono text-red-600 font-semibold break-all select-all">{totpSecret}</p>
                </div>
              )}

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]">confirm setup code</span>
                  <input
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={setupCode}
                    onChange={(e) => { setSetupCode(e.target.value.replace(/\D/g, "")); clearError(); }}
                    placeholder="000000"
                    className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-center text-lg font-bold text-[var(--color-text-main)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-red-100 focus:border-red-500 tracking-[0.2em]"
                  />
                </label>
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || setupCode.length < 6}
                className="h-11 w-full rounded-md bg-red-600 text-sm font-semibold text-white outline-none transition hover:bg-red-700 focus:ring-2 focus:ring-red-100 disabled:opacity-60 cursor-pointer"
              >
                {loading ? "activating 2FA..." : "verify and configure"}
              </button>
            </form>
          )}

          {/* Step 2c: Setup complete, display recovery codes */}
          {step === "totp_setup" && showRecoveryCodes && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-tight text-emerald-700">
                  2FA Configured!
                </h1>
                <p className="text-sm font-normal leading-6 text-[var(--color-text-muted)]">
                  save these recovery backup codes safely. they will not be shown again.
                </p>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-normal text-amber-700 font-semibold">
                ⚠️ Store these codes securely. You can use them to recover access if you lose your phone or 2FA keys.
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-center text-[var(--color-text-main)] font-bold select-all tracking-wide">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={downloadRecoveryCodes}
                  className="flex-1 h-10 bg-[var(--border)] hover:bg-[var(--border)]/80 border border-[var(--border)] text-[var(--color-text-main)] font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Download
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(recoveryCodes.join("\n"));
                    showToast?.("Recovery codes copied to clipboard", "success");
                  }}
                  className="flex-1 h-10 bg-[var(--border)] hover:bg-[var(--border)]/80 border border-[var(--border)] text-[var(--color-text-main)] font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Copy All
                </button>
              </div>

              <button
                onClick={handleSetupComplete}
                className="h-11 w-full rounded-md bg-emerald-600 text-sm font-semibold text-white outline-none transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
              >
                Saved codes — Enter Dashboard
              </button>
            </div>
          )}

          <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-8 font-medium">
            🔒 Secured with Multi-Factor Authentication · All actions are logged
          </p>
        </div>
      </section>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-[var(--color-text-main)] font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
          <span className="text-sm tracking-wider">Loading Ops Control Room...</span>
        </div>
      </div>
    }>
      <AdminLoginPageContent />
    </Suspense>
  );
}
