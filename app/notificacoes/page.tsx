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
    <main className="min-h-svh w-full bg-zinc-50 text-zinc-900 pb-16 selection:bg-[#00a859]/10 selection:text-[#00a859]">
      {/* Topbar */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xs border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <Link href="/selecionar-consultoria" className="flex items-center gap-2.5">
            <TrevoOneLogo priority size={110} />
          </Link>

          <Link
            href="/selecionar-consultoria"
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Painel principal →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <PageHeader
          eyebrow="Central de Avisos"
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
      </div>
    </main>
  );
}
