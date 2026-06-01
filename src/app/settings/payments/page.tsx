"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { mockDb, LinkedCard } from "@/lib/mockDb";

export default function SettingsPaymentsPage() {
  const { showToast } = useUser();
  const [cards, setCards] = useState<LinkedCard[]>([]);
  
  // Add card form states
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCards = () => {
    setCards(mockDb.getLinkedCards());
  };

  useEffect(() => {
    setTimeout(() => {
      fetchCards();
    }, 0);

    const handleCardsChange = () => fetchCards();
    window.addEventListener("ch_cards_updated", handleCardsChange);
    return () => window.removeEventListener("ch_cards_updated", handleCardsChange);
  }, []);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();

    if (number.replace(/\s/g, "").length < 16) {
      showToast("Please enter a valid 16-digit card number");
      return;
    }

    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      showToast("Expiry must be in MM/YY format");
      return;
    }

    if (cvc.length < 3) {
      showToast("CVC must be 3 digits");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      // mask card number for security except last 4 digits
      const cleanNumber = number.replace(/\s/g, "");
      const formattedNum = `**** **** **** ${cleanNumber.slice(-4)}`;
      
      mockDb.addLinkedCard(holder, formattedNum, expiry);
      showToast("Card linked successfully!");
      
      // Reset form
      setHolder("");
      setNumber("");
      setExpiry("");
      setCvc("");
      fetchCards();
    }, 1200);
  };

  const handleDeleteCard = (id: string) => {
    if (confirm("Are you sure you want to delete this payment method?")) {
      mockDb.deleteLinkedCard(id);
      fetchCards();
      showToast("Payment method deleted");
    }
  };

  const handleSetDefault = (id: string) => {
    mockDb.setDefaultCard(id);
    fetchCards();
    showToast("Default payment card updated");
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    // Format card number with spaces every 4 digits
    value = value.match(/.{1,4}/g)?.join(" ") || value;
    setNumber(value.slice(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setExpiry(value.slice(0, 5));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCvc(value.slice(0, 3));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1 select-none">
        <h1 className="text-base font-extrabold text-text-main">Payment Cards</h1>
        <p className="text-xs text-text-muted">Manage linked debit and credit cards for subscription billing renewals.</p>
      </div>

      {/* Linked Cards List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border select-none">
          Linked Cards
        </h2>

        {cards.length === 0 ? (
          <p className="text-xs text-text-muted select-none">No payment methods linked. Add a card below to configure payments.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 select-none">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`bg-surface border p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                  card.isDefault ? "border-primary shadow-sm bg-primary/3" : "border-border hover:border-text-muted"
                }`}
              >
                {/* Card Details */}
                <div className="flex gap-3 items-center min-w-0">
                  <span className="material-symbols-outlined text-[32px] text-primary shrink-0">
                    credit_card
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-text-main flex items-center gap-2">
                      <span>{card.number}</span>
                      {card.isDefault && (
                        <span className="bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full select-none tracking-wider shrink-0">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-text-muted font-bold mt-1 uppercase">
                      {card.holder} • Expiry {card.expiry}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  {!card.isDefault && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      className="px-3.5 py-1.5 border border-border text-[10px] font-black rounded-full hover:border-primary text-text-muted hover:text-primary transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Set Default
                    </button>
                  )}
                  {cards.length > 1 && (
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="h-8 w-8 rounded-full border border-border text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete card"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Card Form */}
      <form onSubmit={handleAddCard} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border select-none flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px] leading-none">add_card</span>
          <span>Add Credit / Debit Card</span>
        </h2>

        <div>
          <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Cardholder Name</label>
          <input
            type="text"
            required
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            placeholder="John Smith"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs font-semibold outline-none text-text-main disabled:opacity-55"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Card Number</label>
          <div className="relative flex items-center bg-background border border-border rounded-xl px-4 py-2 focus-within:border-primary transition-all">
            <span className="material-symbols-outlined text-text-muted text-[19px] mr-2">credit_card</span>
            <input
              type="text"
              required
              value={number}
              onChange={handleCardNumberChange}
              placeholder="4111 2222 3333 4444"
              disabled={isSubmitting}
              className="w-full text-xs font-bold bg-transparent outline-none text-text-main disabled:opacity-55"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Expiry Date</label>
            <input
              type="text"
              required
              value={expiry}
              onChange={handleExpiryChange}
              placeholder="MM/YY"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs font-semibold outline-none text-text-main text-center disabled:opacity-55"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">CVC Code</label>
            <input
              type="text"
              required
              value={cvc}
              onChange={handleCvcChange}
              placeholder="123"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs font-semibold outline-none text-text-main text-center disabled:opacity-55"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              <span>Linking Card...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px] leading-none font-bold">lock</span>
              <span>Verify & Add Card</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
