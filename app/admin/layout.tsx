import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { getUnreadCount } from "@/services/notification-service";
import { PlatformAdminShell } from "@/components/admin/platform-admin-shell";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);

  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  let unreadNotificationsCount = 0;
  try {
    unreadNotificationsCount = await getUnreadCount(session.userId);
  } catch {
    unreadNotificationsCount = 0;
  }

  return (
    <PlatformAdminShell
      userName={session.fullName}
      userEmail={session.email}
      unreadNotificationsCount={unreadNotificationsCount}
    >
      {children}
    </PlatformAdminShell>
  );
}
