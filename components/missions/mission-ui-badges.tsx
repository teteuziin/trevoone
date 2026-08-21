import React from "react";
import { Badge, type BadgeSize } from "@/components/ui/badge";
import type {
  MissionPriority,
  MissionStatus,
} from "@/lib/consultancies/missions";

export interface MissionStatusBadgeProps {
  status: MissionStatus;
  size?: BadgeSize;
  className?: string;
}

export function MissionStatusBadge({
  status,
  size = "sm",
  className = "",
}: MissionStatusBadgeProps) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="warning" size={size} dot className={className}>
          Pendente
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="info" size={size} dot className={className}>
          Em andamento
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge variant="brand" size={size} dot className={className}>
          Aguardando revisão
        </Badge>
      );
    case "REVISION_REQUESTED":
      return (
        <Badge variant="danger" size={size} dot className={className}>
          Revisão solicitada
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge variant="success" size={size} dot className={className}>
          Aprovada
        </Badge>
      );
    case "CANCELED":
      return (
        <Badge variant="neutral" size={size} dot className={className}>
          Cancelada
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size={size} className={className}>
          {status}
        </Badge>
      );
  }
}

export interface MissionPriorityBadgeProps {
  priority: MissionPriority;
  size?: BadgeSize;
  fullLabel?: boolean;
  className?: string;
}

export function MissionPriorityBadge({
  priority,
  size = "sm",
  fullLabel = false,
  className = "",
}: MissionPriorityBadgeProps) {
  switch (priority) {
    case "HIGH":
      return (
        <Badge
          variant="danger"
          size={size}
          className={`font-semibold ${className}`.trim()}
        >
          {fullLabel ? "Prioridade Alta" : "Alta"}
        </Badge>
      );
    case "NORMAL":
      return (
        <Badge
          variant="neutral"
          size={size}
          className={className}
        >
          {fullLabel ? "Prioridade Normal" : "Normal"}
        </Badge>
      );
    case "LOW":
      return (
        <Badge
          variant="neutral"
          size={size}
          className={`opacity-75 ${className}`.trim()}
        >
          {fullLabel ? "Prioridade Baixa" : "Baixa"}
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size={size} className={className}>
          {priority}
        </Badge>
      );
  }
}

export interface MissionStatusGroupProps {
  status: MissionStatus;
  isLate?: boolean;
  size?: BadgeSize;
  className?: string;
}

export function MissionStatusGroup({
  status,
  isLate = false,
  size = "sm",
  className = "",
}: MissionStatusGroupProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`.trim()}>
      <MissionStatusBadge status={status} size={size} />
      {isLate && (
        <Badge variant="danger" size={size} className="font-semibold">
          Atrasada
        </Badge>
      )}
    </div>
  );
}
