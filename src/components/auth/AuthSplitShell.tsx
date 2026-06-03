"use client";

import React from "react";
import Link from "next/link";

export function AuthSplitShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white text-slate-900 lg:grid-cols-[minmax(520px,50vw)_1fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-sky-500 lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#07a9e6_0%,#18b7ed_56%,#35c8f4_100%)]" />
        <div className="absolute -left-56 bottom-[-34vh] h-[78vh] w-[78vh] rounded-full bg-white/10" />
        <div className="absolute bottom-[-18vh] left-[12vw] h-[68vh] w-[68vh] rotate-[-13deg] rounded-[44%] bg-white/14" />
        <div className="absolute right-[-14vw] top-[18vh] h-[38vh] w-[38vh] rounded-full bg-white/10" />
        <div className="absolute left-[18%] top-[15%] max-w-[430px] text-white">
          <div className="mb-10 flex items-center gap-3">
            <img src="/logo.png" alt="Felbic logo" className="h-11 w-11 object-contain" />
            <span className="text-4xl font-semibold tracking-tight">felbic</span>
          </div>
          <p className="text-[40px] font-normal leading-tight tracking-normal">
            sign up to support your favorite creators
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[390px]">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Felbic logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-semibold tracking-tight text-slate-900">
                <span>fel</span>
                <span className="text-sky-500">bic</span>
              </span>
            </Link>
            <Link href={mode === "login" ? "/sign-up" : "/login"} className="rounded-sm text-sm font-medium text-sky-600 outline-none transition hover:text-sky-700 hover:underline focus:ring-2 focus:ring-sky-100">
              {mode === "login" ? "sign up" : "login"}
            </Link>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  minLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        minLength={minLength}
        inputMode={inputMode}
        placeholder={placeholder}
        className="auth-input h-11 w-full rounded-md border bg-white px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}
