import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-xl ${className}`.trim()}
      {...props}
    />
  );
}
