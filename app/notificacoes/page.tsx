import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getUserNotificationCenter, resolveNotificationDeepLink, markNotificationRead } from "@/services/notification-service";
import { getVapidPublicKey } from "@/lib/notifications/web-push-sender";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationCenterView } from "@/components/notifications/notification-center-view";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import Link from "next/link";

interface NotificacoesPageProps {
  searchParams: Promise<{
    pagina?: string;
    abrir?: string;
  }>;
}

export default async function NotificacoesPage({ searchParams }: NotificacoesPageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;

  // Handle push notification click resolver
  if (resolvedParams.abrir) {
    const targetLink = await resolveNotificationDeepLink(session.userId, resolvedParams.abrir);
    if (targetLink && targetLink !== "/notificacoes") {
      // Mark as read on direct click open
      await markNotificationRead(session.userId, resolvedParams.abrir);
      redirect(targetLink);
    }
  }

  const page = parseInt(resolvedParams.pagina || "1", 10) || 1;
  const data = await getUserNotificationCenter(session.userId, page, 20);
  const vapidPublicKey = getVapidPublicKey();

  return (
    <div className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      {/* Topbar Header */}
      <header className="sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)] shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <Link href="/selecionar-consultoria" className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl py-1 px-1.5 -ml-1.5">
            <TrevoOneLogo priority size={34} showWordmark />
          </Link>

          <Link
            href="/selecionar-consultoria"
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors"
          >
            Painel principal →
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <PageHeader
          title="Notificações"
          description="Acompanhe avisos de treinos, dietas, pagamentos e comunicados da plataforma."
          backHref="/selecionar-consultoria"
          backLabel="Voltar ao início"
        />

        <NotificationCenterView
          initialNotifications={data.notifications}
          initialTotal={data.total}
          initialUnreadCount={data.unreadCount}
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          vapidPublicKey={vapidPublicKey}
        />
      </main>
    </div>
  );
}
