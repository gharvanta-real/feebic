"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { Modal } from "./Modal";

type PaymentSource = "wallet" | "card";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  price: number;
  onConfirm: (tipMessage?: string, paymentSource?: PaymentSource) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  title,
  price,
  onConfirm
}) => {
  const { walletBalance, showToast } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [tipMessage, setTipMessage] = useState("");
  
  // UPI states for insufficient funds backup
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "phonepe" | "paytm" | "qr">("gpay");
  const [upiId, setUpiId] = useState("alex@okaxis");
  const [upiValidationError, setUpiValidationError] = useState("");

  const isSufficientFunds = walletBalance >= price;



  const handleUpiAppSelect = (app: "gpay" | "phonepe" | "paytm" | "qr") => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSufficientFunds && selectedUpiApp !== "qr") {
      const err = validateUpi(upiId);
      if (err) {
        setUpiValidationError(err);
        showToast(err);
        return;
      }
    }

    setIsProcessing(true);

    // Simulate secure platform payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);

      setTimeout(() => {
        setIsCompleted(false);
        onClose();
        onConfirm(tipMessage, isSufficientFunds ? "wallet" : "card");
      }, 1000);
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Secure Checkout">
      <div className="space-y-4">
        {/* Wallet Balance Info */}
        {isSufficientFunds ? (
          <div className="bg-[hsl(var(--success-hsl)/0.08)] border border-[hsl(var(--success-hsl)/0.2)] p-4 rounded-xl flex justify-between items-center select-none">
            <div>
              <p className="text-xs font-bold text-text-muted">Available Wallet Balance</p>
              <p className="text-xs text-success font-semibold">Sufficient funds available</p>
            </div>
            <p className="text-lg font-bold text-success">₹{walletBalance.toFixed(2)}</p>
          </div>
        ) : (
          <div className="bg-[hsl(var(--accent-hsl)/0.08)] border border-[hsl(var(--accent-hsl)/0.2)] p-4 rounded-xl flex gap-3 items-start select-none">
            <span className="material-symbols-outlined text-accent text-[20px] shrink-0">warning</span>
            <div>
              <p className="font-bold text-[12px] text-accent mb-0.5 leading-none">Insufficient Balance</p>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Your balance is ₹{walletBalance.toFixed(2)}. Please complete payment using our sleek, instant UPI payment portal below to complete this checkout.
              </p>
            </div>
          </div>
        )}

        {/* Transaction Summary */}
        <div className="bg-[hsl(var(--text-muted-hsl)/0.04)] border border-border p-4 rounded-xl flex justify-between items-center select-none">
          <div>
            <p className="text-sm font-bold text-text-main">{title}</p>
            <p className="text-xs text-text-muted">Secure transaction checkout</p>
          </div>
          <p className="text-lg font-bold text-primary">₹{price.toFixed(2)}</p>
        </div>

        {/* Dynamic Billing Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tip Custom Message */}
          {title.toLowerCase().includes("tip") && (
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">
                Tip Message (Optional)
              </label>
              <input
                type="text"
                value={tipMessage}
                onChange={(e) => setTipMessage(e.target.value)}
                placeholder="Write a message to show to the creator..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-sm outline-none placeholder-text-muted"
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Sleek Instant UPI Backup Form if balance is insufficient */}
          {!isSufficientFunds && (
            <div className="space-y-3 border-t border-border/60 pt-4 animate-fade-in">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted select-none">
                Select UPI Payment Option
              </p>
              
              {/* Quick Select Apps buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 select-none">
                {([
                  { id: "gpay", label: "Google Pay", icon: "sports_kabaddi" },
                  { id: "phonepe", label: "PhonePe", icon: "account_balance" },
                  { id: "paytm", label: "Paytm", icon: "payment" },
                  { id: "qr", label: "UPI QR Code", icon: "qr_code_2" }
                ] as const).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleUpiAppSelect(app.id)}
                    disabled={isProcessing}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer ${
                      selectedUpiApp === app.id
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-background border-border text-text-muted hover:border-text-muted"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px] leading-none">{app.icon}</span>
                    <span>{app.label}</span>
                  </button>
                ))}
              </div>

              {selectedUpiApp === "qr" ? (
                /* Sleek checkout QR Code scanner mockup */
                <div className="bg-background border border-border/80 rounded-xl p-3 flex flex-col items-center justify-center space-y-2 select-none animate-fade-in">
                  <div className="relative p-2 bg-white rounded-lg border-2 border-primary/20 shadow-sm flex items-center justify-center">
                    <div className="h-28 w-28 bg-slate-100 rounded flex flex-col items-center justify-center border border-slate-200/50">
                      <span className="material-symbols-outlined text-[62px] text-slate-700">qr_code_2</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted font-bold text-center">
                    Scan & Pay ₹{price.toFixed(2)} with GPay, PhonePe, Paytm, or BHIM
                  </p>
                </div>
              ) : (
                /* UPI ID Text Input */
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-text-muted ml-1 select-none">UPI Address ID</label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={handleUpiIdChange}
                    disabled={isProcessing}
                    placeholder="example@upi"
                    className={`w-full px-4 py-2.5 bg-background border rounded-xl focus:border-primary transition-all text-sm font-semibold outline-none text-text-main ${
                      upiValidationError ? "border-red-500" : "border-border"
                    }`}
                  />
                  {upiValidationError && (
                    <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 select-none animate-pulse">
                      <span className="material-symbols-outlined text-[12px] leading-none">warning</span>
                      <span>{upiValidationError}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            type="submit"
            disabled={isProcessing || isCompleted || (!isSufficientFunds && selectedUpiApp !== "qr" && !!upiValidationError)}
            className={`w-full mt-4 py-3 rounded-full font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer ${
              isCompleted
                ? "bg-success text-white"
                : "bg-primary text-white hover:opacity-95"
            }`}
          >
            {isProcessing ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Processing transaction...</span>
              </>
            ) : isCompleted ? (
              <>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Transaction Successful!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">lock</span>
                <span>
                  {isSufficientFunds 
                    ? "Confirm Purchase" 
                    : selectedUpiApp === "qr" 
                      ? "I Have Paid & Scanned" 
                      : `Pay ₹${price.toFixed(2)} via UPI`
                  }
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
