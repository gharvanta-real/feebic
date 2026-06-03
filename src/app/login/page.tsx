"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { AuthError, AuthField, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { useUser } from "@/context/UserContext";

type LoginResponse = {
  token: string;
};

type AuthMode = "login" | "reset-email" | "reset-code";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUserProfile } = useUser();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      localStorage.setItem("ch_token", response.token);
      localStorage.removeItem("ch_logged_out");
      if (remember) localStorage.setItem("ch_remember_session", "true");
      await refreshUserProfile();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const startReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiClient.post("/auth/password/reset/start", {
        email: email.trim().toLowerCase(),
      });
      setMode("reset-code");
      setMessage("reset code sent to your email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not send reset code");
    } finally {
      setLoading(false);
    }
  };

  const completeReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiClient.post("/auth/password/reset/verify", {
        email: email.trim().toLowerCase(),
        code: resetCode.trim(),
        new_password: newPassword,
      });
      setPassword("");
      setNewPassword("");
      setResetCode("");
      setMode("login");
      setMessage("password updated. you can log in now");
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell mode="login">
      <form onSubmit={mode === "login" ? submit : mode === "reset-email" ? startReset : completeReset} className="space-y-5">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold leading-tight text-slate-900">
            {mode === "login" ? "log in to Felbic" : mode === "reset-email" ? "reset password" : "create new password"}
          </h1>
          <p className="text-sm font-normal leading-6 text-slate-500">
            {mode === "login"
              ? "access messages, premium posts, wallet, and creator tools from one account."
              : mode === "reset-email"
                ? "enter your account email and we will send a reset code."
                : `enter the code sent to ${email} and choose a new password.`}
          </p>
        </div>

        {mode === "login" && (
          <div className="space-y-3">
            <AuthField label="email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
            <AuthField label="password" value={password} onChange={setPassword} type="password" placeholder="minimum 8 characters" minLength={8} required />
          </div>
        )}

        {mode === "reset-email" && (
          <AuthField label="email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
        )}

        {mode === "reset-code" && (
          <div className="space-y-3">
            <AuthField label="reset code" value={resetCode} onChange={setResetCode} inputMode="numeric" placeholder="6 digit code" required />
            <AuthField label="new password" value={newPassword} onChange={setNewPassword} type="password" placeholder="minimum 8 characters" minLength={8} required />
            <button type="button" onClick={startReset} disabled={loading} className="rounded-sm text-xs font-medium text-sky-600 outline-none transition hover:text-sky-700 hover:underline focus:ring-2 focus:ring-sky-100 disabled:opacity-50">
              resend code
            </button>
          </div>
        )}

        {mode === "login" && (
          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-normal text-slate-500">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-[#d8e2ee] text-sky-500 accent-sky-500"
              />
              remember sign in details
            </label>
            <button type="button" onClick={() => { setMode("reset-email"); setError(""); setMessage(""); }} className="rounded-sm text-xs font-medium text-sky-600 outline-none transition hover:text-sky-700 hover:underline focus:ring-2 focus:ring-sky-100">
              forgot password?
            </button>
          </div>
        )}

        <AuthError message={error} />
        {message && <p className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">{message}</p>}

        <button
          disabled={loading}
          className="h-11 w-full rounded-md bg-sky-500 text-sm font-semibold text-white outline-none transition hover:bg-sky-600 focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
        >
          {loading ? "please wait..." : mode === "login" ? "log in" : mode === "reset-email" ? "send reset code" : "update password"}
        </button>

        {mode !== "login" && (
          <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} className="w-full rounded-sm text-sm font-medium text-slate-500 outline-none transition hover:text-slate-900 hover:underline focus:ring-2 focus:ring-sky-100">
            back to login
          </button>
        )}

        {mode === "login" && <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>}

        {mode === "login" && <p className="text-center text-sm font-normal text-slate-500">
          do not have an account?{" "}
          <Link className="rounded-sm font-medium text-sky-600 outline-none transition hover:text-sky-700 hover:underline focus:ring-2 focus:ring-sky-100" href="/sign-up">
            sign up
          </Link>
        </p>}
      </form>
    </AuthSplitShell>
  );
}
