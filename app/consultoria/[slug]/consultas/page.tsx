import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import {
  listConsultationHistoryForStudent,
  listConsultationHistoryForProfessional,
  type ConsultationProfessionalType,
} from "@/lib/consultancies/consultations";
import {
  listChatConsultationsForStudent,
  listChatConsultationsForProfessional,
  listActiveStudentsForChat,
  listActiveProfessionalsForChat,
  getUserHiddenConsultationKeys,
  getIntroViewStatus,
  type ChatConsultationDto,
  type ActiveStudentForChatDto,
  type ActiveProfessionalForChatDto,
} from "@/lib/consultancies/trevo-chat";
import { TrevoChatWorkspace } from "@/components/consultancies/trevo-chat/trevo-chat-workspace";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    c?: string;
  }>;
};

export default async function ConsultasPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
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

  if (isInfluencerOnly) {
    redirect(`/consultoria/${slug}`);
  }

  // STUDENT VIEW
  if (isStudent) {
    let chatConsultations: ChatConsultationDto[] = [];
    let activeProfessionals: ActiveProfessionalForChatDto[] = [];
    let hiddenKeys = new Set<string>();
    let hasSeenIntro = false;

    try {
      const introStatus = await getIntroViewStatus(context.consultancyId, session.userId, "STUDENT");
      hasSeenIntro = introStatus.hasSeen;
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Falha ao carregar status de introdução do aluno:", err);
    }

    try {
      hiddenKeys = await getUserHiddenConsultationKeys(context.consultancyId, session.userId);
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Falha ao carregar visibilidade de conversas do aluno:", err);
    }

    try {
      const rawChats = await listChatConsultationsForStudent(
        context.consultancyId,
        context.membershipId
      );
      chatConsultations = rawChats.map((c) => ({
        ...c,
        isRemovedFromMyList: hiddenKeys.has(`CHAT:${c.publicId}`) || hiddenKeys.has(c.publicId),
      }));
    } catch (err: unknown) {
      console.error("[Trevo Chat] Falha ao carregar conversas do aluno:", err);
    }

    try {
      activeProfessionals = await listActiveProfessionalsForChat(context.consultancyId);
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Falha ao listar profissionais para aluno:", err);
    }

    let historyVideoConsultations: ChatConsultationDto[] = [];
    try {
      const history = await listConsultationHistoryForStudent(
        context.consultancyId,
        context.membershipId,
        50
      );
      historyVideoConsultations = history.map((h, i) => ({
        id: -(i + 1),
        publicId: h.publicId,
        consultancyId: context.consultancyId,
        studentMembershipId: context.membershipId,
        studentUserId: session.userId,
        studentName: session.fullName,
        studentEmail: session.email,
        studentUserPublicId: session.userPublicId || null,
        professionalMembershipId: 0,
        professionalUserId: 0,
        professionalName: h.counterpartName,
        professionalUserPublicId: null,
        professionalType: h.professionalType,
        title: h.title || "Consulta por Vídeo",
        status: "COMPLETED",
        closedAt: new Date(h.scheduledEndAt).toISOString(),
        modality: "VIDEO",
        counterpartRole: h.counterpartRole,
        proposedByUserId: null,
        proposedStartAt: new Date(h.scheduledStartAt).toISOString(),
        proposedStartFormatted: h.scheduledStartFormatted,
        studentAcceptedAt: new Date(h.scheduledStartAt).toISOString(),
        professionalAcceptedAt: new Date(h.scheduledStartAt).toISOString(),
        declinedReason: null,
        declinedAt: null,
        canceledAt: h.status === "CANCELED" ? new Date(h.scheduledEndAt).toISOString() : null,
        topic: h.title,
        isMutualConfirmed: true,
        lastMessageAt: new Date(h.scheduledStartAt).toISOString(),
        lastMessagePreview: `📹 Consulta por Vídeo (${h.scheduledStartFormatted})`,
        unreadCountStudent: 0,
        unreadCountProfessional: 0,
        aiAnamnesisJson: null,
        aiAnamnesisStatus: "PENDING",
        confirmedFormRequestId: null,
        isRemovedFromMyList: hiddenKeys.has(`LEGACY_VIDEO:${h.publicId}`) || hiddenKeys.has(h.publicId),
        createdAt: new Date(h.scheduledStartAt).toISOString(),
        updatedAt: new Date(h.scheduledEndAt).toISOString(),
      }));
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Aviso ao carregar histórico de vídeo:", err);
    }

    const allConsultations = [...chatConsultations, ...historyVideoConsultations];

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
        themeVariant="dark-overview"
        showDashboardWallpaper={true}
      >
        <div className="w-full max-w-7xl mx-auto">
          {/* Unified Trevo Chat Workspace */}
          <TrevoChatWorkspace
            consultancySlug={slug}
            currentUserId={session.userId}
            isProfessional={false}
            audienceRole="STUDENT"
            hasSeenIntro={hasSeenIntro}
            consultations={allConsultations}
            initialActivePublicId={initialChatPublicId}
            activeProfessionals={activeProfessionals}
          />
        </div>
      </ConsultancyAppShell>
    );
  }

  // PROFESSIONAL VIEW (PERSONAL or NUTRITIONIST)
  if (isPersonal || isNutritionist) {
    const professionalType: ConsultationProfessionalType = isPersonal ? "PERSONAL" : "NUTRITIONIST";

    let chatConsultations: ChatConsultationDto[] = [];
    let activeChatStudents: ActiveStudentForChatDto[] = [];
    let hiddenKeys = new Set<string>();
    let hasSeenIntro = false;

    try {
      const introStatus = await getIntroViewStatus(context.consultancyId, session.userId, "PROFESSIONAL");
      hasSeenIntro = introStatus.hasSeen;
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Falha ao carregar status de introdução do profissional:", err);
    }

    try {
      hiddenKeys = await getUserHiddenConsultationKeys(context.consultancyId, session.userId);
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Falha ao carregar visibilidade de conversas do profissional:", err);
    }

    try {
      const rawChats = await listChatConsultationsForProfessional(
        context.consultancyId,
        context.membershipId
      );
      chatConsultations = rawChats.map((c) => ({
        ...c,
        isRemovedFromMyList: hiddenKeys.has(`CHAT:${c.publicId}`) || hiddenKeys.has(c.publicId),
      }));
    } catch (err: unknown) {
      console.error("[Trevo Chat] Falha ao carregar conversas do profissional:", err);
    }

    try {
      activeChatStudents = await listActiveStudentsForChat(context.consultancyId);
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Falha ao carregar lista de alunos ativos:", err);
      activeChatStudents = [];
    }

    let historyVideoConsultations: ChatConsultationDto[] = [];
    try {
      const history = await listConsultationHistoryForProfessional(
        context.consultancyId,
        context.membershipId,
        50
      );
      historyVideoConsultations = history.map((h, i) => ({
        id: -(i + 1),
        publicId: h.publicId,
        consultancyId: context.consultancyId,
        studentMembershipId: 0,
        studentUserId: 0,
        studentName: h.counterpartName,
        studentEmail: "",
        studentUserPublicId: null,
        professionalMembershipId: context.membershipId,
        professionalUserId: session.userId,
        professionalName: session.fullName,
        professionalUserPublicId: session.userPublicId || null,
        professionalType: h.professionalType,
        title: h.title || "Consulta por Vídeo",
        status: "COMPLETED",
        closedAt: new Date(h.scheduledEndAt).toISOString(),
        modality: "VIDEO",
        counterpartRole: h.counterpartRole,
        proposedByUserId: null,
        proposedStartAt: new Date(h.scheduledStartAt).toISOString(),
        proposedStartFormatted: h.scheduledStartFormatted,
        studentAcceptedAt: new Date(h.scheduledStartAt).toISOString(),
        professionalAcceptedAt: new Date(h.scheduledStartAt).toISOString(),
        declinedReason: null,
        declinedAt: null,
        canceledAt: h.status === "CANCELED" ? new Date(h.scheduledEndAt).toISOString() : null,
        topic: h.title,
        isMutualConfirmed: true,
        lastMessageAt: new Date(h.scheduledStartAt).toISOString(),
        lastMessagePreview: `📹 Consulta por Vídeo (${h.scheduledStartFormatted})`,
        unreadCountStudent: 0,
        unreadCountProfessional: 0,
        aiAnamnesisJson: null,
        aiAnamnesisStatus: "PENDING",
        confirmedFormRequestId: null,
        isRemovedFromMyList: hiddenKeys.has(`LEGACY_VIDEO:${h.publicId}`) || hiddenKeys.has(h.publicId),
        createdAt: new Date(h.scheduledStartAt).toISOString(),
        updatedAt: new Date(h.scheduledEndAt).toISOString(),
      }));
    } catch (err: unknown) {
      console.warn("[Trevo Chat] Aviso ao carregar histórico de vídeo:", err);
    }

    const allConsultations = [...chatConsultations, ...historyVideoConsultations];

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
        themeVariant="dark-overview"
        showDashboardWallpaper={true}
      >
        <div className="w-full max-w-7xl mx-auto">
          {/* Unified Trevo Chat Workspace */}
          <TrevoChatWorkspace
            consultancySlug={slug}
            currentUserId={session.userId}
            isProfessional={true}
            audienceRole="PROFESSIONAL"
            hasSeenIntro={hasSeenIntro}
            professionalType={professionalType}
            consultations={allConsultations}
            initialActivePublicId={initialChatPublicId}
            activeStudents={activeChatStudents}
          />
        </div>
      </ConsultancyAppShell>
    );
  }

  // Fallback for admins or unauthorized roles
  redirect(`/consultoria/${slug}`);
}
