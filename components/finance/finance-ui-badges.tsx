import React from "react";
import {
  STATUS_LABELS,
  type StudentChargeDerivedStatus,
  type ReceiptStatus,
} from "@/lib/consultancies/finance";

// --- Finance Charge Status Badge ---

export const FINANCE_STATUS_DISPLAY_LABELS: Record<StudentChargeDerivedStatus, string> = {
  PAID: "Paga",
  PENDING: "Pendente",
  OVERDUE: "Vencida",
  UNDER_REVIEW: "Em análise",
  CANCELED: "Cancelada",
};

export interface FinanceStatusBadgeProps {
  status: StudentChargeDerivedStatus;
  size?: "sm" | "md";
  className?: string;
}

const FINANCE_STATUS_STYLES: Record<StudentChargeDerivedStatus, { container: string; iconClass: string }> = {
  PAID: {
    container: "bg-[#E2F5EC] text-[#102E23] border-[#B8E6D0]",
    iconClass: "text-[#176B49]",
  },
  PENDING: {
    container: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    iconClass: "text-[#B45309]",
  },
  OVERDUE: {
    container: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    iconClass: "text-[#DC2626]",
  },
  UNDER_REVIEW: {
    container: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
    iconClass: "text-[#2563EB]",
  },
  CANCELED: {
    container: "bg-[#F4F4F0] text-[#526058] border-[#DEE2DA]",
    iconClass: "text-[#526058]/70",
  },
};

export function FinanceStatusBadge({
  status,
  size = "md",
  className = "",
}: FinanceStatusBadgeProps) {
  const style = FINANCE_STATUS_STYLES[status] || FINANCE_STATUS_STYLES.CANCELED;
  const label = FINANCE_STATUS_DISPLAY_LABELS[status] || STATUS_LABELS[status] || status;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-2.5 py-0.5 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-tight select-none shadow-2xs ${style.container} ${sizeClasses} ${className}`.trim()}
    >
      {status === "PAID" && (
        <svg className={`w-3 h-3 shrink-0 ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {status === "OVERDUE" && (
        <svg className={`w-3 h-3 shrink-0 ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      )}
      {status === "UNDER_REVIEW" && (
        <svg className={`w-3 h-3 shrink-0 animate-pulse ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {status === "PENDING" && (
        <svg className={`w-3 h-3 shrink-0 ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {status === "CANCELED" && (
        <svg className={`w-3 h-3 shrink-0 ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )}
      <span>{label}</span>
    </span>
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

const RECEIPT_STATUS_STYLES: Record<ReceiptStatus, { container: string; iconClass: string }> = {
  APPROVED: {
    container: "bg-[#E2F5EC] text-[#102E23] border-[#B8E6D0]",
    iconClass: "text-[#176B49]",
  },
  SUBMITTED: {
    container: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
    iconClass: "text-[#2563EB]",
  },
  REJECTED: {
    container: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    iconClass: "text-[#DC2626]",
  },
};

export function ReceiptStatusBadge({
  status,
  size = "md",
  className = "",
}: ReceiptStatusBadgeProps) {
  const style = RECEIPT_STATUS_STYLES[status] || RECEIPT_STATUS_STYLES.SUBMITTED;
  const label = RECEIPT_STATUS_LABELS[status] || status;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-2.5 py-0.5 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-tight select-none shadow-2xs ${style.container} ${sizeClasses} ${className}`.trim()}
    >
      {status === "APPROVED" && (
        <svg className={`w-3 h-3 shrink-0 ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {status === "REJECTED" && (
        <svg className={`w-3 h-3 shrink-0 ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {status === "SUBMITTED" && (
        <svg className={`w-3 h-3 shrink-0 animate-pulse ${style.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span>{label}</span>
    </span>
  );
}
