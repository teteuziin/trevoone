import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type ConsultancyRole } from "@/lib/consultancies/context";

interface DashboardContextProps {
  userName: string;
  consultancyName: string;
  roles: ConsultancyRole[];
  subtitle?: string;
}

export function DashboardContext({
  userName,
  consultancyName,
  roles,
  subtitle,
}: DashboardContextProps) {
  const firstName = userName ? userName.split(" ")[0] : "";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
      <div className="space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {firstName ? `Olá, ${firstName}` : "Visão geral"}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {subtitle || `${consultancyName} • Seu espaço integrado`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {roles.map((role) => (
          <Badge key={role} variant="brand" size="sm">
            {ROLE_LABELS[role] || role}
          </Badge>
        ))}
      </div>
    </div>
  );
}
