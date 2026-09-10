"use client";

import { useEffect, useState } from "react";
import type { WorkoutExecutionSessionDto } from "@/lib/training-v2/types";

function Clock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type ActiveRestState = {
  setPublicId: string;
  setNumber: number;
  blockItemPublicId?: string;
  totalSeconds: number;
  targetEndAt: number; // Unix epoch ms
};

/**
 * Checks if there is a recently completed set whose rest period has not yet expired.
 * Pure function: zero database writes.
 */
export function getInitialActiveRest(
  initialExecution?: WorkoutExecutionSessionDto | null
): ActiveRestState | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!initialExecution || initialExecution.status !== "IN_PROGRESS" || !initialExecution.sets) {
    return null;
  }

  // Filter completed sets with prescribed rest > 0
  const completedWithRest = initialExecution.sets.filter(
    (s) => s.completedAt != null && s.prescribedRestSeconds != null && s.prescribedRestSeconds > 0
  );

  if (completedWithRest.length === 0) {
    return null;
  }

  // Sort descending by completedAt (most recent completion first)
  completedWithRest.sort((a, b) => {
    const timeA = new Date(a.completedAt!).getTime();
    const timeB = new Date(b.completedAt!).getTime();
    return timeB - timeA;
  });

  const mostRecent = completedWithRest[0];
  const completedTime = new Date(mostRecent.completedAt!).getTime();
  const targetEndAt = completedTime + mostRecent.prescribedRestSeconds! * 1000;
  const now = Date.now();

  if (targetEndAt > now) {
    return {
      setPublicId: mostRecent.publicId,
      setNumber: mostRecent.setNumber,
      blockItemPublicId: mostRecent.blockItemPublicId,
      totalSeconds: mostRecent.prescribedRestSeconds!,
      targetEndAt,
    };
  }

  return null;
}

export function RestTimer({
  activeRest,
  onSkip,
}: {
  activeRest: ActiveRestState;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, Math.ceil((activeRest.targetEndAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const update = () => {
      const rem = Math.max(0, Math.ceil((activeRest.targetEndAt - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        onSkip();
      }
    };

    update();
    const intervalId = setInterval(update, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeRest.targetEndAt, onSkip]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
              Descanso
            </span>
            <span className="font-mono text-base font-extrabold text-[var(--foreground)]">
              {formattedTime}
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-muted)] truncate">
            após a {activeRest.setNumber}ª série
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="px-2.5 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--foreground)] text-[11px] font-semibold transition-colors cursor-pointer shrink-0 active:scale-[0.98]"
      >
        Pular descanso
      </button>
    </div>
  );
}
