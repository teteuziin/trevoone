export default function AccountProfileLoading() {
  return (
    <main className="min-h-dvh w-full bg-[var(--background)] text-[var(--text-primary)] p-4 sm:p-6 lg:p-8 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 w-48 bg-[var(--surface-hover)] rounded-md" />
        <div className="space-y-2">
          <div className="h-8 w-64 bg-[var(--surface-hover)] rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-[var(--surface-hover)] rounded-md" />
        </div>
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] h-48" />
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] h-56" />
      </div>
    </main>
  );
}
