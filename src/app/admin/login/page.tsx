"use client";
 
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
 
type LoginResponse = {
  token: string;
};
 
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
 
  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("ch_admin_token");
    if (token) {
      apiClient.get("/users/profile")
        .then((profile) => {
          if (profile && (profile.username === "gharvanta" || profile.email === "gharvanta@gmail.com")) {
            router.replace("/admin");
          }
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem("ch_admin_token");
        });
    }
  }, [router]);
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
 
    const emailTrimmed = email.trim().toLowerCase();
 
    // Enforce admin email restriction
    if (emailTrimmed !== "gharvanta@gmail.com") {
      setError("Access Denied: Only platform administrators can log in here.");
      setLoading(false);
      return;
    }
 
    try {
      const res = await apiClient.post<LoginResponse>("/auth/login", {
        email: emailTrimmed,
        password,
      });
 
      localStorage.setItem("ch_admin_token", res.token);
      router.replace("/admin");
    } catch (err: any) {
      setError(err.message || "Invalid administrator credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Visual glowing backgrounds */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* Admin Login Box */}
      <main className="w-full max-w-[420px] bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative z-10 mx-4">
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              admin_panel_settings
            </span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">felbic ops</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1">Audit & Operations Center</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Auditor Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@felbic.com"
              required
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-semibold text-white outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Verification Code / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-semibold text-white outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-cyan-500 hover:bg-cyan-600 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg shadow-cyan-500/10 transition cursor-pointer disabled:opacity-60"
          >
            {loading ? "Verifying Keys..." : "Access Control"}
          </button>
        </form>
      </main>
    </div>
  );
}
