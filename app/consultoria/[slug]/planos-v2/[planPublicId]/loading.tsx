import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionPlanBuilderLoading() {
  return (
    <div
      className="min-h-svh w-full bg-transparent text-[var(--text-primary)] flex flex-col"
      aria-busy="true"
      aria-label="Carregando editor de plano alimentar"
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

        {/* Nutritional Summary Header Skeleton */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-[var(--surface-subtle)] space-y-1.5">
                <Skeleton className="h-3.5 w-16 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Meals Skeleton Cards */}
        <div className="space-y-4">
          {[1, 2, 3].map((m) => (
            <div
              key={m}
              className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-32 rounded-xl" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
