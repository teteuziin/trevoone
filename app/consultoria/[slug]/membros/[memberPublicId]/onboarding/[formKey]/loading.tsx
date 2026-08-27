import React from "react";

export default function AdminStudentIntakeReviewLoading() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-4 w-48 bg-[var(--surface-sunken)] rounded-md" />

      {/* Main card skeleton */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-3 w-32 bg-[var(--surface-sunken)] rounded-full" />
            <div className="h-7 w-64 bg-[var(--surface-sunken)] rounded-lg" />
            <div className="h-4 w-48 bg-[var(--surface-sunken)] rounded-md" />
          </div>
          <div className="h-6 w-24 bg-[var(--surface-sunken)] rounded-full" />
        </div>
      </div>

      {/* Sections skeleton */}
      <div className="space-y-4">
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 space-y-3">
          <div className="h-5 w-40 bg-[var(--surface-sunken)] rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-16 bg-[var(--surface-subtle)] rounded-xl" />
            <div className="h-16 bg-[var(--surface-subtle)] rounded-xl" />
            <div className="h-16 bg-[var(--surface-subtle)] rounded-xl" />
            <div className="h-16 bg-[var(--surface-subtle)] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
