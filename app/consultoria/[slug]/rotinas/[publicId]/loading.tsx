import { Skeleton } from "@/components/ui/skeleton";

export default function WorkoutBuilderLoading() {
  return (
    <div
      className="min-h-svh w-full bg-transparent text-[var(--text-primary)] flex flex-col"
      aria-busy="true"
      aria-label="Carregando editor de treino"
    >
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        {/* Top Builder Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-7 w-48 sm:w-64 rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Workout Division Tabs Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]">
          {[1, 2, 3, 4].map((d) => (
            <Skeleton key={d} className="h-10 w-28 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Exercises Blocks Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((b) => (
            <div
              key={b}
              className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-36 rounded-xl" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
