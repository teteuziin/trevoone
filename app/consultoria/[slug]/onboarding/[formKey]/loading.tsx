import React from "react";

export default function StudentIntakeLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-4 w-36 bg-[var(--surface-sunken)] rounded-md" />

      {/* Main card skeleton */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Header skeleton */}
        <div className="space-y-3 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex justify-between items-center">
            <div className="h-5 w-28 bg-[var(--surface-sunken)] rounded-full" />
            <div className="h-4 w-20 bg-[var(--surface-sunken)] rounded-md" />
          </div>
          <div className="h-7 w-64 bg-[var(--surface-sunken)] rounded-lg" />
          <div className="h-4 w-full bg-[var(--surface-sunken)] rounded-md" />
          <div className="h-2 w-full bg-[var(--surface-sunken)] rounded-full mt-2" />
        </div>

        {/* Form fields skeleton */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-[var(--surface-sunken)] rounded-md" />
            <div className="h-11 w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 bg-[var(--surface-sunken)] rounded-md" />
            <div className="h-11 w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-36 bg-[var(--surface-sunken)] rounded-md" />
            <div className="h-20 w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl" />
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-between">
          <div className="h-10 w-28 bg-[var(--surface-sunken)] rounded-xl" />
          <div className="h-10 w-36 bg-[var(--surface-sunken)] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
