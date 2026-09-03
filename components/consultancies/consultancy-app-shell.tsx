import React from "react";
import { ConsultancyRole, ROLE_LABELS } from "@/lib/consultancies/context";
import { ConsultancyNavigation, NavItemConfig } from "./consultancy-navigation";
import { ViewModeBanner } from "./view-mode-banner";
import type { EffectiveViewModeState } from "@/lib/consultancies/view-mode";

export interface ConsultancyAppShellProps {
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  roles: ConsultancyRole[];
  userName?: string;
  userEmail?: string;
  unreadNotificationsCount?: number;
  viewModeState?: EffectiveViewModeState;
  maxWidth?: "default" | "wide" | "full";
  className?: string;
  children: React.ReactNode;
}

export function ConsultancyAppShell({
  consultancyName,
  consultancySlug,
  consultancyLogoUrl = null,
  roles,
  userName,
  userEmail,
  unreadNotificationsCount = 0,
  viewModeState,
  maxWidth = "default",
  className = "",
  children,
}: ConsultancyAppShellProps) {
  // Determine effective presentation roles for navigation items
  const activeMode = viewModeState?.effectiveMode;
  const presentationRoles: ConsultancyRole[] = activeMode
    ? activeMode === "ADMIN"
      ? [
          "CONSULTANCY_ADMIN",
          ...(roles.includes("PERSONAL") ? (["PERSONAL"] as ConsultancyRole[]) : []),
          ...(roles.includes("NUTRITIONIST") ? (["NUTRITIONIST"] as ConsultancyRole[]) : []),
        ]
      : activeMode === "PERSONAL"
      ? ["PERSONAL"]
      : activeMode === "NUTRITIONIST"
      ? ["NUTRITIONIST"]
      : activeMode === "INFLUENCER"
      ? ["INFLUENCER"]
      : ["STUDENT"]
    : roles;

  // Build role-derived navigation items
  const items: NavItemConfig[] = [
    {
      id: "overview",
      label: "Visão geral",
      mobileLabel: "Início",
      href: `/consultoria/${consultancySlug}`,
      iconName: "overview",
    },
  ];

  if (presentationRoles.includes("INFLUENCER")) {
    items.push({
      id: "influencer-missoes",
      label: "Missões",
      mobileLabel: "Missões",
      href: `/consultoria/${consultancySlug}/missoes`,
      iconName: "missions",
    });
  }

  const isLearner = presentationRoles.includes("STUDENT") || presentationRoles.includes("INFLUENCER");
  if (isLearner) {
    items.push({
      id: "learner-treinos",
      label: "Treinos",
      mobileLabel: "Treinos",
      href: `/consultoria/${consultancySlug}/treinos`,
      iconName: "training",
    });
    items.push({
      id: "learner-nutricao",
      label: "Nutrição",
      mobileLabel: "Nutrição",
      href: `/consultoria/${consultancySlug}/nutricao`,
      iconName: "nutrition",
    });
    items.push({
      id: "learner-progresso",
      label: "Evolução",
      mobileLabel: "Evolução",
      href: `/consultoria/${consultancySlug}/progresso`,
      iconName: "prescriptions",
    });
  }

  if (presentationRoles.includes("STUDENT")) {
    items.push({
      id: "student-consultas",
      label: "Consultas",
      mobileLabel: "Consultas",
      href: `/consultoria/${consultancySlug}/consultas`,
      iconName: "consultations",
    });
    items.push({
      id: "student-pagamentos",
      label: "Pagamentos",
      mobileLabel: "Pagamentos",
      href: `/consultoria/${consultancySlug}/pagamentos`,
      iconName: "finance",
    });
  }

  if (presentationRoles.includes("PERSONAL")) {
    items.push({
      id: "personal-consultas",
      label: "Consultas",
      mobileLabel: "Consultas",
      href: `/consultoria/${consultancySlug}/consultas`,
      iconName: "consultations",
    });
    items.push({
      id: "personal-treinos",
      label: "Planos de Treino",
      mobileLabel: "Planos",
      href: `/consultoria/${consultancySlug}/personal/treinos`,
      iconName: "prescriptions",
    });
    items.push({
      id: "personal-exercicios",
      label: "Exercícios",
      mobileLabel: "Exercícios",
      href: `/consultoria/${consultancySlug}/personal/exercicios`,
      iconName: "exercises",
    });
    items.push({
      id: "personal-exercicios-v2",
      label: "Biblioteca de Exercícios",
      mobileLabel: "Exercícios",
      href: `/consultoria/${consultancySlug}/exercicios`,
      iconName: "exercises",
    });
    items.push({
      id: "personal-rotinas-v2",
      label: "Criador de Treinos",
      mobileLabel: "Criador",
      href: `/consultoria/${consultancySlug}/rotinas`,
      iconName: "training",
    });
    items.push({
      id: "personal-progresso",
      label: "Evolução dos Alunos",
      mobileLabel: "Alunos",
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      iconName: "prescriptions",
    });
  }

  if (presentationRoles.includes("NUTRITIONIST")) {
    items.push({
      id: "nutritionist-consultas",
      label: "Consultas",
      mobileLabel: "Consultas",
      href: `/consultoria/${consultancySlug}/consultas`,
      iconName: "consultations",
    });
    items.push({
      id: "nutritionist-planos",
      label: "Planos Alimentares",
      mobileLabel: "Planos",
      href: `/consultoria/${consultancySlug}/nutricao/planos`,
      iconName: "prescriptions",
    });
    items.push({
      id: "nutritionist-alimentos",
      label: "Alimentos",
      mobileLabel: "Alimentos",
      href: `/consultoria/${consultancySlug}/nutricao/alimentos`,
      iconName: "nutrition",
    });
    items.push({
      id: "nutritionist-progresso",
      label: "Evolução dos Alunos",
      mobileLabel: "Alunos",
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      iconName: "prescriptions",
    });
  }

  if (presentationRoles.includes("CONSULTANCY_ADMIN")) {
    items.push({
      id: "admin-exercicios-v2",
      label: "Biblioteca de Exercícios",
      mobileLabel: "Exercícios",
      href: `/consultoria/${consultancySlug}/exercicios`,
      iconName: "exercises",
    });
    items.push({
      id: "admin-rotinas-v2",
      label: "Criador de Treinos",
      mobileLabel: "Criador",
      href: `/consultoria/${consultancySlug}/rotinas`,
      iconName: "training",
    });
    items.push({
      id: "admin-membros",
      label: "Membros",
      mobileLabel: "Membros",
      href: `/consultoria/${consultancySlug}/membros`,
      iconName: "members",
    });
    items.push({
      id: "admin-financeiro",
      label: "Financeiro",
      mobileLabel: "Financeiro",
      href: `/consultoria/${consultancySlug}/financeiro`,
      iconName: "finance",
    });
    items.push({
      id: "admin-missoes",
      label: "Missões",
      mobileLabel: "Missões",
      href: `/consultoria/${consultancySlug}/missoes/gestao`,
      iconName: "missions",
    });
    items.push({
      id: "admin-assinatura",
      label: "Assinatura",
      mobileLabel: "Assinatura",
      href: `/consultoria/${consultancySlug}/assinatura`,
      iconName: "subscription",
    });
  }

  // Deduplicate items by href just in case
  const seenHrefs = new Set<string>();
  const deduplicatedItems: NavItemConfig[] = [];
  for (const item of items) {
    if (!seenHrefs.has(item.href)) {
      seenHrefs.add(item.href);
      deduplicatedItems.push(item);
    }
  }

  // Derive explicit role-aware primary mobile destinations (max 4)
  const overviewItem: NavItemConfig = {
    id: "overview",
    label: "Visão geral",
    mobileLabel: "Início",
    href: `/consultoria/${consultancySlug}`,
    iconName: "overview",
  };

  const mobilePrimaryItems: NavItemConfig[] = [];

  if (presentationRoles.includes("CONSULTANCY_ADMIN")) {
    mobilePrimaryItems.push(
      overviewItem,
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
        id: "admin-assinatura",
        label: "Assinatura",
        mobileLabel: "Assinatura",
        href: `/consultoria/${consultancySlug}/assinatura`,
        iconName: "subscription",
      }
    );
  } else if (presentationRoles.includes("PERSONAL") && presentationRoles.includes("NUTRITIONIST")) {
    mobilePrimaryItems.push(
      overviewItem,
      {
        id: "personal-treinos",
        label: "Planos de Treino",
        mobileLabel: "Treinos",
        href: `/consultoria/${consultancySlug}/personal/treinos`,
        iconName: "prescriptions",
      },
      {
        id: "nutritionist-planos",
        label: "Planos Alimentares",
        mobileLabel: "Dietas",
        href: `/consultoria/${consultancySlug}/nutricao/planos`,
        iconName: "prescriptions",
      },
      {
        id: "personal-progresso",
        label: "Evolução dos Alunos",
        mobileLabel: "Alunos",
        href: `/consultoria/${consultancySlug}/progresso/alunos`,
        iconName: "prescriptions",
      }
    );
  } else if (presentationRoles.includes("PERSONAL")) {
    mobilePrimaryItems.push(
      overviewItem,
      {
        id: "personal-treinos",
        label: "Planos de Treino",
        mobileLabel: "Treinos",
        href: `/consultoria/${consultancySlug}/personal/treinos`,
        iconName: "prescriptions",
      },
      {
        id: "personal-exercicios",
        label: "Exercícios",
        mobileLabel: "Exercícios",
        href: `/consultoria/${consultancySlug}/personal/exercicios`,
        iconName: "exercises",
      },
      {
        id: "personal-progresso",
        label: "Evolução dos Alunos",
        mobileLabel: "Alunos",
        href: `/consultoria/${consultancySlug}/progresso/alunos`,
        iconName: "prescriptions",
      }
    );
  } else if (presentationRoles.includes("NUTRITIONIST")) {
    mobilePrimaryItems.push(
      overviewItem,
      {
        id: "nutritionist-planos",
        label: "Planos Alimentares",
        mobileLabel: "Planos",
        href: `/consultoria/${consultancySlug}/nutricao/planos`,
        iconName: "prescriptions",
      },
      {
        id: "nutritionist-alimentos",
        label: "Alimentos",
        mobileLabel: "Alimentos",
        href: `/consultoria/${consultancySlug}/nutricao/alimentos`,
        iconName: "nutrition",
      },
      {
        id: "nutritionist-progresso",
        label: "Evolução dos Alunos",
        mobileLabel: "Alunos",
        href: `/consultoria/${consultancySlug}/progresso/alunos`,
        iconName: "prescriptions",
      }
    );
  } else if (presentationRoles.includes("INFLUENCER")) {
    mobilePrimaryItems.push(
      overviewItem,
      {
        id: "influencer-missoes",
        label: "Missões",
        mobileLabel: "Missões",
        href: `/consultoria/${consultancySlug}/missoes`,
        iconName: "missions",
      },
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
      }
    );
  } else {
    // Default: Aluno (STUDENT)
    mobilePrimaryItems.push(
      overviewItem,
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
        iconName: "prescriptions",
      }
    );
  }

  const roleLabels = roles.map((r) => ROLE_LABELS[r] || r);

  const maxWidthClass =
    maxWidth === "full"
      ? "max-w-full"
      : maxWidth === "wide"
      ? "max-w-7xl"
      : "max-w-6xl";

  return (
    <div className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      {/* Navigation Shell */}
      <ConsultancyNavigation
        consultancySlug={consultancySlug}
        consultancyName={consultancyName}
        consultancyLogoUrl={consultancyLogoUrl}
        items={deduplicatedItems}
        mobilePrimaryItems={mobilePrimaryItems}
        userName={userName}
        userEmail={userEmail}
        roleLabels={roleLabels}
        unreadNotificationsCount={unreadNotificationsCount}
        viewModeState={viewModeState}
      />

      {/* Preview Notification Banner */}
      {viewModeState?.isPreview && (
        <ViewModeBanner
          consultancySlug={consultancySlug}
          effectiveMode={viewModeState.effectiveMode}
          defaultMode={viewModeState.defaultMode}
        />
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 ${maxWidthClass} ${className}`.trim()}
      >
        {children}
      </main>
    </div>
  );
}
