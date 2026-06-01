"use client";

import React from "react";

type VerifiedBadgeProps = {
  size?: "xs" | "sm" | "md";
  className?: string;
};

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

const fontSizes = {
  xs: "9.5px",
  sm: "11px",
  md: "13px",
};

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = "sm", className = "" }) => (
  <span
    aria-label="Verified"
    title="Verified"
    className={`material-symbols-outlined inline-flex shrink-0 items-center justify-center leading-none text-primary align-middle ${sizeClasses[size]} ${className}`}
    style={{ fontSize: fontSizes[size], fontVariationSettings: "'FILL' 1", lineHeight: 1 }}
  >
    verified
  </span>
);
