import { Skeleton } from "@/components/ui/skeleton";

export default function ExercisesCatalogLoading() {
  return (
    <div
      className="min-h-svh w-full bg-transparent text-[var(--text-primary)] flex flex-col"
      aria-busy="true"
      aria-label="Carregando biblioteca de exercícios"
    >
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-8 w-56 sm:w-72 rounded-xl" />
            <Skeleton className="h-4 w-64 sm:w-96 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Skeleton className="h-11 w-full sm:w-80 rounded-xl" />
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
            <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
            <Skeleton className="h-9 w-28 rounded-lg shrink-0" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-xl" />
              <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
