import React from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  type StudentChargeDerivedStatus,
  type ReceiptStatus,
} from "@/lib/consultancies/finance";

// --- Finance Charge Status Badge ---

export interface FinanceStatusBadgeProps {
  status: StudentChargeDerivedStatus;
  size?: "sm" | "md";
  className?: string;
}

function getFinanceStatusBadgeVariant(status: StudentChargeDerivedStatus): BadgeVariant {
  switch (status) {
    case "PAID":
      return "success";
    case "OVERDUE":
      return "danger";
    case "UNDER_REVIEW":
      return "warning";
    case "PENDING":
      return "neutral";
    case "CANCELED":
      return "neutral";
    default:
      return "neutral";
  }
}

export function FinanceStatusBadge({
  status,
  size = "md",
  className = "",
}: FinanceStatusBadgeProps) {
  const variant = getFinanceStatusBadgeVariant(status);
  const label = STATUS_LABELS[status] || status;

  return (
    <Badge variant={variant} size={size} className={className}>
      {status === "PAID" && (
        <svg className="w-3 h-3 mr-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {status === "OVERDUE" && (
        <svg className="w-3 h-3 mr-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      )}
      {status === "UNDER_REVIEW" && (
        <svg className="w-3 h-3 mr-1 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {status === "PENDING" && (
        <svg className="w-3 h-3 mr-1 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {status === "CANCELED" && (
        <svg className="w-3 h-3 mr-1 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )}
      <span>{label}</span>
    </Badge>
  );
}

// --- Receipt Status Badge ---

export interface ReceiptStatusBadgeProps {
  status: ReceiptStatus;
  size?: "sm" | "md";
  className?: string;
}

const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  SUBMITTED: "Aguardando análise",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

function getReceiptStatusBadgeVariant(status: ReceiptStatus): BadgeVariant {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "SUBMITTED":
      return "warning";
    default:
      return "neutral";
  }
}

export function ReceiptStatusBadge({
  status,
  size = "md",
  className = "",
}: ReceiptStatusBadgeProps) {
  const variant = getReceiptStatusBadgeVariant(status);
  const label = RECEIPT_STATUS_LABELS[status] || status;

  return (
    <Badge variant={variant} size={size} className={className}>
      {status === "APPROVED" && (
        <svg className="w-3 h-3 mr-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {status === "REJECTED" && (
        <svg className="w-3 h-3 mr-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {status === "SUBMITTED" && (
        <svg className="w-3 h-3 mr-1 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span>{label}</span>
    </Badge>
  );
}
