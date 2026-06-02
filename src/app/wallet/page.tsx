"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { apiClient } from "@/lib/apiClient";

type Transaction = {
  id: string;
  amount: number;
  type: "deposit" | "subscription" | "tip" | string;
  title: string;
  subtitle: string;
  created_at?: string;
};

export default function WalletPage() {
  const { walletBalance, adjustBalance, showToast } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "deposit" | "subscription" | "tip">("all");
  
  // UPI payment form states
  const [fundsVal, setFundsVal] = useState("500.00");
  const [upiId, setUpiId] = useState("alex@okaxis");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "phonepe" | "paytm" | "bhim" | "custom">("gpay");
  const [upiValidationError, setUpiValidationError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const fetchTransactions = async () => {
    try {
      const wallet = await apiClient.get<{ transactions: Array<Omit<Transaction, "subtitle">> }>("/wallet");
      setTransactions(wallet.transactions.map((tx) => ({
        ...tx,
        subtitle: tx.created_at ? new Date(tx.created_at).toLocaleString() : "",
      })));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load wallet statements");
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchTransactions();
    }, 0);

    const handleWalletUpdate = () => fetchTransactions();
    window.addEventListener("ch_wallet_updated", handleWalletUpdate);
    return () => window.removeEventListener("ch_wallet_updated", handleWalletUpdate);
  }, []);

  const handleUpiAppSelect = (app: "gpay" | "phonepe" | "paytm" | "bhim" | "custom") => {
    setSelectedUpiApp(app);
    if (app === "gpay") {
      setUpiId("alex@okaxis");
      setUpiValidationError("");
    } else if (app === "phonepe") {
      setUpiId("alex@ybl");
      setUpiValidationError("");
    } else if (app === "paytm") {
      setUpiId("alex@paytm");
      setUpiValidationError("");
    } else if (app === "bhim") {
      setUpiId("alex@upi");
      setUpiValidationError("");
    } else {
      setUpiId("");
      setUpiValidationError("");
    }
  };

  const validateUpi = (id: string) => {
    if (!id) return "UPI ID is required";
    const pattern = /^[\w.-]+@[\w.-]+$/;
    if (!pattern.test(id)) {
      return "Invalid UPI ID format (e.g. username@okaxis)";
    }
    return "";
  };

  const handleUpiIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUpiId(val);
    if (val) {
      setUpiValidationError(validateUpi(val));
    } else {
      setUpiValidationError("");
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(fundsVal);
    
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid deposit amount");
      return;
    }

    if (selectedUpiApp === "custom" || upiId) {
      const err = validateUpi(upiId);
      if (err) {
        setUpiValidationError(err);
        showToast(err);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const appNameMap = {
        gpay: "Google Pay",
        phonepe: "PhonePe",
        paytm: "Paytm",
        bhim: "BHIM UPI",
        custom: "UPI ID"
      };
      const label = showQRCode ? "UPI QR Code Instant Scan" : `UPI Transfer (${appNameMap[selectedUpiApp]}: ${upiId})`;
      await adjustBalance(amount, `Funds Loaded via ${label}`);
      await fetchTransactions();
      setIsProcessing(false);
      setShowQRCode(false);
    } catch {
      setIsProcessing(false);
    }
  };

  const handleSimulateQRDeposit = async () => {
    const amount = parseFloat(fundsVal);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid deposit amount");
      return;
    }
    setIsProcessing(true);
    try {
      await adjustBalance(amount, "Funds Loaded via UPI QR Scanner Mock");
      await fetchTransactions();
      setIsProcessing(false);
      setShowQRCode(false);
    } catch {
      setIsProcessing(false);
    }
  };

  const getFilteredTransactions = () => {
    if (activeTab === "all") return transactions;
    return transactions.filter(t => t.type === activeTab);
  };

  const filteredTransactions = getFilteredTransactions();

  return (
    <AppShell>
      {/* Mobile Top Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted select-none">Wallet</span>
      </MobileHeader>

      {/* Main Page Content (Touching Sidebar) */}
      <div className="app-page-shell space-y-6 animate-fade-in">
          
          <div className="space-y-1 select-none">
            <h1 className="text-lg font-black text-text-main font-sans tracking-tight">Wallet Manager</h1>
            <p className="text-xs text-text-muted font-medium">Manage your active wallet credits, scan UPI QR deposits, and view billing statements.</p>
          </div>

          {/* Core Balance Card Widget (Premium neon-glassmorphic style card mockup) */}
          <div className="bg-gradient-to-br from-primary to-accent text-white rounded-3xl p-6 md:p-7 shadow-lg flex flex-col justify-between select-none relative overflow-hidden aspect-[1.8/1] sm:aspect-[2.1/1]">
            {/* Visual ambient graphics overlays */}
            <div className="absolute right-4 bottom-4 h-24 w-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute left-1/3 top-4 h-28 w-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/80">Active Credits</p>
                <h2 className="text-3xl md:text-4xl font-black font-sans">₹{walletBalance.toFixed(2)}</h2>
              </div>
              <span className="material-symbols-outlined text-[36px] text-white/30" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance_wallet
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[11px] font-mono tracking-wider text-white/90">
                  {upiId ? `UPI ID: ${upiId}` : "No UPI Linked"}
                </p>
                <p className="text-[9px] font-bold text-white/70 tracking-wide uppercase">
                  {selectedUpiApp === "custom" ? "Custom UPI Address" : `${selectedUpiApp.toUpperCase()} Quick Account`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-full select-none uppercase tracking-wider">
                  Safe Pay UPI Secured
                </span>
              </div>
            </div>
          </div>

          {/* Add Funds form container */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-border select-none">
              <h2 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Deposit Wallet Funds</span>
              </h2>
              <button 
                type="button"
                onClick={() => setShowQRCode(!showQRCode)}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                  showQRCode 
                    ? "bg-primary/10 border-primary/20 text-primary" 
                    : "bg-background border-border text-text-muted hover:border-text-muted"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                <span>{showQRCode ? "Use UPI App Form" : "Scan QR Code"}</span>
              </button>
            </div>

            {showQRCode ? (
              /* QR Code Scan Mockup Interface */
              <div className="flex flex-col items-center py-4 space-y-4 select-none animate-fade-in">
                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-text-main">Instant QR Scan Deposit</p>
                  <p className="text-[10px] text-text-muted max-w-[280px]">Scan this secure QR code using any UPI client (GPay, PhonePe, Paytm) to transfer credits instantly.</p>
                </div>

                {/* Styled Interactive QR Mockup */}
                <div className="relative p-4 bg-white rounded-2xl border-4 border-primary/20 shadow-md flex items-center justify-center">
                  <div className="h-40 w-40 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex flex-col items-center justify-center border border-slate-300/40 relative">
                    <span className="material-symbols-outlined text-[82px] text-slate-700 animate-pulse">qr_code_2</span>
                    <span className="absolute bottom-2.5 bg-primary text-white text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full select-none tracking-widest">
                      FEEBIC UPI
                    </span>
                  </div>
                  <div className="absolute -inset-1 border-2 border-dashed border-primary rounded-2xl animate-spin duration-[20s]" />
                </div>

                {/* Amount presets inside QR view */}
                <div className="w-full max-w-sm space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted text-center mb-1.5">Configure Scanner Amount (INR)</label>
                    <div className="flex gap-2 justify-center">
                      {[100, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFundsVal(preset.toFixed(2))}
                          disabled={isProcessing}
                          className={`px-4 py-2 border rounded-xl transition-all font-black text-xs cursor-pointer ${
                            parseFloat(fundsVal) === preset 
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-background border-border text-text-main hover:border-text-muted"
                          }`}
                        >
                          +₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSimulateQRDeposit}
                      disabled={isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-success to-emerald-600 text-white hover:opacity-95 active:scale-[0.98] rounded-full font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          <span>Verifying Scanner Transfer...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px] leading-none font-bold">check_circle</span>
                          <span>I Have Paid ₹{parseFloat(fundsVal).toFixed(2)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Premium UPI App Form Interface */
              <form onSubmit={handleAddFunds} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Funds Amount Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Deposit Amount (INR)</label>
                    <div className="relative flex items-center bg-background border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-all">
                      <span className="text-xs font-bold text-text-muted mr-1 select-none">₹</span>
                      <input
                        type="number"
                        step="50"
                        min="50"
                        required
                        value={fundsVal}
                        onChange={(e) => setFundsVal(e.target.value)}
                        disabled={isProcessing}
                        className="w-full text-xs font-bold bg-transparent outline-none text-text-main disabled:opacity-55"
                      />
                    </div>
                  </div>

                  {/* Domestic Load presets */}
                  <div className="select-none">
                    <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">Domestic Deposit Presets</label>
                    <div className="flex gap-2">
                      {[100, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFundsVal(preset.toFixed(2))}
                          disabled={isProcessing}
                          className="flex-grow py-2.5 bg-background border border-border hover:border-text-muted active:scale-95 text-xs font-black rounded-xl transition-all cursor-pointer text-text-main"
                        >
                          +₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* UPI App quick-select row */}
                <div className="space-y-2 select-none">
                  <label className="block text-[11px] font-bold text-text-muted ml-1">Quick Select UPI Application</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {([
                      { id: "gpay", label: "Google Pay", icon: "sports_kabaddi" },
                      { id: "phonepe", label: "PhonePe", icon: "account_balance" },
                      { id: "paytm", label: "Paytm", icon: "payment" },
                      { id: "bhim", label: "BHIM", icon: "star" },
                      { id: "custom", label: "Custom ID", icon: "edit" }
                    ] as const).map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleUpiAppSelect(app.id)}
                        disabled={isProcessing}
                        className={`flex items-center gap-1.5 py-2 px-3 border rounded-xl transition-all cursor-pointer text-left ${
                          selectedUpiApp === app.id
                            ? "bg-primary/10 border-primary/40 text-primary font-black shadow-sm"
                            : "bg-background border-border text-text-muted hover:border-text-muted"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none">{app.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider">{app.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom UPI ID Text Input with Validator */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-text-muted mb-1 ml-1 select-none">
                    {selectedUpiApp === "custom" ? "Enter Custom UPI ID Address" : "UPI ID Address (Auto-filled)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={handleUpiIdChange}
                    disabled={isProcessing || selectedUpiApp !== "custom"}
                    placeholder="example@upi"
                    className={`w-full px-4 py-2.5 bg-background border rounded-xl focus:border-primary transition-all text-xs font-semibold outline-none text-text-main disabled:opacity-75 ${
                      upiValidationError ? "border-red-500" : "border-border"
                    }`}
                  />
                  {upiValidationError ? (
                    <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-[12px] leading-none">warning</span>
                      <span>{upiValidationError}</span>
                    </p>
                  ) : (
                    upiId && (
                      <p className="text-[10px] text-success font-bold ml-1 flex items-center gap-1 select-none">
                        <span className="material-symbols-outlined text-[12px] leading-none">check_circle</span>
                        <span>Format Validated (Real-time checks passed)</span>
                      </p>
                    )
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !!upiValidationError}
                  className="w-full mt-2 py-3 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
                >
                  {isProcessing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      <span>Securing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px] leading-none font-bold">lock</span>
                      <span>Deposit ₹{parseFloat(fundsVal).toFixed(2)} via UPI Pay</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Transactions Statement list */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm select-none">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-3 gap-3">
              <h2 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Billing Statements</span>
              </h2>

              {/* Transactions Tab Filter */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar max-w-full select-none bg-transparent">
                {([
                  { key: "all", label: "All" },
                  { key: "deposit", label: "Deposits" },
                  { key: "subscription", label: "Subs" },
                  { key: "tip", label: "Tips" }
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`text-[12px] font-extrabold pb-3.5 -mb-3.5 cursor-pointer transition-all border-b-2 leading-none relative ${
                      activeTab === tab.key
                        ? "border-primary text-primary font-black"
                        : "border-transparent text-text-muted hover:text-text-main"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">No statements match your filter criteria.</p>
            ) : (
              <div className="space-y-4 divide-y divide-border/40">
                {filteredTransactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className={`flex justify-between items-center gap-3 ${idx > 0 ? "pt-4" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-text-main truncate">{tx.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{tx.subtitle}</p>
                    </div>
                    <p className={`text-xs font-black shrink-0 ${tx.amount < 0 ? "text-accent" : "text-success"}`}>
                      {tx.amount < 0 ? `-₹${Math.abs(tx.amount).toFixed(2)}` : `+₹${tx.amount.toFixed(2)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </AppShell>
  );
}
