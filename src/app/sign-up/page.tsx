"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { AuthError, AuthField, AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { useUser } from "@/context/UserContext";

type Step = 1 | 2 | 3;
type VerifyResponse = {
  token: string;
};

type UsernameState = {
  status: "idle" | "checking" | "available" | "taken" | "invalid";
  message: string;
  suggestions: string[];
};

const steps: Array<{ id: Step; label: string }> = [
  { id: 1, label: "role" },
  { id: 2, label: "details" },
  { id: 3, label: "verify" },
];

export default function SignUpPage() {
  const router = useRouter();
  const { refreshUserProfile } = useUser();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"fan" | "creator">("fan");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("India");
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState<UsernameState>({
    status: "idle",
    message: "",
    suggestions: [],
  });
  const [code, setCode] = useState("");

  useEffect(() => {
    if (step !== 2) return;
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      setUsernameState({ status: "idle", message: "", suggestions: [] });
      return;
    }
    if (clean.length < 3 || clean.length > 30 || !/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(clean) || clean.includes("..")) {
      setUsernameState({
        status: "invalid",
        message: "username must be 3-30 chars: letters, numbers, period, underscore",
        suggestions: [],
      });
      return;
    }

    setUsernameState({ status: "checking", message: "checking username...", suggestions: [] });
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiClient.get<{ available: boolean; suggestions?: string[] }>(`/auth/username/${encodeURIComponent(clean)}`);
        if (result.available) {
          setUsernameState({ status: "available", message: "username available", suggestions: [] });
        } else {
          setUsernameState({
            status: "taken",
            message: "username already taken",
            suggestions: result.suggestions || [],
          });
        }
      } catch (err) {
        setUsernameState({
          status: "taken",
          message: err instanceof Error ? err.message : "username check failed",
          suggestions: [],
        });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [step, username]);

  const canContinue = useMemo(() => {
    if (step === 1) return !!role;
    if (step === 2) {
      return (
        displayName.trim().length >= 2 &&
        email.includes("@") &&
        password.length >= 8 &&
        phone.trim().length >= 7 &&
        country.trim().length >= 2 &&
        usernameState.status === "available"
      );
    }
    return code.trim().length >= 4;
  }, [code, country, displayName, email, password, phone, role, step, usernameState.status]);

  const sendCode = async () => {
    setError("");
    setLoading(true);
    try {
      await apiClient.post("/auth/register/start", {
        role,
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        country: country.trim(),
        username: username.trim().toLowerCase(),
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not send verification code");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await apiClient.post<VerifyResponse>("/auth/register/verify", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      localStorage.setItem("ch_token", response.token);
      localStorage.removeItem("ch_logged_out");
      await refreshUserProfile();
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "verification failed");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContinue || loading) return;
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      await sendCode();
      return;
    }
    await verify();
  };

  return (
    <AuthSplitShell mode="signup">
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold leading-tight text-slate-900">
            {step === 1 ? "choose your Felbic mode" : step === 2 ? "complete your profile" : "verify your email"}
          </h1>
          <p className="text-sm font-normal leading-6 text-slate-500">
            {step === 1
              ? "start as a visitor or creator. you can switch later from settings."
              : step === 2
                ? "these details create your web and mobile account."
                : `enter the code sent to ${email}.`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {steps.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.id < step && setStep(item.id)}
              className={`h-9 rounded-md border text-xs font-medium transition ${
                item.id === step
                  ? "auth-step-current bg-sky-500 text-white"
                  : item.id < step
                    ? "auth-step-done bg-sky-50 text-sky-600"
                    : "auth-step-idle bg-white text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.id}. {item.label}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              active={role === "fan"}
              title="visitor"
              subtitle="follow creators, unlock posts, chat, tip, and save favorites."
              icon="person"
              onClick={() => setRole("fan")}
            />
            <RoleCard
              active={role === "creator"}
              title="creator"
              subtitle="publish premium content, manage subscribers, calls, vault, and payouts."
              icon="auto_awesome"
              onClick={() => setRole("creator")}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <AuthField label="full name" value={displayName} onChange={setDisplayName} placeholder="your public name" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <AuthField label="email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
              <div>
                <AuthField label="username" value={username} onChange={(value) => setUsername(value.toLowerCase().replace(/^@/, ""))} placeholder="yourhandle" required />
                {usernameState.message && (
                  <p
                    className={`mt-1.5 text-xs font-medium ${
                      usernameState.status === "available"
                        ? "text-emerald-600"
                        : usernameState.status === "checking"
                          ? "text-slate-500"
                          : "text-red-600"
                    }`}
                  >
                    {usernameState.message}
                  </p>
                )}
                {usernameState.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {usernameState.suggestions.map((name) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() => setUsername(name)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-400 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      >
                        @{name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <AuthField label="password" value={password} onChange={setPassword} type="password" placeholder="minimum 8 characters" minLength={8} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <AuthField label="phone" value={phone} onChange={setPhone} placeholder="+91..." required />
              <AuthField label="country" value={country} onChange={setCountry} required />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="border-l-2 border-sky-500 pl-3">
              <p className="text-sm font-medium text-slate-900">check your inbox</p>
              <p className="mt-1 text-xs font-normal leading-5 text-slate-500">
                we sent a secure verification code. it keeps account creation clean and protects duplicate profiles.
              </p>
            </div>
            <AuthField label="email code" value={code} onChange={setCode} inputMode="numeric" placeholder="6 digit code" required />
            <button type="button" onClick={sendCode} disabled={loading} className="rounded-sm text-xs font-medium text-sky-600 outline-none transition hover:text-sky-700 hover:underline focus:ring-2 focus:ring-sky-100 disabled:opacity-50">
              resend code
            </button>
          </div>
        )}

        <AuthError message={error} />

        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
              className="auth-soft-button h-11 w-24 rounded-md border text-sm font-medium text-slate-500 outline-none transition hover:text-slate-900 focus:ring-2 focus:ring-sky-100"
            >
              back
            </button>
          )}
          <button
            disabled={!canContinue || loading}
            className="h-11 flex-1 rounded-md bg-sky-500 text-sm font-semibold text-white outline-none transition hover:bg-sky-600 focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
          >
            {loading ? "please wait..." : step === 1 ? "continue" : step === 2 ? "send code" : "verify account"}
          </button>
        </div>

        <p className="text-center text-sm font-normal text-slate-500">
          already have an account?{" "}
          <Link href="/login" className="rounded-sm font-medium text-sky-600 outline-none transition hover:text-sky-700 hover:underline focus:ring-2 focus:ring-sky-100">
            log in
          </Link>
        </p>
      </form>
    </AuthSplitShell>
  );
}

function RoleCard({
  active,
  title,
  subtitle,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[154px] flex-col items-start gap-3 rounded-md border p-3.5 text-left outline-none transition focus:ring-2 focus:ring-sky-100 ${
        active ? "auth-role-active bg-sky-50" : "auth-role-idle hover:bg-slate-50"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${active ? "border-sky-100 bg-white text-sky-500" : "border-slate-100 bg-slate-50 text-slate-400"}`}>
        <span className="material-symbols-outlined text-[21px]">
          {icon}
        </span>
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{subtitle}</span>
      </span>
    </button>
  );
}
