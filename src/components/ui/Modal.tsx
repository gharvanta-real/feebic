"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-[440px]",
  md: "max-w-[540px]",
  lg: "max-w-[660px]",
  xl: "max-w-[780px]"
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"; // lock scroll when modal is active
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/35 p-4 backdrop-blur-[2px] animate-fade-in">
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Modal Container */}
      <div className={`relative my-auto w-full ${sizeClasses[size || "sm"]} max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-border bg-surface p-5 md:p-6 transition-transform animate-fade-in max-sm:max-w-full`}>
        {/* Header */}
        <div className="sticky -top-5 md:-top-6 z-10 -mx-5 md:-mx-6 mb-4 flex items-center justify-between border-b border-border bg-surface px-5 md:px-6 pb-4 pt-1 md:pt-0 select-none">
          <h3 className="text-base font-extrabold text-text-main">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Contents */}
        <div className="space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};
