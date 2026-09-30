import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { listPlatformAiUsageSummary } from "@/lib/ai/quotas";
import { PlatformAdminAiView } from "@/components/admin/platform-admin-ai-view";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const consultancies = await listPlatformAiUsageSummary();

  return <PlatformAdminAiView consultancies={consultancies} />;
}
