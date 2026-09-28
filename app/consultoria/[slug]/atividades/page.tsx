import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import {
  listConsultancyActivityEvents,
  type ActivityFilterOptions,
} from "@/lib/consultancies/activity-log";
import { ConsultancyActivityCenterView } from "@/components/consultancies/activity/consultancy-activity-center-view";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    period?: string;
    role?: string;
    module?: string;
    action?: string;
    search?: string;
    page?: string;
  }>;
};

export default async function ConsultancyActivityPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { period, role, module: mod, action, search, page } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Apenas membros com CONSULTANCY_ADMIN ou PLATFORM_ADMIN podem acessar o Centro de Atividades
  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const filters: ActivityFilterOptions = {};

  if (role && role !== "ALL") {
    filters.actorRole = role;
  }
  if (mod && mod !== "ALL") {
    filters.module = mod;
  }
  if (action && action.trim()) {
    filters.action = action.trim();
  }
  if (search && search.trim()) {
    filters.search = search.trim();
  }

  // Handle date filters
  if (period === "TODAY") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filters.startDate = today.toISOString().slice(0, 19).replace("T", " ");
  } else if (period === "WEEK") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    filters.startDate = weekAgo.toISOString().slice(0, 19).replace("T", " ");
  } else if (period === "MONTH") {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    filters.startDate = monthAgo.toISOString().slice(0, 19).replace("T", " ");
  }

  const pageNum = Number(page);
  const validPage = !isNaN(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1;
  const limit = 50;
  const offset = (validPage - 1) * limit;

  const { events, total } = await listConsultancyActivityEvents(
    context.consultancyId,
    filters,
    limit,
    offset
  );

  return (
    <ConsultancyAppShell
      consultancySlug={slug}
      consultancyName={context.consultancyName}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
    >
      <ConsultancyActivityCenterView
        initialEvents={events}
        totalEvents={total}
        initialFilters={{
          period,
          role,
          module: mod,
          action,
          search,
        }}
      />
    </ConsultancyAppShell>
  );
}
