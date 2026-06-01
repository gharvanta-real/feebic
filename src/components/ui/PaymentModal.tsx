"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";
import { Modal } from "./Modal";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  price: number;
  onConfirm: (tipMessage?: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  title,
  price,
  onConfirm
}) => {
  const { walletBalance, adjustBalance } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [tipMessage, setTipMessage] = useState("");
  
  const isSufficientFunds = walletBalance >= price;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate secure platform payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);

      setTimeout(() => {
        setIsCompleted(false);
        onClose();
        
        if (isSufficientFunds) {
          adjustBalance(-price, title);
        } else {
          // If insufficient balance, simulate billing their card
          adjustBalance(0, `${title} via Card Checkout`);
        }
        
        onConfirm(tipMessage);
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
            <p className="text-lg font-bold text-success">${walletBalance.toFixed(2)}</p>
          </div>
        ) : (
          <div className="bg-[hsl(var(--accent-hsl)/0.08)] border border-[hsl(var(--accent-hsl)/0.2)] p-4 rounded-xl flex gap-3 items-start select-none">
            <span className="material-symbols-outlined text-accent text-[20px]">warning</span>
            <div>
              <p className="font-bold text-[12px] text-accent mb-0.5 leading-none">Insufficient Balance</p>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Your balance is ${walletBalance.toFixed(2)}. Please complete payment using your card details below to cover the checkout fee.
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
          <p className="text-lg font-bold text-primary">${price.toFixed(2)}</p>
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

          {/* Simulated Card Inputs if balance is insufficient */}
          {!isSufficientFunds && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Cardholder Name</label>
                <input
                  type="text"
                  required
                  defaultValue="Alex Rivera"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-sm outline-none"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4111 2222 3333 4444"
                  defaultValue="4111 2222 3333 4444"
                  maxLength={19}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-sm outline-none"
                  disabled={isProcessing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    defaultValue="12/28"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-sm outline-none"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5 ml-1">CVV</label>
                  <input
                    type="password"
                    required
                    placeholder="321"
                    defaultValue="123"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary transition-all text-sm outline-none"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            type="submit"
            disabled={isProcessing || isCompleted}
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
                <span>{isSufficientFunds ? "Confirm Purchase" : "Pay with Card"}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
