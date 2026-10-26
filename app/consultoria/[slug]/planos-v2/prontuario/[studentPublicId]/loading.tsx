import { Skeleton } from "@/components/ui/skeleton";

export default function PatientRecordLoading() {
  return (
    <div
      className="min-h-svh w-full bg-transparent text-[var(--text-primary)] flex flex-col"
      aria-busy="true"
      aria-label="Carregando prontuário do paciente"
    >
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        {/* Patient Header Skeleton */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48 sm:w-64 rounded-xl" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((t) => (
            <Skeleton key={t} className="h-9 w-28 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Content Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] space-y-4">
            <Skeleton className="h-6 w-40 rounded-xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4 p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] space-y-4">
            <Skeleton className="h-6 w-32 rounded-xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
