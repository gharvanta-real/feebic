"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { mockDb } from "@/lib/mockDb";
import { apiClient } from "@/lib/apiClient";

export default function MonetizationSettingsPage() {
  const { showToast, user, updateProfile, refreshUserProfile } = useUser();
  const [subPrice, setSubPrice] = useState("9.99");
  
  // Bank connection states
  const [accountHolder, setAccountHolder] = useState("Alex Rivera");
  const [routingNumber, setRoutingNumber] = useState("123456789");
  const [accountNumber, setAccountNumber] = useState("987654321");
  const [bankName, setBankName] = useState("State Bank of India");
  const [isLinked, setIsLinked] = useState(false);

  // Discount campaign states
  const [discountActive, setDiscountActive] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("20");

  // Call states
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [callPricePerMin, setCallPricePerMin] = useState("5.00");

  useEffect(() => {
    if (user) {
      setSubPrice((user.subPrice ?? 9.99).toFixed(2));
      setDiscountActive(!!user.discountActive);
      setDiscountPercent((user.discountPercent ?? 20).toString());
      setCallsEnabled(!!user.callsEnabled);
      setCallPricePerMin((user.callRate ?? 5.00).toFixed(2));
    }
    
    fetchBankDetails();
  }, [user]);

  const fetchBankDetails = async () => {
    try {
      const data = await apiClient.get<any>("/wallet/bank");
      if (data && data.linked) {
        setIsLinked(true);
        setAccountHolder(data.accountHolder || "");
        setRoutingNumber(data.routingNumber || "");
        setAccountNumber(data.accountNumber || "");
        setBankName(data.bankName || "");
      } else {
        setIsLinked(false);
      }
    } catch (err) {
      console.error("Failed to load bank details", err);
    }
  };

  const handlePriceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.min(99.99, Math.max(4.99, parseFloat(subPrice) || 9.99));
    setSubPrice(price.toFixed(2));
    
    const success = await updateProfile({ subPrice: price });
    if (success) {
      showToast(`Subscription price updated to $${price.toFixed(2)}/mo`);
    }
  };

  const handleBankSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await apiClient.post<any>("/wallet/bank", {
        bankName,
        accountHolder,
        routingNumber,
        accountNumber
      });
      setIsLinked(data.linked);
      showToast("Bank account details linked successfully!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to link bank account");
    }
  };

  const handleDiscountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const percentNum = Math.min(90, Math.max(5, parseInt(discountPercent) || 20));
    setDiscountPercent(percentNum.toString());

    try {
      await apiClient.put("/users/monetization/discount", {
        discount_active: discountActive,
        discount_percent: percentNum,
      });
      showToast(
        `Discount campaign updated: ${
          discountActive ? `${percentNum}% OFF active globally` : "Deactivated successfully"
        }`
      );
      refreshUserProfile();
    } catch (err: any) {
      showToast(err.message || "Failed to update discount campaign");
    }
  };

  const handleCallsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Math.min(20.00, Math.max(1.00, parseFloat(callPricePerMin) || 5.00));
    setCallPricePerMin(rate.toFixed(2));

    try {
      await apiClient.put("/users/monetization/calls", {
        calls_enabled: callsEnabled,
        call_rate: rate,
      });
      showToast(
        `Private call settings updated: ${
          callsEnabled ? `$${rate.toFixed(2)}/min calls active` : "Deactivated direct calls"
        }`
      );
      refreshUserProfile();
    } catch (err: any) {
      showToast(err.message || "Failed to update call settings");
    }
  };

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1 select-none">
          <h1 className="text-base font-extrabold text-text-main">Monetization Settings</h1>
          <p className="text-xs text-text-muted">Configure subscription pricing and link direct payout accounts.</p>
        </div>

        {/* 1. Subscription Price setup form */}
        <form onSubmit={handlePriceSave} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border select-none">
            Subscription Tier Pricing
          </h2>
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">
              Base Monthly Subscription Fee (USD)
            </label>
            <div className="relative flex items-center bg-background border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-all">
              <span className="text-xs font-bold text-text-muted mr-1 select-none">$</span>
              <input
                type="number"
                step="0.01"
                required
                value={subPrice}
                onChange={(e) => setSubPrice(e.target.value)}
                className="w-full text-xs bg-transparent outline-none text-text-main"
              />
              <span className="text-[10px] font-bold text-text-muted shrink-0 ml-1 select-none">/ month</span>
            </div>
            <p className="text-[10px] text-text-muted mt-2 leading-relaxed select-none">
              Felbic enforces subscription tier caps: minimum <strong>$4.99</strong>, maximum <strong>$99.99</strong>.
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
          >
            <span>Save Tier Configuration</span>
            <span className="material-symbols-outlined text-[16px] leading-none font-bold">check</span>
          </button>
        </form>

        {/* 2. Direct Payouts setup form */}
        <form onSubmit={handleBankSave} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-1 border-b border-border select-none">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Payout Bank Account
            </h2>
            {isLinked && (
              <span className="bg-success/10 text-success text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span>
                <span>Active</span>
              </span>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Bank Name</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Account Holder Name</label>
            <input
              type="text"
              required
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Routing Number</label>
              <input
                type="text"
                required
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Account Number</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <span>{isLinked ? "Update Linked Account" : "Link Payout Account"}</span>
            <span className="material-symbols-outlined text-[16px] leading-none font-bold">account_balance</span>
          </button>
        </form>

        {/* 3. Promotional Discount Campaigns form */}
        <form onSubmit={handleDiscountSave} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-1 border-b border-border select-none">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Subscription Promotions
            </h2>
            {discountActive && (
              <span className="bg-success/10 text-success text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px] font-bold">campaign</span>
                <span>Active ({discountPercent}% OFF)</span>
              </span>
            )}
          </div>

          <div className="space-y-4 select-none">
            {/* Active Toggle Switch */}
            <div className="flex justify-between items-center gap-3">
              <div>
                <p className="text-xs font-bold text-text-main">Enable Promotion Discount</p>
                <p className="text-[10px] text-text-muted">Apply a temporary discount to visitor monthly tiers</p>
              </div>
              <button
                type="button"
                onClick={() => setDiscountActive(!discountActive)}
                className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full border transition-colors p-[3px] ${
                  discountActive ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <div className={`h-[14px] w-[14px] rounded-full transition-transform ${
                  discountActive ? "translate-x-4 bg-primary" : "translate-x-0 bg-text-muted"
                }`} />
              </button>
            </div>

            {/* Discount Percent input */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">Discount Percentage (%)</label>
              <div className="relative flex items-center bg-background border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-all">
                <input
                  type="number"
                  min="5"
                  max="90"
                  required
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  disabled={!discountActive}
                  className="w-full text-xs font-bold bg-transparent outline-none text-text-main disabled:opacity-55"
                />
                <span className="text-[10px] font-bold text-text-muted shrink-0 ml-1">% OFF</span>
              </div>
              <p className="text-[9px] text-text-muted mt-2 leading-relaxed">
                Min <strong>5%</strong>, max <strong>90%</strong> discount allowed. Discount applies instantly on profile lock screens and subscription packages.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <span>Save Promotion Settings</span>
            <span className="material-symbols-outlined text-[16px] leading-none font-bold">campaign</span>
          </button>
        </form>

        {/* 4. 1-on-1 Direct Video Calls configuration form */}
        <form onSubmit={handleCallsSave} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-1 border-b border-border select-none">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              1-on-1 Video & Audio Calls
            </h2>
            {callsEnabled && (
              <span className="bg-success/10 text-success text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px] font-bold">videocam</span>
                <span>Active (${parseFloat(callPricePerMin).toFixed(2)}/min)</span>
              </span>
            )}
          </div>

          <div className="space-y-4 select-none">
            {/* Active Toggle Switch */}
            <div className="flex justify-between items-center gap-3">
              <div>
                <p className="text-xs font-bold text-text-main">Enable 1-on-1 Calls</p>
                <p className="text-[10px] text-text-muted">Allow subscribers to call you directly for private live sessions</p>
              </div>
              <button
                type="button"
                onClick={() => setCallsEnabled(!callsEnabled)}
                className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full border transition-colors p-[3px] ${
                  callsEnabled ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <div className={`h-[14px] w-[14px] rounded-full transition-transform ${
                  callsEnabled ? "translate-x-4 bg-primary" : "translate-x-0 bg-text-muted"
                }`} />
              </button>
            </div>

            {/* Price Per Minute input */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">Rate Per Minute (USD)</label>
              <div className="relative flex items-center bg-background border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-all">
                <span className="text-xs font-bold text-text-muted mr-1 select-none">$</span>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  max="20"
                  required
                  value={callPricePerMin}
                  onChange={(e) => setCallPricePerMin(e.target.value)}
                  disabled={!callsEnabled}
                  className="w-full text-xs font-bold bg-transparent outline-none text-text-main disabled:opacity-55"
                />
                <span className="text-[10px] font-bold text-text-muted shrink-0 ml-1">/ minute</span>
              </div>
              <p className="text-[9px] text-text-muted mt-2 leading-relaxed">
                Min <strong>$1.00/min</strong>, max <strong>$20.00/min</strong>. Fans will be billed in real-time from their wallet balances.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <span>Save Call Settings</span>
            <span className="material-symbols-outlined text-[16px] leading-none font-bold">videocam</span>
          </button>
        </form>
      </div>
    </RoleGuard>
  );
}
