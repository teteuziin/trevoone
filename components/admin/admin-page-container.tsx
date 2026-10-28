import React from "react";

export interface AdminPageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "narrow" | "default" | "wide";
}

export function AdminPageContainer({
  children,
  className = "",
  maxWidth = "default",
}: AdminPageContainerProps) {
  const widthClass =
    maxWidth === "narrow"
      ? "max-w-4xl"
      : maxWidth === "wide"
      ? "max-w-7xl"
      : "max-w-7xl";

  return (
    <div
      className={`w-full ${widthClass} mx-auto space-y-5 sm:space-y-6 pb-12 select-none animate-in fade-in duration-150 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
