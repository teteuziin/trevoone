import { Skeleton } from "@/components/ui/skeleton";

export default function ConsultasLoading() {
  return (
    <div
      className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col"
      aria-busy="true"
      aria-label="Carregando consultas"
    >
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header Skeleton */}
        <div className="space-y-2 pb-5 border-b border-[var(--border-subtle)]">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-8 w-48 sm:w-60 rounded-xl" />
          <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
        </div>

        {/* Timezone banner skeleton */}
        <Skeleton className="h-10 w-full rounded-xl" />

        {/* Highlight next consultation skeleton */}
        <div className="p-6 rounded-2xl border-2 border-[var(--border-default)] bg-[var(--surface)] space-y-5">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>

        {/* List items skeleton */}
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
