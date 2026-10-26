import { Skeleton } from "@/components/ui/skeleton";

export default function FoodsCatalogLoading() {
  return (
    <div
      className="min-h-svh w-full bg-transparent text-[var(--text-primary)] flex flex-col"
      aria-busy="true"
      aria-label="Carregando catálogo de alimentos"
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

        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] flex items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-5 w-48 sm:w-64 rounded-md" />
                <Skeleton className="h-3.5 w-32 rounded-md" />
              </div>
              <Skeleton className="h-6 w-20 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
