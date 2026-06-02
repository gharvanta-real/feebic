"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { apiClient } from "@/lib/apiClient";

export default function VerificationSettingsPage() {
  const { showToast, user, refreshUserProfile } = useUser();
  const [legalName, setLegalName] = useState("Alex Rivera");
  const [documentType, setDocumentType] = useState("PAN Card");
  const [docUploaded, setDocUploaded] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setIsVerified(!!user.kycVerified);
      setDocUploaded(!!user.kycUploaded);
      if (user.kycName) {
        setLegalName(user.kycName);
      }
      if (user.kycDocumentType) {
        setDocumentType(user.kycDocumentType);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiClient.post("/users/kyc", {
        legal_name: legalName,
        document_type: documentType,
      });
      setDocUploaded(true);
      setIsVerified(true);
      showToast("Identity verified successfully! Verified badge unlocked.");
      refreshUserProfile();
    } catch (err: any) {
      showToast(err.message || "Failed to submit verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["creator"]}>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1 select-none">
          <h1 className="text-base font-extrabold text-text-main">Identity Verification (KYC)</h1>
          <p className="text-xs text-text-muted">Verify your identity to unlock premium creator payouts and verified badge triggers.</p>
        </div>

        {/* Dynamic Verification Banner Status */}
        {isVerified ? (
          <div className="bg-[hsl(var(--success-hsl)/0.08)] border border-[hsl(var(--success-hsl)/0.2)] p-4 rounded-xl flex gap-3 items-center select-none">
            <span className="material-symbols-outlined text-success text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            <div>
              <p className="font-bold text-xs text-success leading-none mb-1">Account Verified</p>
              <p className="text-[10px] text-text-muted">You have successfully completed KYC checks. Your verified badge is now active globally!</p>
            </div>
          </div>
        ) : docUploaded ? (
          <div className="bg-[hsl(var(--primary-hsl)/0.08)] border border-[hsl(var(--primary-hsl)/0.2)] p-4 rounded-xl flex gap-3 items-center select-none">
            <span className="material-symbols-outlined text-primary text-[28px] animate-spin">
              hourglass_empty
            </span>
            <div>
              <p className="font-bold text-xs text-primary leading-none mb-1">KYC Under Review</p>
              <p className="text-[10px] text-text-muted">Documents are being audited by our legal compliance team. Approval is typically instant.</p>
            </div>
          </div>
        ) : (
          <div className="bg-[hsl(var(--text-muted-hsl)/0.04)] border border-border p-4 rounded-xl flex gap-3 items-start select-none">
            <span className="material-symbols-outlined text-text-muted text-[22px]">info</span>
            <div>
              <p className="font-bold text-xs text-text-main leading-none mb-1">Pending Submission</p>
              <p className="text-[10px] text-text-muted leading-relaxed">
                Felbic compliance rules require an official Government ID record (e.g. PAN Card, Aadhaar Card, or Passport) to prevent duplicate profiles and trigger payouts.
              </p>
            </div>
          </div>
        )}

        {/* Verification Upload form */}
        {!isVerified && (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider pb-1 border-b border-border select-none">
              KYC Upload Wizard
            </h2>

            <div>
              <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1 select-none">Legal Name (As on ID card)</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={isSubmitting || docUploaded}
                className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main disabled:opacity-55"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 select-none">
              <div>
                <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">ID Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  disabled={isSubmitting || docUploaded}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:border-primary transition-all text-xs outline-none text-text-main disabled:opacity-55"
                >
                  <option value="PAN Card">PAN Card</option>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver License">Driver&apos;s License</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-muted mb-1.5 ml-1">Upload File (Mock)</label>
                <div
                  onClick={() => !docUploaded && !isSubmitting && showToast("Document selected")}
                  className={`w-full py-2 bg-background border border-dashed border-border hover:border-text-muted text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-text-muted ${
                    docUploaded ? "opacity-55" : ""
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Select File</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || docUploaded}
              className="w-full py-2.5 bg-primary text-white hover:opacity-95 active:scale-[0.98] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 select-none"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Uploading documents...</span>
                </>
              ) : (
                <>
                  <span>Submit Verification Logs</span>
                  <span className="material-symbols-outlined text-[16px] leading-none font-bold">send</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </RoleGuard>
  );
}
