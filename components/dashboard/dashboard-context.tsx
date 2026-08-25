import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type ConsultancyRole } from "@/lib/consultancies/context";

interface DashboardContextProps {
  userName: string;
  consultancyName?: string;
  roles: ConsultancyRole[];
  subtitle?: string;
}

function getDefaultSubtitle(roles: ConsultancyRole[]): string {
  if (roles.includes("PERSONAL")) {
    return "Acompanhe alunos e organize suas prescrições de treino.";
  }
  if (roles.includes("NUTRITIONIST")) {
    return "Acompanhe alunos e organize suas prescrições alimentares.";
  }
  if (roles.includes("INFLUENCER")) {
    return "Acompanhe suas missões e mantenha sua rotina em dia.";
  }
  if (roles.includes("CONSULTANCY_ADMIN")) {
    return "Gestão da consultoria, equipe e operação.";
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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {firstName ? `Olá, ${firstName}` : "Visão geral"}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
          {displaySubtitle}
        </p>
      </div>

      {roles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {roles.map((role) => (
            <Badge key={role} variant="brand" size="sm">
              {ROLE_LABELS[role] || role}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
