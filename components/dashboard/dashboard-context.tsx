import React from "react";
import { Badge } from "@/components/ui/badge";
import type { ConsultancyRole } from "@/lib/consultancies/context";

interface DashboardContextProps {
  userName: string;
  consultancyName?: string;
  roles: ConsultancyRole[];
  subtitle?: string;
  activeMode?: string;
}

function getDefaultSubtitle(roles: ConsultancyRole[]): string {
  if (roles.includes("PERSONAL") && roles.includes("CONSULTANCY_ADMIN")) {
    return "Painel unificado de gestão da consultoria e prescrição de treinos.";
  }
  if (roles.includes("NUTRITIONIST") && roles.includes("CONSULTANCY_ADMIN")) {
    return "Painel unificado de gestão da consultoria e prescrição nutricional.";
  }
  if (roles.includes("INFLUENCER") && roles.includes("STUDENT")) {
    return "Painel unificado de parceria VIP e acompanhamento de treinos.";
  }
  if (roles.includes("INFLUENCER")) {
    return "Bem-vindo ao seu painel de influenciador. Acompanhe suas missões, resultados e comissões.";
  }
  if (roles.includes("CONSULTANCY_ADMIN")) {
    return "Gestão da consultoria, equipe e operação.";
  }
  if (roles.includes("PERSONAL")) {
    return "Acompanhe alunos e organize suas prescrições de treino.";
  }
  if (roles.includes("NUTRITIONIST")) {
    return "Acompanhe alunos e organize suas prescrições alimentares.";
  }
  return "Seu espaço de saúde, treino e evolução";
}

export function DashboardContext({
  userName,
  roles,
  subtitle,
}: DashboardContextProps) {
  const firstName = userName ? userName.trim().split(" ")[0] : "";
  const displaySubtitle = subtitle || getDefaultSubtitle(roles);

  const isInfluencer = roles.includes("INFLUENCER");
  const isStudent = roles.includes("STUDENT");
  const isPersonal = roles.includes("PERSONAL");
  const isNutritionist = roles.includes("NUTRITIONIST");
  const isAdmin = roles.includes("CONSULTANCY_ADMIN");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-heading">
          {firstName ? `Olá, ${firstName}` : "Olá!"}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
          {displaySubtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {isPersonal && (
          <Badge variant="brand" size="sm">
            Personal Trainer
          </Badge>
        )}
        {isNutritionist && (
          <Badge variant="brand" size="sm">
            Nutricionista
          </Badge>
        )}
        {isAdmin && (
          <Badge variant="brand" size="sm">
            Administrador da consultoria
          </Badge>
        )}
        {isInfluencer && (
          <>
            <Badge variant="brand" size="sm">
              Influenciador
            </Badge>
            <Badge variant="brand" size="sm">
              VIP
            </Badge>
          </>
        )}
        {isStudent && (
          <Badge variant="neutral" size="sm">
            Aluno
          </Badge>
        )}
      </div>
    </div>
  );
}
