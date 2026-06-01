"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function MonetizationSettingsPage() {
  const { showToast } = useUser();
  const [subPrice, setSubPrice] = useState("9.99");
  
  // Bank connection states
  const [accountHolder, setAccountHolder] = useState("Alex Rivera");
  const [routingNumber, setRoutingNumber] = useState("123456789");
  const [accountNumber, setAccountNumber] = useState("987654321");
  const [bankName, setBankName] = useState("State Bank of India");
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        setSubPrice(parseFloat(localStorage.getItem("ch_base_sub_price") || "9.99").toFixed(2));
        
        const linked = localStorage.getItem("ch_bank_linked") === "true";
        setIsLinked(linked);
        if (linked) {
          setAccountHolder(localStorage.getItem("ch_bank_holder") || "Alex Rivera");
          setRoutingNumber(localStorage.getItem("ch_bank_routing") || "123456789");
          setAccountNumber(localStorage.getItem("ch_bank_account") || "987654321");
          setBankName(localStorage.getItem("ch_bank_name") || "State Bank of India");
        }
      }, 0);
    }
  }, []);

  const handlePriceSave = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.min(99.99, Math.max(4.99, parseFloat(subPrice) || 9.99));
    setSubPrice(price.toFixed(2));
    localStorage.setItem("ch_base_sub_price", price.toFixed(2));
    showToast(`Subscription price updated to $${price.toFixed(2)}/mo`);
  };

  const handleBankSave = (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem("ch_bank_linked", "true");
    localStorage.setItem("ch_bank_holder", accountHolder);
    localStorage.setItem("ch_bank_routing", routingNumber);
    localStorage.setItem("ch_bank_account", accountNumber);
    localStorage.setItem("ch_bank_name", bankName);
    
    setIsLinked(true);
    showToast("Bank account details linked successfully!");
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
            className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
          >
            <span>{isLinked ? "Update Linked Account" : "Link Payout Account"}</span>
            <span className="material-symbols-outlined text-[16px] leading-none font-bold">account_balance</span>
          </button>
        </form>
      </div>
    </RoleGuard>
  );
}
