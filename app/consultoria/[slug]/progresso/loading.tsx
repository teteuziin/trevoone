import { Skeleton } from "@/components/ui/skeleton";

export default function StudentProgressoLoading() {
  return (
    <div
      className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]"
      aria-busy="true"
      aria-label="Carregando evolução física"
    >
      {/* Topbar Header Skeleton */}
      <header className="sticky top-0 z-30 w-full bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border-default)] shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1.5 hidden sm:block">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <Skeleton className="w-24 h-8 rounded-xl hidden sm:block" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="h-8 w-56 sm:w-72 rounded-xl" />
            <Skeleton className="h-4 w-64 sm:w-96 rounded-md" />
          </div>
          <Skeleton className="h-11 w-40 rounded-xl shrink-0" />
        </div>

        {/* Latest Progress Highlights */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-3.5 w-48 rounded-md" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* History Table / Timeline Cards */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
