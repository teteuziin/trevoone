import { Skeleton } from "@/components/ui/skeleton";

export default function ConsultancyHomeLoading() {
  return (
    <div
      className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]"
      aria-busy="true"
      aria-label="Carregando painel da consultoria"
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
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 space-y-6 sm:space-y-8">
        {/* Context Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-44 sm:w-56 rounded-xl" />
            <Skeleton className="h-4 w-60 sm:w-80 rounded-md" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        {/* Hero Section Skeleton (Mobile: scroll card, Desktop: 65% / 35% grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 sm:h-8 w-3/4 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-24 rounded-xl" />
              <Skeleton className="h-6 w-32 rounded-xl" />
            </div>
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-4">
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
              <Skeleton className="h-11 w-40 sm:w-48 rounded-xl" />
            </div>
          </div>

          <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 sm:h-7 w-2/3 rounded-xl" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-28 rounded-xl" />
            </div>
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-4">
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
              <Skeleton className="h-11 w-36 sm:w-44 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Quick Access Tiles Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:max-w-2xl gap-3 sm:gap-4">
            <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Physical Progress Card Skeleton */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
            <Skeleton className="h-10 w-44 rounded-xl shrink-0" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <Skeleton className="h-3 w-14 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
