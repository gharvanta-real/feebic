"use client";

import React, { useEffect, useState } from "react";
import { AdminPageHeader } from "@/app/admin/layout";
import { SectionCard, SectionHeader, LoadingSpinner } from "@/components/admin/ui";
import { PrimaryBtn } from "@/components/admin/controls";
import { adminSettingsApi, PlatformSettings } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function SettingsPage() {
  const { adminUser, showToast } = useAdminAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states matching PlatformSettings structure
  const [newSignups, setNewSignups] = useState(true);
  const [creatorVerification, setCreatorVerification] = useState(true);
  const [autoPayouts, setAutoPayouts] = useState(false);
  const [liveMonitoring, setLiveMonitoring] = useState(true);
  const [platformFee, setPlatformFee] = useState(20);
  const [maxPpvPrice, setMaxPpvPrice] = useState(999);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await adminSettingsApi.get();
      if (data) {
        setSettings(data);
        setNewSignups(data.newSignups);
        setCreatorVerification(data.creatorVerification);
        setAutoPayouts(data.autoPayouts);
        setLiveMonitoring(data.liveMonitoring);
        setPlatformFee(data.platformFee);
        setMaxPpvPrice(data.maxPpvPrice);
      }
    } catch {
      showToast("Failed to fetch platform configurations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: PlatformSettings = {
        newSignups,
        creatorVerification,
        autoPayouts,
        liveMonitoring,
        platformFee,
        maxPpvPrice,
      };
      await adminSettingsApi.update(payload);
      showToast("Platform configuration updated successfully");
      setSettings(payload);
    } catch {
      showToast("Failed to update platform settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setNewSignups(true);
    setCreatorVerification(true);
    setAutoPayouts(false);
    setLiveMonitoring(true);
    setPlatformFee(20);
    setMaxPpvPrice(999);
    showToast("Form parameters reset to factory defaults (unsaved preview)");
  };

  // Enforce Administrator role constraint
  if (adminUser?.role !== "admin") {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Platform Settings" sub="Configure operational parameters for signups, KYC, PPV payouts, and billing fees." />
        <SectionCard className="border-red-500/20 bg-red-500/[0.02]">
          <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
            <span className="material-symbols-outlined text-[48px] text-red-400">gavel</span>
            <div>
              <p className="text-sm font-black text-red-400 tracking-wider">Access Denied: Administrator Role Required</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5 max-w-md mx-auto leading-relaxed">
                Your account is currently assigned the role <span className="font-bold text-[var(--color-text-main)]">@{adminUser?.role}</span>. Editing system settings is strictly restricted to platform owners and executive administrators.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Platform Control Settings"
        sub="Adjust fees, limit billing bounds, block new user registrations, and toggle real-time moderation flows."
      />

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Toggles Panel */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard>
              <SectionHeader title="Operational Flags & Controls" sub="Configure system-wide active flows and validations." />

              <div className="divide-y divide-[var(--border)]/50 space-y-5">
                {/* Signups */}
                <div className="flex items-center justify-between pt-5 first:pt-0">
                  <div className="max-w-[80%]">
                    <p className="text-xs font-bold text-[var(--color-text-main)]">Allow Public Signups</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                      Enable or disable new user account registrations. Toggling this off stops user/creator signups immediately.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSignups}
                      onChange={(e) => setNewSignups(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[var(--background)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--border)] peer-checked:after:bg-[var(--color-primary)] after:border-[var(--border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--color-primary)]/10 peer-checked:border-[var(--color-primary)]/30" />
                  </label>
                </div>

                {/* KYC verification */}
                <div className="flex items-center justify-between pt-5">
                  <div className="max-w-[80%]">
                    <p className="text-xs font-bold text-[var(--color-text-main)]">Enforce Creator KYC Verification</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                      Mandate automated identity and document review before allowing creators to publish post files, trigger wallets, or run live streams.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creatorVerification}
                      onChange={(e) => setCreatorVerification(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[var(--background)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--border)] peer-checked:after:bg-[var(--color-primary)] after:border-[var(--border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--color-primary)]/10 peer-checked:border-[var(--color-primary)]/30" />
                  </label>
                </div>

                {/* Auto Payouts */}
                <div className="flex items-center justify-between pt-5">
                  <div className="max-w-[80%]">
                    <p className="text-xs font-bold text-[var(--color-text-main)]">Auto-approve Creator Payout Requests</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                      Process financial wallet balances to bank links automatically. Note: Toggling this on bypasses manual staff bank auditing (dangerous).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPayouts}
                      onChange={(e) => setAutoPayouts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[var(--background)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--border)] peer-checked:after:bg-[var(--color-primary)] after:border-[var(--border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--color-primary)]/10 peer-checked:border-[var(--color-primary)]/30" />
                  </label>
                </div>

                {/* Stream monitoring */}
                <div className="flex items-center justify-between pt-5">
                  <div className="max-w-[80%]">
                    <p className="text-xs font-bold text-[var(--color-text-main)]">Automated Live Stream AI Monitoring</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                      Run background frame scanning filters on live creator streams to flag violent, explicit, or copyright violations in real-time.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveMonitoring}
                      onChange={(e) => setLiveMonitoring(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[var(--background)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--border)] peer-checked:after:bg-[var(--color-primary)] after:border-[var(--border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--color-primary)]/10 peer-checked:border-[var(--color-primary)]/30" />
                  </label>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Pricing Parameters & Sliders */}
          <div className="space-y-6">
            <SectionCard>
              <SectionHeader title="Financial Fee Bounds" sub="Adjust active billing cuts and pricing limits." />

              <div className="space-y-5 text-xs">
                {/* Platform Cut */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Platform Take Fee %</label>
                    <span className="text-[var(--color-primary)] font-black">{platformFee}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={platformFee}
                    onChange={(e) => setPlatformFee(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                  />
                  <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] font-medium">
                    <span>5% Min</span>
                    <span>50% Max (India Cap)</span>
                  </div>
                </div>

                {/* PPV Max Price */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] tracking-wider">Max Creator PPV Price (INR)</label>
                    <span className="text-[var(--color-primary)] font-black">₹{maxPpvPrice}</span>
                  </div>
                  <input
                    type="range"
                    min={99}
                    max={9999}
                    step={50}
                    value={maxPpvPrice}
                    onChange={(e) => setMaxPpvPrice(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                  />
                  <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] font-medium">
                    <span>₹99 Min</span>
                    <span>₹9,999 Max PPV Cap</span>
                  </div>
                </div>
              </div>

              {/* Form Operations */}
              <div className="space-y-3.5 mt-6 border-t border-[var(--color-border)]/50 pt-5">
                <PrimaryBtn type="submit" loading={saving} className="w-full">
                  Commit Settings Changes
                </PrimaryBtn>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="w-full h-10 border border-[var(--border)] text-[var(--color-text-muted)] font-bold text-xs rounded-full hover:border-[var(--color-text-muted)] transition cursor-pointer"
                >
                  Reset Form to Defaults
                </button>
              </div>
            </SectionCard>
          </div>
        </form>
      )}
    </div>
  );
}
