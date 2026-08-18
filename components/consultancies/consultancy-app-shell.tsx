import React from "react";
import { ConsultancyRole, ROLE_LABELS } from "@/lib/consultancies/context";
import { ConsultancyNavigation, NavItemConfig } from "./consultancy-navigation";

export interface ConsultancyAppShellProps {
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  roles: ConsultancyRole[];
  userName?: string;
  userEmail?: string;
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
  maxWidth = "default",
  className = "",
  children,
}: ConsultancyAppShellProps) {
  // Build role-derived navigation items
  const items: NavItemConfig[] = [
    {
      id: "overview",
      label: "Visão geral",
      href: `/consultoria/${consultancySlug}`,
      iconName: "overview",
    },
  ];

  if (roles.includes("STUDENT")) {
    items.push({
      id: "student-treinos",
      label: "Treinos",
      href: `/consultoria/${consultancySlug}/treinos`,
      iconName: "training",
    });
    items.push({
      id: "student-nutricao",
      label: "Nutrição",
      href: `/consultoria/${consultancySlug}/nutricao`,
      iconName: "nutrition",
    });
    items.push({
      id: "student-progresso",
      label: "Evolução",
      href: `/consultoria/${consultancySlug}/progresso`,
      iconName: "prescriptions",
    });
  }

  if (roles.includes("PERSONAL")) {
    items.push({
      id: "personal-treinos",
      label: "Planos de Treino",
      href: `/consultoria/${consultancySlug}/personal/treinos`,
      iconName: "prescriptions",
    });
    items.push({
      id: "personal-exercicios",
      label: "Exercícios",
      href: `/consultoria/${consultancySlug}/personal/exercicios`,
      iconName: "exercises",
    });
    items.push({
      id: "personal-progresso",
      label: "Evolução dos Alunos",
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      iconName: "prescriptions",
    });
  }

  if (roles.includes("NUTRITIONIST")) {
    items.push({
      id: "nutritionist-planos",
      label: "Planos Alimentares",
      href: `/consultoria/${consultancySlug}/nutricao/planos`,
      iconName: "prescriptions",
    });
    items.push({
      id: "nutritionist-alimentos",
      label: "Alimentos",
      href: `/consultoria/${consultancySlug}/nutricao/alimentos`,
      iconName: "nutrition",
    });
    items.push({
      id: "nutritionist-progresso",
      label: "Evolução dos Alunos",
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      iconName: "prescriptions",
    });
  }

  if (roles.includes("CONSULTANCY_ADMIN")) {
    items.push({
      id: "admin-membros",
      label: "Membros",
      href: `/consultoria/${consultancySlug}/membros`,
      iconName: "members",
    });
    items.push({
      id: "admin-financeiro",
      label: "Financeiro",
      href: `/consultoria/${consultancySlug}/financeiro`,
      iconName: "prescriptions",
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
        userName={userName}
        userEmail={userEmail}
        roleLabels={roleLabels}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8 ${maxWidthClass} ${className}`.trim()}
      >
        {children}
      </main>
    </div>
  );
}
