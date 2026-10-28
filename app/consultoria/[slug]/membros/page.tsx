// Consultancy members and invitations directory
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  listConsultancyMembers,
  getConsultancyMembersOperationalCounters,
  type ConsultancyMemberItem,
  type ConsultancyMembersOperationalCounters,
} from "@/lib/consultancies/admin";
import {
  listConsultancyInvitations,
  type ConsultancyInvitationItem,
} from "@/lib/consultancies/invitations";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { ConsultancyMembersManager } from "@/components/consultancies/members/consultancy-members-manager";
import { AdminPageContainer } from "@/components/admin/admin-page-container";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    q?: string;
    page?: string;
  }>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatDate(date: unknown): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(String(date));
  if (isNaN(d.getTime())) return "—";
  const day = d.getUTCDate().toString().padStart(2, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export default async function ConsultancyMembersPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = resolvedSearchParams?.q;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Apenas membros com CONSULTANCY_ADMIN podem acessar /membros
  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const query = typeof q === "string" ? q.trim() : "";

  // Buscar membros, convites e contadores operacionais em paralelo com resiliência
  let membersResult = {
    members: [] as ConsultancyMemberItem[],
    total: 0,
    page: 1,
    pageSize: 250,
    totalPages: 1,
  };
  let invitations: ConsultancyInvitationItem[] = [];
  let counters: ConsultancyMembersOperationalCounters = {
    activeMembers: 0,
    suspendedMembers: 0,
    pendingInvitations: 0,
    totalInvitations: 0,
    isError: false,
  };

  try {
    const [fetchedMembers, fetchedInvitations, fetchedCounters] = await Promise.all([
      listConsultancyMembers({
        consultancyId: context.consultancyId,
        query,
        page: 1,
        pageSize: 250,
      }),
      listConsultancyInvitations(context.consultancyId),
      getConsultancyMembersOperationalCounters(context.consultancyId),
    ]);
    membersResult = fetchedMembers;
    invitations = fetchedInvitations;
    counters = fetchedCounters;
  } catch (err) {
    console.error("[ConsultancyMembersPage] Error fetching members, invitations or counters:", err);
    counters.isError = true;
  }

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
      showDashboardWallpaper={true}
    >
      <AdminPageContainer>
        <ConsultancyMembersManager
          slug={slug}
          consultancyName={context.consultancyName}
          currentUserId={session.userId}
          currentMembershipPublicId={context.membershipPublicId}
          initialMembers={membersResult.members}
          initialInvitations={invitations}
          counters={counters}
          initialQuery={query}
        />
      </AdminPageContainer>
    </ConsultancyAppShell>
  );
}
