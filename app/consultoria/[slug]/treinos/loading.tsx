import { Skeleton } from "@/components/ui/skeleton";

export default function StudentTreinosLoading() {
  return (
    <div
      className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]"
      aria-busy="true"
      aria-label="Carregando treinos"
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
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 space-y-6">
        {/* Page Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="h-8 w-52 sm:w-64 rounded-xl" />
          <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
        </div>

        {/* Training Plan Summary Card */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
              <Skeleton className="h-7 w-60 sm:w-80 rounded-xl" />
              <Skeleton className="h-4 w-44 sm:w-64 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </div>

          {/* Workout Routines Tabs */}
          <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)] overflow-x-auto pb-1">
            <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
            <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
            <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
          </div>
        </div>

        {/* Exercises List Cards */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <Skeleton className="h-5 w-40 sm:w-56 rounded-md" />
                </div>
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
