import { Skeleton } from "@/components/ui/skeleton";

export default function ConsultationPreflightLoading() {
  return (
    <div
      className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col"
      aria-busy="true"
      aria-label="Carregando verificação de dispositivos"
    >
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header Skeleton */}
        <div className="space-y-2 pb-5 border-b border-[var(--border-subtle)]">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-8 w-64 sm:w-80 rounded-xl" />
          <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
        </div>

        {/* Summary Banner Skeleton */}
        <Skeleton className="h-16 w-full rounded-2xl" />

        {/* Video Preview Skeleton */}
        <div className="w-full aspect-video rounded-3xl bg-zinc-900 border-2 border-[var(--border-default)] flex items-center justify-center">
          <Skeleton className="w-12 h-12 rounded-2xl" />
        </div>

        {/* Action bar skeleton */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
