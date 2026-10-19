import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import {
  listUpcomingConsultationsForStudent,
  listConsultationHistoryForStudent,
  listUpcomingConsultationsForProfessional,
  listConsultationHistoryForProfessional,
  listActiveStudentsForConsultationScheduling,
  resolveConsultationJoinAccess,
  type ConsultationProfessionalType,
} from "@/lib/consultancies/consultations";
import {
  listChatConsultationsForStudent,
  listChatConsultationsForProfessional,
  listActiveStudentsForChat,
  type ChatConsultationDto,
  type ActiveStudentForChatDto,
} from "@/lib/consultancies/trevo-chat";
import { StudentConsultationsView } from "@/components/consultancies/student-consultations-view";
import { ProfessionalConsultationsView } from "@/components/consultancies/professional-consultations-view";
import { ConsultationsTabbedContainer } from "@/components/consultancies/consultations-tabbed-container";
import { TrevoChatWorkspace } from "@/components/consultancies/trevo-chat/trevo-chat-workspace";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
    c?: string;
  }>;
};

export default async function ConsultasPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentTab = resolvedSearchParams.tab === "video" ? "video" : "chat";
  const initialChatPublicId = resolvedSearchParams.c || null;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const roles = context.roles;
  const isStudent = roles.includes("STUDENT");
  const isPersonal = roles.includes("PERSONAL");
  const isNutritionist = roles.includes("NUTRITIONIST");
  const isInfluencerOnly = roles.includes("INFLUENCER") && !isStudent && !isPersonal && !isNutritionist;

  // INFLUENCER-only and Admin-only without operational consultation roles are not authorized for standard agenda UI
  if (isInfluencerOnly) {
    redirect(`/consultoria/${slug}`);
  }

  const timezone = context.consultancyTimezone || "America/Sao_Paulo";

  // STUDENT VIEW (includes STUDENT + INFLUENCER)
  if (isStudent) {
    const upcoming = await listUpcomingConsultationsForStudent(
      context.consultancyId,
      context.membershipId,
      20
    );
    const history = await listConsultationHistoryForStudent(
      context.consultancyId,
      context.membershipId,
      20
    );

    const nextConsultation = upcoming[0] || null;
    const joinAccess = nextConsultation
      ? await resolveConsultationJoinAccess(session.userId, slug, nextConsultation.publicId)
      : null;

    const otherUpcoming = upcoming.slice(1);

    let chatConsultations: ChatConsultationDto[] = [];
    let chatError: string | null = null;
    try {
      chatConsultations = await listChatConsultationsForStudent(
        context.consultancyId,
        context.membershipId
      );
    } catch (err: unknown) {
      console.error("[Trevo Chat] Falha não bloqueante ao carregar conversas do aluno:", err);
      chatError = "Não foi possível carregar as conversas do Trevo Chat no momento.";
    }

    const totalUnread = chatConsultations.reduce((acc, c) => acc + (c.unreadCountStudent || 0), 0);

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
      >
        <ConsultationsTabbedContainer
          initialTab={currentTab}
          chatUnreadCount={totalUnread}
          consultancySlug={slug}
          chatError={chatError}
          canSchedule={false}
          videoView={
            <StudentConsultationsView
              consultancySlug={slug}
              consultancyName={context.consultancyName}
              timezone={timezone}
              nextConsultation={nextConsultation}
              joinAccess={joinAccess}
              upcomingConsultations={otherUpcoming}
              historyConsultations={history}
              hideHeader={true}
            />
          }
          chatView={
            <TrevoChatWorkspace
              consultancySlug={slug}
              currentUserId={session.userId}
              isProfessional={false}
              consultations={chatConsultations}
              initialActivePublicId={initialChatPublicId}
            />
          }
        />
      </ConsultancyAppShell>
    );
  }

  // PROFESSIONAL VIEW (PERSONAL or NUTRITIONIST)
  if (isPersonal || isNutritionist) {
    const professionalType: ConsultationProfessionalType = isPersonal ? "PERSONAL" : "NUTRITIONIST";

    const upcoming = await listUpcomingConsultationsForProfessional(
      context.consultancyId,
      context.membershipId,
      20
    );
    const history = await listConsultationHistoryForProfessional(
      context.consultancyId,
      context.membershipId,
      20
    );
    const activeStudents = await listActiveStudentsForConsultationScheduling(
      context.consultancyId
    );

    const nextConsultation = upcoming[0] || null;
    const joinAccessForNext = nextConsultation
      ? await resolveConsultationJoinAccess(session.userId, slug, nextConsultation.publicId)
      : null;

    let chatConsultations: ChatConsultationDto[] = [];
    let activeChatStudents: ActiveStudentForChatDto[] = [];
    let chatError: string | null = null;

    try {
      const [consultationsRes, studentsRes] = await Promise.all([
        listChatConsultationsForProfessional(
          context.consultancyId,
          context.membershipId
        ),
        listActiveStudentsForChat(context.consultancyId),
      ]);
      chatConsultations = consultationsRes;
      activeChatStudents = studentsRes;
    } catch (err: unknown) {
      console.error("[Trevo Chat] Falha não bloqueante ao carregar conversas do profissional:", err);
      chatError = "Não foi possível carregar as conversas do Trevo Chat no momento.";
    }

    const totalUnread = chatConsultations.reduce(
      (acc, c) => acc + (c.unreadCountProfessional || 0),
      0
    );

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
      >
        <ConsultationsTabbedContainer
          initialTab={currentTab}
          chatUnreadCount={totalUnread}
          consultancySlug={slug}
          chatError={chatError}
          canSchedule={true}
          videoView={
            <ProfessionalConsultationsView
              consultancySlug={slug}
              consultancyName={context.consultancyName}
              timezone={timezone}
              professionalType={professionalType}
              activeStudents={activeStudents}
              upcomingConsultations={upcoming}
              historyConsultations={history}
              joinAccessForNext={joinAccessForNext}
              hideHeader={true}
            />
          }
          chatView={
            <TrevoChatWorkspace
              consultancySlug={slug}
              currentUserId={session.userId}
              isProfessional={true}
              professionalType={professionalType}
              consultations={chatConsultations}
              initialActivePublicId={initialChatPublicId}
              activeStudents={activeChatStudents}
            />
          }
        />
      </ConsultancyAppShell>
    );
  }

  // Fallback for admins or unauthorized roles
  redirect(`/consultoria/${slug}`);
}
