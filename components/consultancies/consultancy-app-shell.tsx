import { PostLoginWelcome } from "@/components/auth/post-login-welcome";
import { AnnouncementSlideModal } from "@/components/announcements/announcement-slide-modal";
import type { ConsultancyAnnouncementDto } from "@/lib/consultancies/announcements";
import React from "react";
import { ConsultancyRole, ROLE_LABELS } from "@/lib/consultancies/context";
import { ConsultancyNavigation, NavItemConfig } from "./consultancy-navigation";
import { ViewModeBanner } from "./view-mode-banner";
import type { EffectiveViewModeState } from "@/lib/consultancies/view-mode";
import { SessionScopeGuard } from "@/components/auth/session-scope-guard";
import { StudentOfflinePrimer } from "@/components/offline/student-offline-primer";
import { ActivityHeartbeat } from "./activity-heartbeat";

export interface ConsultancyAppShellProps {
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  roles: ConsultancyRole[];
  userName?: string;
  userEmail?: string;
  userPublicId?: string;
  userAvatarUrl?: string | null;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
  unreadAnnouncements?: ConsultancyAnnouncementDto[];
  consultancyPublicId?: string;
  unreadNotificationsCount?: number;
  viewModeState?: EffectiveViewModeState;
  activeRole?: ConsultancyRole;
  maxWidth?: "narrow" | "default" | "wide" | "full";
  className?: string;
  children: React.ReactNode;
}

