import React from "react";
import { Badge } from "@/components/ui/badge";
import type { ConsultancyRole } from "@/lib/consultancies/context";

interface DashboardContextProps {
  userName: string;
  consultancyName?: string;
  roles: ConsultancyRole[];
  subtitle?: string;
  activeMode?: string;
  hideRoleBadges?: boolean;
}

function getDefaultSubtitle(roles: ConsultancyRole[]): string {
  const safeRoles = Array.isArray(roles) ? roles : [];
  if (safeRoles.includes("PERSONAL") && safeRoles.includes("CONSULTANCY_ADMIN")) {
    return "Painel unificado de gestão da consultoria e prescrição de treinos.";
  }
  if (safeRoles.includes("NUTRITIONIST") && safeRoles.includes("CONSULTANCY_ADMIN")) {
    return "Painel unificado de gestão da consultoria e prescrição nutricional.";
  }
  if (safeRoles.includes("INFLUENCER") && safeRoles.includes("STUDENT")) {
    return "Seu espaço de saúde, treino e evolução com benefícios VIP.";
  }
  if (safeRoles.includes("INFLUENCER")) {
    return "Bem-vindo ao seu painel de influenciador. Acompanhe suas missões, resultados e comissões.";
  }
  if (safeRoles.includes("CONSULTANCY_ADMIN")) {
    return "Gestão da consultoria, equipe e operação.";
  }
  if (safeRoles.includes("PERSONAL")) {
    return "Acompanhe alunos e organize suas prescrições de treino.";
  }
  if (safeRoles.includes("NUTRITIONIST")) {
    return "Acompanhe alunos e organize suas prescrições alimentares.";
  }
  return "Seu espaço de saúde, treino e evolução";
}

export function DashboardContext({
  userName,
  roles,
  subtitle,
  hideRoleBadges = false,
}: DashboardContextProps) {
  const safeRoles = Array.isArray(roles) ? roles : [];
  const firstName = userName ? userName.trim().split(" ")[0] : "";
  const displaySubtitle = subtitle || getDefaultSubtitle(safeRoles);

  const isInfluencer = safeRoles.includes("INFLUENCER");
  const isStudent = safeRoles.includes("STUDENT");
  const isPersonal = safeRoles.includes("PERSONAL");
  const isNutritionist = safeRoles.includes("NUTRITIONIST");
  const isAdmin = safeRoles.includes("CONSULTANCY_ADMIN");

  return (
    <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
          {firstName ? `Olá, ${firstName}` : "Olá!"}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {displaySubtitle}
        </p>
      </div>
      {!hideRoleBadges && (
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* STUDENT FIRST: Aluno é o papel prioritário */}
          {isStudent && (
            <Badge variant="brand" size="sm">
              Aluno
            </Badge>
          )}
          {isPersonal && (
            <Badge variant={isStudent ? "neutral" : "brand"} size="sm">
              Personal Trainer
            </Badge>
          )}
          {isNutritionist && (
            <Badge variant={isStudent ? "neutral" : "brand"} size="sm">
              Nutricionista
            </Badge>
          )}
          {isAdmin && (
            <Badge variant={isStudent ? "neutral" : "brand"} size="sm">
              Administrador da consultoria
            </Badge>
          )}
          {isInfluencer && (
            <>
              <Badge variant={isStudent ? "neutral" : "brand"} size="sm">
                Influenciador
              </Badge>
              <Badge variant={isStudent ? "neutral" : "brand"} size="sm">
                VIP
              </Badge>
            </>
          )}
        </div>
      )}
    </div>
  );
}
