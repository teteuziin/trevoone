"use client";

import React from "react";
import Link from "next/link";

export interface WorkoutQuickActionsProps {
  consultancySlug: string;
  latestDraft?: {
    publicId: string;
    title: string;
    updatedAt: string | Date;
    blocksCount?: number;
  } | null;
  activeTab?: string;
}

function ArrowRightIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

export function WorkoutQuickActions({
  consultancySlug,
  latestDraft,
  activeTab = "routines",
}: WorkoutQuickActionsProps) {
  // Only display the banner when on the routines ("Meus treinos") tab and there is a real draft
  if (!latestDraft || activeTab !== "routines") {
    return null;
  }

  return (
    <div className="w-full font-sans">
      <div className="p-3 sm:py-2.5 sm:px-4 rounded-xl bg-[#0F2F24] text-white border border-[#163E27] shadow-2xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-white/10 text-emerald-300 flex items-center justify-center shrink-0 border border-white/10 text-xs">
            ⚡
          </span>
          <div className="min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-[11px] font-semibold text-emerald-300 shrink-0">
              Continue de onde parou:
            </span>
            <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {latestDraft.title}
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF8E6]/20 text-[#FBE3A4] border border-[#FBE3A4]/30 shrink-0">
              Em elaboração
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <Link
            href={`/consultoria/${consultancySlug}/rotinas/${latestDraft.publicId}/editor`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-[#EBF3ED] text-[#0F2F24] transition-all cursor-pointer min-h-[34px] shadow-xs"
          >
            <span>Continuar</span>
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}