export function ConsultancyAppShell({
  consultancyName,
  consultancySlug,
  consultancyLogoUrl = null,
  roles = [],
  userName,
  userEmail,
  userPublicId,
  userAvatarUrl,
  hasProfilePhoto,
  profilePhotoUpdatedAt,
  unreadAnnouncements,
  consultancyPublicId,
  unreadNotificationsCount = 0,
  viewModeState,
  activeRole,
  maxWidth = "default",
  className = "",
  children,
}: ConsultancyAppShellProps) {
  // MULTI-ROLE UNIFIED EXPERIENCE:
  // Presentation roles represent the user's real capabilities in the consultancy.
  // Only when explicitly in preview mode (e.g. admin previewing student), restrict to that mode.
  const safeRoles = Array.isArray(roles) ? roles : [];
  const isPreview = viewModeState?.isPreview ?? false;
  const presentationRoles: ConsultancyRole[] = isPreview && viewModeState?.effectiveMode
    ? [
        viewModeState.effectiveMode === "ADMIN"
          ? "CONSULTANCY_ADMIN"
          : (viewModeState.effectiveMode as ConsultancyRole),
      ]
    : safeRoles;

  const isPersonal = presentationRoles.includes("PERSONAL");
  const isNutritionist = presentationRoles.includes("NUTRITIONIST");
  const isAdmin = presentationRoles.includes("CONSULTANCY_ADMIN");
  const isInfluencer = presentationRoles.includes("INFLUENCER");
  const isStudent = presentationRoles.includes("STUDENT");

  // Build role-derived navigation items
  const overviewItem: NavItemConfig = {
    id: "overview",
    label: "Visão geral",
    mobileLabel: "Início",
    href: `/consultoria/${consultancySlug}`,
    iconName: "overview",
  };

    const rawItems: NavItemConfig[] = [overviewItem];

  // 1. MEU ACOMPANHAMENTO (Aluno - STUDENT FIRST)
  if (isStudent && !isPersonal && !isNutritionist && !isAdmin) {
    rawItems.push({
      id: "learner-treinos",
      label: "Treinos",
      mobileLabel: "Treinos",
      href: `/consultoria/${consultancySlug}/treinos`,
      iconName: "training",
    });
    rawItems.push({
      id: "learner-nutricao",
      label: "Nutrição",
      mobileLabel: "Nutrição",
      href: `/consultoria/${consultancySlug}/nutricao`,
      iconName: "nutrition",
    });
    rawItems.push({
      id: "learner-progresso",
      label: "Evolução",
      mobileLabel: "Evolução",
      href: `/consultoria/${consultancySlug}/progresso`,
      iconName: "progress",
    });
    rawItems.push({
      id: "student-consultas",
      label: "Consultas",
      mobileLabel: "Consultas",
      href: `/consultoria/${consultancySlug}/consultas`,
      iconName: "consultations",
    });
    rawItems.push({
      id: "student-pagamentos",
      label: "Pagamentos",
      mobileLabel: "Pagamentos",
      href: `/consultoria/${consultancySlug}/pagamentos`,
      iconName: "finance",
    });
  }

  // 2. PARCERIA (Influencer / VIP - Secundário quando há STUDENT)
  if (isInfluencer) {
    rawItems.push({
      id: "influencer-missoes",
      label: "Missões",
      mobileLabel: "Missões",
      href: `/consultoria/${consultancySlug}/missoes`,
      iconName: "missions",
    });
    rawItems.push({
      id: "influencer-indicacoes",
      label: "Indicações & Ganhos",
      mobileLabel: "Indicações",
      href: `/consultoria/${consultancySlug}/indicacoes`,
      iconName: "referrals",
    });
  }

  // 2. ATENDIMENTO (Personal e/ou Nutricionista)
  if (isPersonal || isNutritionist) {
    rawItems.push({
      id: "atendimento-alunos",
      label: isNutritionist && !isPersonal ? "Pacientes / Alunos" : "Alunos",
      mobileLabel: "Alunos",
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      iconName: "members",
    });

    if (isPersonal) {
      rawItems.push({
        id: "personal-rotinas",
        label: "Treinos",
        mobileLabel: "Treinos",
        href: `/consultoria/${consultancySlug}/rotinas`,
        iconName: "training",
      });
    }

    if (isNutritionist) {
      rawItems.push({
        id: "nutritionist-planos",
        label: "Planos Alimentares",
        mobileLabel: "Dietas",
        href: `/consultoria/${consultancySlug}/planos-v2`,
        iconName: "nutrition",
      });
      rawItems.push({
        id: "nutritionist-prontuario",
        label: "Prontuários",
        mobileLabel: "Prontuários",
        href: `/consultoria/${consultancySlug}/planos-v2/prontuario`,
        iconName: "progress",
      });
    }

    rawItems.push({
      id: "atendimento-consultas",
      label: "Consultas",
      mobileLabel: "Consultas",
      href: `/consultoria/${consultancySlug}/consultas`,
      iconName: "consultations",
    });
  }

  // 3. GESTÃO (Administrador da Consultoria)
  if (isAdmin) {
    rawItems.push({
      id: "admin-membros",
      label: (isPersonal || isNutritionist) ? "Membros da Equipe" : "Membros & Alunos",
      mobileLabel: "Membros",
      href: `/consultoria/${consultancySlug}/membros`,
      iconName: "members",
    });
    rawItems.push({
      id: "admin-financeiro",
      label: "Financeiro",
      mobileLabel: "Financeiro",
      href: `/consultoria/${consultancySlug}/financeiro`,
      iconName: "finance",
    });
    rawItems.push({
      id: "admin-operacoes",
      label: "Operações",
      mobileLabel: "Operações",
      href: `/consultoria/${consultancySlug}/operacoes`,
      iconName: "operations",
    });
    if (!isInfluencer) {
      rawItems.push({
        id: "admin-indicacoes",
        label: "Indicações & Afiliados",
        mobileLabel: "Indicações",
        href: `/consultoria/${consultancySlug}/indicacoes`,
        iconName: "referrals",
      });
      rawItems.push({
        id: "admin-missoes",
        label: "Gestão de Missões",
        mobileLabel: "Missões",
        href: `/consultoria/${consultancySlug}/missoes/gestao`,
        iconName: "missions",
      });
    }
    rawItems.push({
      id: "admin-assinatura",
      label: "Assinatura",
      mobileLabel: "Assinatura",
      href: `/consultoria/${consultancySlug}/assinatura`,
      iconName: "subscription",
    });
    rawItems.push({
      id: "admin-ia",
      label: "Gestão de IA & Cotas",
      mobileLabel: "Cotas IA",
      href: `/consultoria/${consultancySlug}/configuracoes/ia`,
      iconName: "ai",
    });
    rawItems.push({
      id: "admin-atividades",
      label: "Central de Atividades",
      mobileLabel: "Atividades",
      href: `/consultoria/${consultancySlug}/atividades`,
      iconName: "activity",
    });
  }

  // 4. BIBLIOTECA (Exercícios para Personal, Alimentos para Nutri)
  if (isPersonal) {
    rawItems.push({
      id: "personal-exercicios",
      label: "Biblioteca de Exercícios",
      mobileLabel: "Exercícios",
      href: `/consultoria/${consultancySlug}/exercicios`,
      iconName: "exercises",
    });
  }
  if (isNutritionist) {
    rawItems.push({
      id: "nutritionist-alimentos",
      label: "Biblioteca de Alimentos",
      mobileLabel: "Alimentos",
      href: `/consultoria/${consultancySlug}/alimentos-v2`,
      iconName: "nutrition",
    });
  }

  // INTELLIGENT DEDUPLICATION BY ID AND HREF
  const seenHrefs = new Set<string>();
  const seenIds = new Set<string>();
  const deduplicatedItems: NavItemConfig[] = [];

  for (const item of rawItems) {
    if (seenIds.has(item.id)) continue;
    if (seenHrefs.has(item.href)) continue;
    seenIds.add(item.id);
    seenHrefs.add(item.href);
    deduplicatedItems.push(item);
  }

  // DERIVE EXACT MOBILE PRIMARY ITEMS (Max 4 items + "Mais" button = 5 items)
  const mobilePrimaryItems: NavItemConfig[] = [overviewItem];

  if (isStudent && (isInfluencer || (!isPersonal && !isNutritionist && !isAdmin))) {
    // STUDENT FIRST: Always Início, Treinos, Nutrição, Evolução for anyone who is STUDENT
    mobilePrimaryItems.push(
      {
        id: "learner-treinos",
        label: "Treinos",
        mobileLabel: "Treinos",
        href: `/consultoria/${consultancySlug}/treinos`,
        iconName: "training",
      },
      {
        id: "learner-nutricao",
        label: "Nutrição",
        mobileLabel: "Nutrição",
        href: `/consultoria/${consultancySlug}/nutricao`,
        iconName: "nutrition",
      },
      {
        id: "learner-progresso",
        label: "Evolução",
        mobileLabel: "Evolução",
        href: `/consultoria/${consultancySlug}/progresso`,
        iconName: "progress",
      }
    );
  } else if (isPersonal && isAdmin) {
    mobilePrimaryItems.push(
      {
        id: "atendimento-alunos",
        label: "Alunos",
        mobileLabel: "Alunos",
        href: `/consultoria/${consultancySlug}/progresso/alunos`,
        iconName: "members",
      },
      {
        id: "personal-rotinas",
        label: "Treinos",
        mobileLabel: "Treinos",
        href: `/consultoria/${consultancySlug}/rotinas`,
        iconName: "training",
      },
      {
        id: "admin-operacoes",
        label: "Operações",
        mobileLabel: "Operações",
        href: `/consultoria/${consultancySlug}/operacoes`,
        iconName: "operations",
      }
    );
  } else if (isNutritionist && isAdmin) {
    mobilePrimaryItems.push(
      {
        id: "atendimento-alunos",
        label: "Pacientes",
        mobileLabel: "Pacientes",
        href: `/consultoria/${consultancySlug}/progresso/alunos`,
        iconName: "members",
      },
      {
        id: "nutritionist-planos",
        label: "Planos",
        mobileLabel: "Planos",
        href: `/consultoria/${consultancySlug}/planos-v2`,
        iconName: "nutrition",
      },
      {
        id: "admin-operacoes",
        label: "Operações",
        mobileLabel: "Operações",
        href: `/consultoria/${consultancySlug}/operacoes`,
        iconName: "operations",
      }
    );
  } else if (isInfluencer && !isStudent) {
    mobilePrimaryItems.push(
      {
        id: "influencer-missoes",
        label: "Missões",
        mobileLabel: "Missões",
        href: `/consultoria/${consultancySlug}/missoes`,
        iconName: "missions",
      },
      {
        id: "influencer-indicacoes",
        label: "Indicações",
        mobileLabel: "Indicações",
        href: `/consultoria/${consultancySlug}/indicacoes`,
        iconName: "referrals",
      },
      {
        id: "influencer-comissoes",
        label: "Comissões",
        mobileLabel: "Comissões",
        href: `/consultoria/${consultancySlug}/indicacoes`,
        iconName: "finance",
      }
    );
  } else if (isAdmin) {
    mobilePrimaryItems.push(
      {
        id: "admin-membros",
        label: "Membros",
        mobileLabel: "Membros",
        href: `/consultoria/${consultancySlug}/membros`,
        iconName: "members",
      },
      {
        id: "admin-financeiro",
        label: "Financeiro",
        mobileLabel: "Financeiro",
        href: `/consultoria/${consultancySlug}/financeiro`,
        iconName: "finance",
      },
      {
        id: "admin-operacoes",
        label: "Operações",
        mobileLabel: "Operações",
        href: `/consultoria/${consultancySlug}/operacoes`,
        iconName: "operations",
      }
    );
  } else if (isPersonal) {
    mobilePrimaryItems.push(
      {
        id: "atendimento-alunos",
        label: "Alunos",
        mobileLabel: "Alunos",
        href: `/consultoria/${consultancySlug}/progresso/alunos`,
        iconName: "members",
      },
      {
        id: "personal-rotinas",
        label: "Treinos",
        mobileLabel: "Treinos",
        href: `/consultoria/${consultancySlug}/rotinas`,
        iconName: "training",
      },
      {
        id: "atendimento-consultas",
        label: "Consultas",
        mobileLabel: "Consultas",
        href: `/consultoria/${consultancySlug}/consultas`,
        iconName: "consultations",
      }
    );
  } else if (isNutritionist) {
    mobilePrimaryItems.push(
      {
        id: "atendimento-alunos",
        label: "Pacientes",
        mobileLabel: "Pacientes",
        href: `/consultoria/${consultancySlug}/progresso/alunos`,
        iconName: "members",
      },
      {
        id: "nutritionist-planos",
        label: "Planos",
        mobileLabel: "Planos",
        href: `/consultoria/${consultancySlug}/planos-v2`,
        iconName: "nutrition",
      },
      {
        id: "atendimento-consultas",
        label: "Consultas",
        mobileLabel: "Consultas",
        href: `/consultoria/${consultancySlug}/consultas`,
        iconName: "consultations",
      }
    );
  } else {
    // Default: Aluno (STUDENT)
    mobilePrimaryItems.push(
      {
        id: "learner-treinos",
        label: "Treinos",
        mobileLabel: "Treinos",
        href: `/consultoria/${consultancySlug}/treinos`,
        iconName: "training",
      },
      {
        id: "learner-nutricao",
        label: "Nutrição",
        mobileLabel: "Nutrição",
        href: `/consultoria/${consultancySlug}/nutricao`,
        iconName: "nutrition",
      },
      {
        id: "learner-progresso",
        label: "Evolução",
        mobileLabel: "Evolução",
        href: `/consultoria/${consultancySlug}/progresso`,
        iconName: "progress",
      }
    );
  }

  // ACTIVE ROLE DERIVATION (Offline 360 Multi-Role Security Gate):
  // 1. If activeRole is explicitly specified (e.g. from resolved route context):
  //    Follow activeRole strictly.
  // 2. If viewModeState is present (e.g. on Dashboard):
  //    Active mode is determined exclusively by effectiveMode.
  //    effectiveMode === "STUDENT"      -> "STUDENT"
  //    effectiveMode === "ADMIN"        -> "CONSULTANCY_ADMIN"
  //    effectiveMode === "PERSONAL"     -> "PERSONAL"
  //    effectiveMode === "NUTRITIONIST" -> "NUTRITIONIST"
  //    effectiveMode === "INFLUENCER"   -> "INFLUENCER"
  // 3. If neither activeRole nor viewModeState is provided:
  //    Only treat as STUDENT if the user is single-role STUDENT (roles.length === 1 && roles[0] === "STUDENT").
  //    For multi-role accounts without viewModeState or activeRole, default to non-student presentation role.
  let activeContextRole: ConsultancyRole;
  if (activeRole) {
    activeContextRole = activeRole;
  } else if (viewModeState) {
    activeContextRole =
      viewModeState.effectiveMode === "ADMIN"
        ? "CONSULTANCY_ADMIN"
        : (viewModeState.effectiveMode as ConsultancyRole);
  } else if (safeRoles.length === 1 && safeRoles[0] === "STUDENT") {
    activeContextRole = "STUDENT";
  } else {
    activeContextRole = presentationRoles[0] || safeRoles[0] || "STUDENT";
  }

  const isStudentActive = activeContextRole === "STUDENT";
  const offlineRole = activeContextRole;

  // STUDENT FIRST: Se for Aluno, exibir etiqueta de Aluno primeiro
  const sortedRolesForLabels = [...safeRoles].sort((a, b) => {
    if (a === "STUDENT") return -1;
    if (b === "STUDENT") return 1;
    return 0;
  });
  const roleLabels: string[] = [];
  for (const r of sortedRolesForLabels) {
    if (r === "INFLUENCER") {
      roleLabels.push("Influenciador", "VIP");
    } else {
      roleLabels.push(ROLE_LABELS[r] || r);
    }
  }

  const hasExplicitMaxWidth = className.includes("max-w-");
  const effectiveMaxWidthClass = hasExplicitMaxWidth
    ? ""
    : maxWidth === "full"
    ? "max-w-full"
    : maxWidth === "wide"
    ? "max-w-7xl"
    : maxWidth === "narrow"
    ? "max-w-3xl"
    : "max-w-6xl";

  return (
    <div className="min-h-svh w-full bg-transparent text-[var(--text-primary)] flex flex-col lg:pl-64 print:pl-0 selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)] transition-colors">
      {/* Session Scope & Offline Isolation Guard */}
      {userPublicId && consultancyPublicId && (
        <>
          <SessionScopeGuard
            userPublicId={userPublicId}
            userName={userName}
            consultancyPublicId={consultancyPublicId}
            consultancySlug={consultancySlug}
            consultancyName={consultancyName}
            consultancyLogoUrl={consultancyLogoUrl}
            role={offlineRole}
          />
          {isStudentActive && (
            <StudentOfflinePrimer
              userPublicId={userPublicId}
              userName={userName}
              consultancyPublicId={consultancyPublicId}
              consultancySlug={consultancySlug}
              role="STUDENT"
            />
          )}
        </>
      )}

      {/* Navigation Shell (Sidebar on desktop, Topbar + Bottom Bar on mobile/tablet) */}
      <ConsultancyNavigation
        consultancySlug={consultancySlug}
        consultancyName={consultancyName}
        consultancyLogoUrl={consultancyLogoUrl}
        items={deduplicatedItems}
        mobilePrimaryItems={mobilePrimaryItems}
        userName={userName}
        userEmail={userEmail}
        userPublicId={userPublicId}
        avatarUrl={userAvatarUrl}
        hasProfilePhoto={hasProfilePhoto}
        profilePhotoUpdatedAt={profilePhotoUpdatedAt}
        roleLabels={roleLabels}
        unreadNotificationsCount={unreadNotificationsCount}
        viewModeState={viewModeState}
      />

      {/* Post-Login Welcome Slide / Overlay */}
      <PostLoginWelcome
        userName={userName}
        userEmail={userEmail}
        userPublicId={userPublicId}
        avatarUrl={userAvatarUrl}
        hasProfilePhoto={hasProfilePhoto}
        profilePhotoUpdatedAt={profilePhotoUpdatedAt}
      />

      {/* Unread Announcements Slide / Reading Modal */}
      {unreadAnnouncements && unreadAnnouncements.length > 0 && (
        <AnnouncementSlideModal
          announcements={unreadAnnouncements}
          consultancySlug={consultancySlug}
        />
      )}

      {/* Preview Notification Banner */}
      {viewModeState?.isPreview && (
        <ViewModeBanner
          consultancySlug={consultancySlug}
          effectiveMode={viewModeState.effectiveMode}
          defaultMode={viewModeState.defaultMode}
        />
      )}

      {/* Main Content Area */}
      <ActivityHeartbeat slug={consultancySlug} />
      <main
        className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 xl:p-10 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 lg:pb-10 print:p-0 print:max-w-full ${effectiveMaxWidthClass} ${className}`.trim()}
      >
        {children}
      </main>
    </div>
  );
}
