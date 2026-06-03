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
        subtitle: tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) : "",
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
      {/* CSS Animation Keyframes for scanner effect */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
        }
        .animate-scan {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: #10b981;
          box-shadow: 0 0 12px #10b981, 0 0 4px #10b981;
          animation: scan 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 10;
        }
      `}} />

      {/* Mobile Top Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted select-none">Wallet</span>
      </MobileHeader>

      {/* Main Page Content (Clean spacing) */}
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 animate-fade-in">
          
          <div className="space-y-1 select-none">
            <h1 className="text-2xl font-black text-text-main font-sans tracking-tight">Wallet Manager</h1>
            <p className="text-xs text-text-muted font-medium">Manage your active wallet credits, scan UPI QR deposits, and view billing statements.</p>
          </div>

          {/* Premium Credit Card Mockup */}
          <div className="w-full max-w-md mr-auto bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-white/10 select-none aspect-[1.58/1] flex flex-col justify-between">
            {/* Holographic reflection highlights */}
            <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 blur-3xl pointer-events-none" />
            <div className="absolute left-[-20%] bottom-[-20%] w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

            <div className="flex justify-between items-start z-10">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400">Active credits</p>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">₹{walletBalance.toFixed(2)}</h2>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[12px] font-black text-white/90 italic">Felbic</span>
                <span className="text-[7px] text-white/50">Platinum</span>
              </div>
            </div>

            {/* Gold Card Chip and NFC Signal Icon */}
            <div className="flex items-center gap-4 z-10 my-1">
              <div className="w-11 h-8 rounded bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border border-yellow-200/50 p-1 flex flex-col justify-between relative shadow-inner">
                {/* Chip internal contact mock pattern */}
                <div className="border-b border-black/10 w-full h-1/2 flex">
                  <div className="border-r border-black/10 w-1/3 h-full"></div>
                  <div className="border-r border-black/10 w-1/3 h-full"></div>
                </div>
                <div className="w-full h-1/2 flex">
                  <div className="border-r border-black/10 w-1/3 h-full"></div>
                  <div className="border-r border-black/10 w-1/3 h-full"></div>
                </div>
              </div>
              <svg className="w-6 h-6 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12c0-4.418 3.582-8 8-8m0 16c4.418 0 8-3.582 8-8m-4 0c0-2.209-1.791-4-4-4m0 8c2.209 0 4-1.791 4-4" />
              </svg>
            </div>

            <div className="flex justify-between items-end z-10">
              <div className="space-y-1">
                <p className="text-xs font-mono tracking-widest text-slate-300">
                  {upiId ? upiId : "No UPI linked"}
                </p>
                <p className="text-[9px] font-bold text-slate-400 tracking-wide">
                  {selectedUpiApp === "custom" ? "Custom UPI address" : `${selectedUpiApp.charAt(0).toUpperCase() + selectedUpiApp.slice(1)} quick account`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-bold bg-white/10 border border-white/20 px-2 py-1 rounded-md text-emerald-400 select-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Safe Pay UPI
                </span>
              </div>
            </div>
          </div>

          {/* Deposit Widget Container */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-border select-none">
              <h2 className="text-sm font-extrabold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">add_circle</span>
                <span>Deposit Wallet Funds</span>
              </h2>
              <button 
                type="button"
                onClick={() => setShowQRCode(!showQRCode)}
                className={`text-[10px] font-black px-4 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  showQRCode 
                    ? "bg-primary/10 border-primary/20 text-primary" 
                    : "bg-background border-border text-text-muted hover:border-text-main hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{showQRCode ? "dns" : "qr_code_2"}</span>
                <span>{showQRCode ? "Use UPI form" : "Scan QR code"}</span>
              </button>
            </div>

            {showQRCode ? (
              /* QR Code Scan Mockup Interface */
              <div className="flex flex-col items-center py-4 space-y-6 select-none animate-fade-in">
                <div className="text-center space-y-1">
                  <p className="text-sm font-extrabold text-text-main">Instant QR Scan Deposit</p>
                  <p className="text-xs text-text-muted max-w-[320px]">Scan this secure QR code using any UPI app (GPay, PhonePe, Paytm) to transfer credits instantly.</p>
                </div>

                {/* Styled Interactive QR Mockup */}
                <div className="relative p-5 bg-white rounded-2xl border border-slate-200 shadow-xl flex items-center justify-center overflow-hidden">
                  <div className="h-44 w-44 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-200 relative overflow-hidden">
                    {/* Pulsing Scanner Green Line */}
                    <div className="animate-scan" />
                    
                    {/* Mock QR matrix image using clean vector/icons */}
                    <span className="material-symbols-outlined text-[110px] text-slate-800 opacity-90 select-none">qr_code_2</span>
                    <span className="absolute bottom-2 bg-slate-900 text-white text-[7px] font-black px-2 py-0.5 rounded select-none border border-white/20">
                      Felbic UPI
                    </span>
                  </div>
                </div>

                {/* Amount presets inside QR view */}
                <div className="w-full max-w-sm space-y-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted text-center mb-2">Configure scanner amount (INR)</label>
                    <div className="flex gap-2.5 justify-center">
                      {[100, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFundsVal(preset.toFixed(2))}
                          disabled={isProcessing}
                          className={`flex-1 py-2 border rounded-xl transition-all font-black text-xs cursor-pointer text-center ${
                            parseFloat(fundsVal) === preset 
                              ? "bg-primary text-white border-primary shadow-md scale-105"
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
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-95 active:scale-[0.98] rounded-full font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          <span>Verifying scanner transfer...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px] leading-none font-bold">check_circle</span>
                          <span>I have paid ₹{parseFloat(fundsVal).toFixed(2)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Premium UPI App Form Interface */
              <form onSubmit={handleAddFunds} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Funds Amount Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-text-muted ml-1 select-none">Deposit amount (INR)</label>
                    <div className="relative flex items-center bg-background border border-border rounded-xl px-4 py-3 focus-within:border-primary transition-all shadow-sm">
                      <span className="text-sm font-extrabold text-text-muted mr-1.5 select-none">₹</span>
                      <input
                        type="number"
                        step="50"
                        min="50"
                        required
                        value={fundsVal}
                        onChange={(e) => setFundsVal(e.target.value)}
                        disabled={isProcessing}
                        className="w-full text-sm font-bold bg-transparent outline-none text-text-main disabled:opacity-55"
                      />
                    </div>
                  </div>

                  {/* Domestic Load presets */}
                  <div className="space-y-1.5 select-none">
                    <label className="block text-[11px] font-bold text-text-muted ml-1">Domestic deposit presets</label>
                    <div className="flex gap-2">
                      {[100, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFundsVal(preset.toFixed(2))}
                          disabled={isProcessing}
                          className="flex-grow py-3 bg-background border border-border hover:border-text-muted active:scale-95 text-xs font-black rounded-xl transition-all cursor-pointer text-text-main shadow-sm"
                        >
                          +₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* UPI App quick-select row */}
                <div className="space-y-3 select-none">
                  <label className="block text-[11px] font-bold text-text-muted ml-1">Quick select UPI application</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { id: "gpay", label: "Google Pay", color: "#4285F4", icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.887 0-8.868-4.003-8.868-8.914s3.98-8.914 8.868-8.914c2.263 0 4.274.807 5.86 2.378l3.107-3.13C18.36 1.83 15.534.8 12.24.8 6.033.8 1 5.863 1 12s5.033 11.2 11.24 11.2c6.48 0 10.774-4.59 10.774-11.2 0-.756-.067-1.332-.2-1.715H12.24z" fill="#4285F4"/>
                        </svg>
                      )},
                      { id: "phonepe", label: "PhonePe", color: "#5f259f", icon: (
                        <span className="material-symbols-outlined text-[16px] text-purple-600 leading-none">account_balance</span>
                      )},
                      { id: "paytm", label: "Paytm", color: "#00baf2", icon: (
                        <span className="material-symbols-outlined text-[16px] text-sky-500 leading-none">payment</span>
                      )},
                      { id: "bhim", label: "BHIM", color: "#e35e25", icon: (
                        <span className="material-symbols-outlined text-[16px] text-orange-600 leading-none">stars</span>
                      )},
                      { id: "custom", label: "Custom ID", color: "#64748b", icon: (
                        <span className="material-symbols-outlined text-[16px] text-slate-500 leading-none">edit</span>
                      )}
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleUpiAppSelect(app.id as any)}
                        disabled={isProcessing}
                        className={`flex items-center justify-center gap-2 py-3 px-3 border rounded-xl transition-all cursor-pointer shadow-sm ${
                          selectedUpiApp === app.id
                            ? "bg-primary/10 border-primary/40 text-primary font-black scale-[1.03]"
                            : "bg-background border-border text-text-muted hover:border-text-main"
                        }`}
                      >
                        {app.icon}
                        <span className="text-[10px] font-bold">{app.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom UPI ID Text Input with Validator */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-text-muted ml-1 select-none">
                    {selectedUpiApp === "custom" ? "Enter custom UPI ID address" : "UPI ID address (auto-filled)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={handleUpiIdChange}
                    disabled={isProcessing || selectedUpiApp !== "custom"}
                    placeholder="username@bank"
                    className={`w-full px-4 py-3 bg-background border rounded-xl focus:border-primary transition-all text-xs font-semibold outline-none text-text-main disabled:opacity-75 shadow-sm ${
                      upiValidationError ? "border-red-500" : "border-border"
                    }`}
                  />
                  {upiValidationError ? (
                    <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1.5 animate-pulse">
                      <span className="material-symbols-outlined text-[12px] leading-none">warning</span>
                      <span>{upiValidationError}</span>
                    </p>
                  ) : (
                    upiId && (
                      <p className="text-[10px] text-emerald-600 font-bold ml-1 flex items-center gap-1.5 select-none animate-fade-in">
                        <span className="material-symbols-outlined text-[14px] leading-none text-emerald-600">check_circle</span>
                        <span>Format validated (Security check passed)</span>
                      </p>
                    )
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !!upiValidationError}
                  className="w-full mt-2 py-3.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
                >
                  {isProcessing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      <span>Securing transaction...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] leading-none font-bold">lock</span>
                      <span>Deposit ₹{parseFloat(fundsVal).toFixed(2)} via UPI pay</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Transactions Statement list */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm select-none">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-4 gap-4">
              <h2 className="text-sm font-extrabold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">receipt_long</span>
                <span>Billing statements</span>
              </h2>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <span className="material-symbols-outlined text-[36px] text-text-muted">receipt_long</span>
                <p className="text-xs text-text-muted font-medium">No statements match your filter criteria.</p>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-border/40">
                {filteredTransactions.map((tx, idx) => {
                  const isNegative = tx.amount < 0;
                  return (
                    <div
                      key={tx.id}
                      className={`flex justify-between items-center gap-4 ${idx > 0 ? "pt-4" : ""}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Transaction Type Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                          isNegative 
                            ? "bg-rose-500/5 border-rose-500/10 text-rose-500" 
                            : "bg-emerald-500/5 border-emerald-500/10 text-emerald-500"
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {tx.type === "deposit" 
                              ? "arrow_downward" 
                              : tx.type === "subscription" 
                                ? "card_membership" 
                                : "monetization_on"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-text-main truncate">{tx.title}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{tx.subtitle}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-black ${isNegative ? "text-rose-500" : "text-emerald-500"}`}>
                          {isNegative ? `-₹${Math.abs(tx.amount).toFixed(2)}` : `+₹${tx.amount.toFixed(2)}`}
                        </p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          isNegative 
                            ? "bg-rose-500/10 text-rose-500" 
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}>
                          {isNegative ? "Debit" : "Success"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>
    </AppShell>
  );
}
