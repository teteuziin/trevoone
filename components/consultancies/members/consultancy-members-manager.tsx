"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import type {
  ConsultancyMemberItem,
  ConsultancyMembersOperationalCounters,
} from "@/lib/consultancies/admin";
import type { ConsultancyInvitationItem } from "@/lib/consultancies/invitations";
import type { ConsultancyRole } from "@/lib/consultancies/context";

const ADMIN_ROLE_LABELS: Record<string, string> = {
  STUDENT: "Aluno",
  PERSONAL: "Personal",
  NUTRITIONIST: "Nutricionista",
  CONSULTANCY_ADMIN: "Administrador",
  INFLUENCER: "Influenciador / VIP",
};

const INVITATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceito",
  EXPIRED: "Expirado",
  REVOKED: "Revogado",
};
import {
  createInvitationAction,
  revokeInvitationAction,
  resendInvitationAction,
  updateMemberRolesAction,
  toggleMemberStatusAction,
  deactivateMemberAction,
} from "@/app/consultoria/[slug]/membros/actions";
import { UserAvatar } from "@/components/account/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export interface ConsultancyMembersManagerProps {
  slug: string;
  consultancyName: string;
  currentUserId: number;
  currentMembershipPublicId: string;
  initialMembers: ConsultancyMemberItem[];
  initialInvitations: ConsultancyInvitationItem[];
  counters: ConsultancyMembersOperationalCounters;
  initialQuery?: string;
}

type TabType = "members" | "invitations";
type MemberStatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";
type MemberRoleFilter = "ALL" | ConsultancyRole;
type InvitationStatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

const PAGE_SIZE = 15;

function formatDateTime(date: unknown): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(String(date));
  if (isNaN(d.getTime())) return "—";
  const day = d.getUTCDate().toString().padStart(2, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export function ConsultancyMembersManager({
  slug,
  currentMembershipPublicId,
  initialMembers,
  initialInvitations,
  counters: initialCounters,
  initialQuery = "",
}: ConsultancyMembersManagerProps) {
  // Tabs & Navigation State
  const [activeTab, setActiveTab] = useState<TabType>("members");
  const [counters, setCounters] = useState<ConsultancyMembersOperationalCounters>(initialCounters);

  // Members list & filter states
  const [members, setMembers] = useState<ConsultancyMemberItem[]>(initialMembers);
  const [memberSearch, setMemberSearch] = useState<string>(initialQuery);
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState<string>(initialQuery);
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>("ALL");
  const [memberRoleFilter, setMemberRoleFilter] = useState<MemberRoleFilter>("ALL");
  const [memberPage, setMemberPage] = useState<number>(1);

  // Invitations list & filter states
  const [invitations, setInvitations] = useState<ConsultancyInvitationItem[]>(initialInvitations);
  const [inviteSearch, setInviteSearch] = useState<string>("");
  const [debouncedInviteSearch, setDebouncedInviteSearch] = useState<string>("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<InvitationStatusFilter>("ALL");
  const [invitePage, setInvitePage] = useState<number>(1);

  // Modals & Action Sheet States
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState<boolean>(false);
  const [editingRolesMember, setEditingRolesMember] = useState<ConsultancyMemberItem | null>(null);
  const [confirmSuspendMember, setConfirmSuspendMember] = useState<ConsultancyMemberItem | null>(null);
  const [confirmReactivateMember, setConfirmReactivateMember] = useState<ConsultancyMemberItem | null>(null);
  const [confirmDeactivateMember, setConfirmDeactivateMember] = useState<ConsultancyMemberItem | null>(null);
  const [confirmRevokeInvite, setConfirmRevokeInvite] = useState<ConsultancyInvitationItem | null>(null);

  // Row contextual dropdown menu open tracking
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [openInviteMenuId, setOpenInviteMenuId] = useState<string | null>(null);

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Show Toast Helper
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Click outside to close menus
  useEffect(() => {
    function handleGlobalClick() {
      setOpenMemberMenuId(null);
      setOpenInviteMenuId(null);
    }
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Debounce member search (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
      setMemberPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // Debounce invite search (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInviteSearch(inviteSearch);
      setInvitePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteSearch]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // 1. Text Search (name or email)
      if (debouncedMemberSearch.trim().length > 0) {
        const query = debouncedMemberSearch.toLowerCase().trim();
        const matchesName = member.fullName.toLowerCase().includes(query);
        const matchesEmail = member.email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // 2. Status Filter
      if (memberStatusFilter !== "ALL") {
        if (member.status !== memberStatusFilter) return false;
      }

      // 3. Role Filter
      if (memberRoleFilter !== "ALL") {
        if (!member.roles.includes(memberRoleFilter)) return false;
      }

      return true;
    });
  }, [members, debouncedMemberSearch, memberStatusFilter, memberRoleFilter]);

  // Paginated Members
  const paginatedMembers = useMemo(() => {
    const start = (memberPage - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, memberPage]);

  const totalMemberPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));

  // Filtered Invitations
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      // 1. Text Search (email)
      if (debouncedInviteSearch.trim().length > 0) {
        const query = debouncedInviteSearch.toLowerCase().trim();
        if (!inv.email.toLowerCase().includes(query)) return false;
      }

      // 2. Status Filter
      if (inviteStatusFilter !== "ALL") {
        if (inv.status !== inviteStatusFilter) return false;
      }

      return true;
    });
  }, [invitations, debouncedInviteSearch, inviteStatusFilter]);

  // Paginated Invitations
  const paginatedInvitations = useMemo(() => {
    const start = (invitePage - 1) * PAGE_SIZE;
    return filteredInvitations.slice(start, start + PAGE_SIZE);
  }, [filteredInvitations, invitePage]);

  const totalInvitePages = Math.max(1, Math.ceil(filteredInvitations.length / PAGE_SIZE));

  // Handlers for Member Actions
  const handleToggleMemberStatus = (member: ConsultancyMemberItem, targetStatus: "ACTIVE" | "SUSPENDED") => {
    startTransition(async () => {
      try {
        const res = await toggleMemberStatusAction(slug, member.membershipPublicId, targetStatus);
        if (!res.success) {
          showToast(res.error || "Não foi possível alterar o status do membro.", "error");
          return;
        }

        // Update local state
        setMembers((prev) =>
          prev.map((m) =>
            m.membershipPublicId === member.membershipPublicId
              ? {
                  ...m,
                  status: targetStatus,
                  statusLabel: targetStatus === "ACTIVE" ? "Ativo" : "Suspenso",
                }
              : m
          )
        );

        // Update counters
        setCounters((prev) => ({
          ...prev,
          activeMembers: targetStatus === "ACTIVE" ? prev.activeMembers + 1 : Math.max(0, prev.activeMembers - 1),
          suspendedMembers: targetStatus === "SUSPENDED" ? prev.suspendedMembers + 1 : Math.max(0, prev.suspendedMembers - 1),
        }));

        showToast(
          targetStatus === "ACTIVE" ? `${member.fullName} reativado com sucesso!` : `${member.fullName} foi suspenso.`,
          "success"
        );
      } catch {
        showToast("Erro inesperado ao atualizar o status.", "error");
      } finally {
        setConfirmSuspendMember(null);
        setConfirmReactivateMember(null);
      }
    });
  };

  const handleDeactivateMember = (member: ConsultancyMemberItem) => {
    startTransition(async () => {
      try {
        const res = await deactivateMemberAction(slug, member.membershipPublicId);
        if (!res.success) {
          showToast(res.error || "Não foi possível desligar o membro.", "error");
          return;
        }

        // Remove from local list
        setMembers((prev) => prev.filter((m) => m.membershipPublicId !== member.membershipPublicId));

        // Update counters
        setCounters((prev) => ({
          ...prev,
          activeMembers: member.status === "ACTIVE" ? Math.max(0, prev.activeMembers - 1) : prev.activeMembers,
          suspendedMembers: member.status === "SUSPENDED" ? Math.max(0, prev.suspendedMembers - 1) : prev.suspendedMembers,
        }));

        showToast(`${member.fullName} foi desligado da consultoria.`, "info");
      } catch {
        showToast("Erro inesperado ao desligar membro.", "error");
      } finally {
        setConfirmDeactivateMember(null);
      }
    });
  };

  // Handlers for Invitation Actions
  const handleResendInvitation = async (invitation: ConsultancyInvitationItem) => {
    startTransition(async () => {
      try {
        const res = await resendInvitationAction(slug, invitation.publicId);
        if (!res.success || !res.invitationPath) {
          showToast(res.error || "Não foi possível reenviar o convite.", "error");
          return;
        }

        const fullUrl = `${window.location.origin}${res.invitationPath}`;
        try {
          await navigator.clipboard.writeText(fullUrl);
          showToast("Novo link gerado (7 dias) e copiado para a área de transferência!", "success");
        } catch {
          showToast("Novo link de 7 dias gerado com sucesso!", "success");
        }

        // Update local invitation state: new expiresAt (+7 days), status PENDING
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.publicId === invitation.publicId
              ? {
                  ...inv,
                  expiresAt: newExpiresAt,
                  status: "PENDING",
                  statusLabel: INVITATION_STATUS_LABELS.PENDING,
                  revokedAt: null,
                }
              : inv
          )
        );

        if (invitation.status !== "PENDING") {
          setCounters((prev) => ({
            ...prev,
            pendingInvitations: prev.pendingInvitations + 1,
          }));
        }
      } catch {
        showToast("Erro inesperado ao reenviar convite.", "error");
      }
    });
  };

  const handleCopyExistingLinkOrRenew = async (invitation: ConsultancyInvitationItem) => {
    // If pending, renew & copy fresh link to ensure validity
    await handleResendInvitation(invitation);
  };

  const handleRevokeInvitation = (invitation: ConsultancyInvitationItem) => {
    startTransition(async () => {
      try {
        const res = await revokeInvitationAction(slug, invitation.publicId);
        if (!res.success) {
          showToast(res.error || "Não foi possível revogar o convite.", "error");
          return;
        }

        // Update local state
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.publicId === invitation.publicId
              ? {
                  ...inv,
                  status: "REVOKED",
                  statusLabel: INVITATION_STATUS_LABELS.REVOKED,
                  revokedAt: new Date(),
                }
              : inv
          )
        );

        setCounters((prev) => ({
          ...prev,
          pendingInvitations: Math.max(0, prev.pendingInvitations - 1),
        }));

        showToast("Convite cancelado com sucesso.", "info");
      } catch {
        showToast("Erro ao cancelar convite.", "error");
      } finally {
        setConfirmRevokeInvite(null);
      }
    });
  };

  return (
    <div className="w-full space-y-6 pb-28 sm:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-200 animate-in fade-in slide-in-from-top-2 max-w-sm flex items-center gap-2.5 ${
            toastMessage.type === "success"
              ? "bg-[var(--surface)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)] shadow-[var(--brand-soft)]"
              : toastMessage.type === "error"
              ? "bg-[var(--surface)] text-[var(--danger)] border-[var(--danger-soft-border)]"
              : "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-default)]"
          }`}
        >
          {toastMessage.type === "success" && (
            <svg className="w-4 h-4 shrink-0 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toastMessage.type === "error" && (
            <svg className="w-4 h-4 shrink-0 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. OPERATIONAL HEADER COMPACTO COM CONTADORES REAIS */}
      <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-2xl border border-[var(--border-default)] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href={`/consultoria/${slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1 min-h-[36px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar à visão geral</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Membros e Convites
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Gerencie os participantes, convites ativos e permissões de acesso da consultoria.
            </p>
          </div>

          {/* Primary Action Button -> Opens Drawer / Dialog */}
          <div className="shrink-0">
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsInviteDialogOpen(true)}
              className="w-full sm:w-auto h-11 px-5 font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Convidar membro</span>
            </Button>
          </div>
        </div>

        {/* Linha Operacional: Contadores Reais */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-4 border-t border-[var(--border-subtle)]">
          {/* Membros Ativos */}
          <div className="bg-[var(--surface-subtle)] p-3 sm:p-3.5 rounded-xl border border-[var(--border-subtle)] space-y-0.5">
            <p className="text-[11px] sm:text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Membros Ativos
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {counters.isError ? "—" : counters.activeMembers}
            </p>
          </div>

          {/* Convites Pendentes */}
          <div className="bg-[var(--surface-subtle)] p-3 sm:p-3.5 rounded-xl border border-[var(--border-subtle)] space-y-0.5">
            <p className="text-[11px] sm:text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Convites Pendentes
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-[var(--warning)] tracking-tight">
              {counters.isError ? "—" : counters.pendingInvitations}
            </p>
          </div>

          {/* Suspensos */}
          <div className="bg-[var(--surface-subtle)] p-3 sm:p-3.5 rounded-xl border border-[var(--border-subtle)] space-y-0.5">
            <p className="text-[11px] sm:text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Suspensos
            </p>
            <p className="text-lg sm:text-2xl font-extrabold text-[var(--text-secondary)] tracking-tight">
              {counters.isError ? "—" : counters.suspendedMembers}
            </p>
          </div>
        </div>

        {counters.isError && (
          <p className="text-xs text-[var(--danger)] font-medium pt-1">
            Contadores operacionais indisponíveis no momento.
          </p>
        )}
      </div>

      {/* 2. ORGANIZAÇÃO EM ABAS ("Membros" e "Convites") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)]">
          <div role="tablist" aria-orientation="horizontal" className="flex items-center gap-1 -mb-px">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "members"}
              onClick={() => setActiveTab("members")}
              className={`h-11 px-4 sm:px-5 font-semibold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer select-none min-h-[44px] ${
                activeTab === "members"
                  ? "border-[var(--brand)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
              }`}
            >
              <span>Membros</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "members"
                    ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)]"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {members.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "invitations"}
              onClick={() => setActiveTab("invitations")}
              className={`h-11 px-4 sm:px-5 font-semibold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer select-none min-h-[44px] ${
                activeTab === "invitations"
                  ? "border-[var(--brand)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
              }`}
            >
              <span>Convites</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "invitations"
                    ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)]"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {invitations.length}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: MEMBROS */}
        {/* ========================================================================= */}
        {activeTab === "members" && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            {/* Search & Filters Toolbar */}
            <div className="bg-[var(--surface)] p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] shadow-xs space-y-3">
              {/* Live Search Input with 300ms debounce */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar membros por nome ou e-mail..."
                  aria-label="Buscar membros por nome ou e-mail"
                  className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-colors min-h-[44px]"
                />
                {memberSearch.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMemberSearch("")}
                    aria-label="Limpar busca"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Chips: Status & Role */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                {/* Status Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                    Status:
                  </span>
                  {(
                    [
                      { id: "ALL", label: "Todos" },
                      { id: "ACTIVE", label: "Ativos" },
                      { id: "SUSPENDED", label: "Suspensos" },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setMemberStatusFilter(chip.id);
                        setMemberPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] cursor-pointer select-none ${
                        memberStatusFilter === chip.id
                          ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Role Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                    Função:
                  </span>
                  {(
                    [
                      { id: "ALL", label: "Todas" },
                      { id: "STUDENT", label: "Aluno" },
                      { id: "PERSONAL", label: "Personal" },
                      { id: "NUTRITIONIST", label: "Nutri" },
                      { id: "CONSULTANCY_ADMIN", label: "Admin" },
                      { id: "INFLUENCER", label: "VIP" },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setMemberRoleFilter(chip.id);
                        setMemberPage(1);
                      }}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] cursor-pointer select-none ${
                        memberRoleFilter === chip.id
                          ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Members List Table (Desktop) / Cards (Mobile) */}
            {filteredMembers.length === 0 ? (
              <EmptyState
                title={
                  debouncedMemberSearch || memberStatusFilter !== "ALL" || memberRoleFilter !== "ALL"
                    ? "Nenhum membro encontrado para estes filtros"
                    : "Nenhum membro cadastrado"
                }
                description={
                  debouncedMemberSearch || memberStatusFilter !== "ALL" || memberRoleFilter !== "ALL"
                    ? "Tente limpar os filtros ou ajustar o termo digitado na busca."
                    : "Esta consultoria ainda não possui participantes vinculados."
                }
              />
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden md:block bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] shadow-xs overflow-visible">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3.5 font-semibold">
                          Membro
                        </th>
                        <th scope="col" className="px-5 py-3.5 font-semibold">
                          Funções
                        </th>
                        <th scope="col" className="px-5 py-3.5 font-semibold">
                          Status
                        </th>
                        <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {paginatedMembers.map((member) => {
                        const isSelf = member.membershipPublicId === currentMembershipPublicId;
                        const isStudent = member.roles.includes("STUDENT");
                        const isMenuOpen = openMemberMenuId === member.membershipPublicId;

                        return (
                          <tr key={member.membershipPublicId} className="hover:bg-[var(--surface-hover)] transition-colors">
                            <td className="px-5 py-4 min-w-0">
                              <div className="flex items-center gap-3">
                                <UserAvatar fullName={member.fullName} userPublicId={member.userPublicId} size="sm" />
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-[var(--text-primary)] truncate text-sm">
                                      {member.fullName}
                                    </p>
                                    {isSelf && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                        Você
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--text-secondary)] truncate">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {member.roles.length > 0 ? (
                                  member.roles.map((role) => (
                                    <Badge key={role} variant="brand" size="sm">
                                      {ADMIN_ROLE_LABELS[role] || role}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-[var(--text-tertiary)] italic">
                                    Sem papéis
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  member.status === "ACTIVE"
                                    ? "success"
                                    : member.status === "SUSPENDED"
                                    ? "danger"
                                    : "warning"
                                }
                                size="sm"
                              >
                                {member.statusLabel}
                              </Badge>
                            </td>

                            {/* Menu ⋯ por linha */}
                            <td className="px-5 py-4 text-right whitespace-nowrap relative">
                              <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setOpenMemberMenuId(isMenuOpen ? null : member.membershipPublicId)}
                                  aria-label="Abrir menu de ações do membro"
                                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] active:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-default)] transition-colors cursor-pointer select-none"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="2" />
                                    <circle cx="19" cy="12" r="2" />
                                    <circle cx="5" cy="12" r="2" />
                                  </svg>
                                </button>

                                {isMenuOpen && (
                                  <div className="absolute right-5 mt-1 w-52 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl shadow-xl py-1.5 z-40 text-xs font-medium space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
                                    {/* Ver Onboarding / Perfil */}
                                    {isStudent && member.status === "ACTIVE" && (
                                      <Link
                                        href={`/consultoria/${slug}/membros/${member.membershipPublicId}/onboarding`}
                                        onClick={() => setOpenMemberMenuId(null)}
                                        className="flex items-center gap-2 px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px]"
                                      >
                                        <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        <span>Ver onboarding / perfil</span>
                                      </Link>
                                    )}

                                    {/* Editar Funções */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRolesMember(member);
                                        setOpenMemberMenuId(null);
                                      }}
                                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] cursor-pointer"
                                    >
                                      <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      <span>Editar funções</span>
                                    </button>

                                    {/* Suspender ou Reativar */}
                                    {!isSelf && (
                                      <>
                                        {member.status === "ACTIVE" ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setConfirmSuspendMember(member);
                                              setOpenMemberMenuId(null);
                                            }}
                                            className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--warning)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] cursor-pointer"
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                            <span>Suspender membro</span>
                                          </button>
                                        ) : member.status === "SUSPENDED" ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setConfirmReactivateMember(member);
                                              setOpenMemberMenuId(null);
                                            }}
                                            className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--brand)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] cursor-pointer"
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Reativar membro</span>
                                          </button>
                                        ) : null}

                                        <div className="border-t border-[var(--border-subtle)] my-1" />

                                        {/* Desligar da consultoria */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmDeactivateMember(member);
                                            setOpenMemberMenuId(null);
                                          }}
                                          className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors min-h-[36px] cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                          </svg>
                                          <span>Desligar da consultoria</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards (1-Coluna) */}
                <div className="md:hidden space-y-3">
                  {paginatedMembers.map((member) => {
                    const isSelf = member.membershipPublicId === currentMembershipPublicId;
                    const isStudent = member.roles.includes("STUDENT");
                    const isMenuOpen = openMemberMenuId === member.membershipPublicId;

                    return (
                      <div
                        key={member.membershipPublicId}
                        className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border-default)] shadow-xs space-y-3 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar fullName={member.fullName} userPublicId={member.userPublicId} size="sm" />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                  {member.fullName}
                                </p>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                    Você
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] truncate">
                                {member.email}
                              </p>
                            </div>
                          </div>

                          {/* Menu ⋯ trigger */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setOpenMemberMenuId(isMenuOpen ? null : member.membershipPublicId)}
                              aria-label="Abrir menu de ações do membro"
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="19" cy="12" r="2" />
                                <circle cx="5" cy="12" r="2" />
                              </svg>
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 mt-1 w-52 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl shadow-xl py-1.5 z-40 text-xs font-medium space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
                                {isStudent && member.status === "ACTIVE" && (
                                  <Link
                                    href={`/consultoria/${slug}/membros/${member.membershipPublicId}/onboarding`}
                                    onClick={() => setOpenMemberMenuId(null)}
                                    className="flex items-center gap-2 px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-hover)] min-h-[44px]"
                                  >
                                    <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span>Ver onboarding / perfil</span>
                                  </Link>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRolesMember(member);
                                    setOpenMemberMenuId(null);
                                  }}
                                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-hover)] min-h-[44px] cursor-pointer"
                                >
                                  <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span>Editar funções</span>
                                </button>

                                {!isSelf && (
                                  <>
                                    {member.status === "ACTIVE" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConfirmSuspendMember(member);
                                          setOpenMemberMenuId(null);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--warning)] hover:bg-[var(--surface-hover)] min-h-[44px] cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                        <span>Suspender membro</span>
                                      </button>
                                    ) : member.status === "SUSPENDED" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConfirmReactivateMember(member);
                                          setOpenMemberMenuId(null);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--brand)] hover:bg-[var(--surface-hover)] min-h-[44px] cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Reativar membro</span>
                                      </button>
                                    ) : null}

                                    <div className="border-t border-[var(--border-subtle)] my-1" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmDeactivateMember(member);
                                        setOpenMemberMenuId(null);
                                      }}
                                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--danger)] hover:bg-[var(--danger-soft)] min-h-[44px] cursor-pointer"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                      </svg>
                                      <span>Desligar da consultoria</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status + Roles */}
                        <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex flex-wrap gap-1.5">
                            {member.roles.map((role) => (
                              <Badge key={role} variant="brand" size="sm">
                                {ADMIN_ROLE_LABELS[role] || role}
                              </Badge>
                            ))}
                          </div>

                          <Badge
                            variant={
                              member.status === "ACTIVE"
                                ? "success"
                                : member.status === "SUSPENDED"
                                ? "danger"
                                : "warning"
                            }
                            size="sm"
                          >
                            {member.statusLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls (Membros) */}
                {totalMemberPages > 1 && (
                  <nav
                    aria-label="Paginação do diretório de membros"
                    className="bg-[var(--surface)] px-4 py-3 rounded-2xl border border-[var(--border-default)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"
                  >
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] text-center sm:text-left">
                      Página <span className="font-semibold text-[var(--text-primary)]">{memberPage}</span> de{" "}
                      <span className="font-semibold text-[var(--text-primary)]">{totalMemberPages}</span> ({filteredMembers.length} membros)
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={memberPage <= 1}
                        onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                        className="min-h-[44px] px-4 font-semibold text-xs"
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={memberPage >= totalMemberPages}
                        onClick={() => setMemberPage((p) => Math.min(totalMemberPages, p + 1))}
                        className="min-h-[44px] px-4 font-semibold text-xs"
                      >
                        Próxima
                      </Button>
                    </div>
                  </nav>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: CONVITES */}
        {/* ========================================================================= */}
        {activeTab === "invitations" && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            {/* Search & Filters Toolbar */}
            <div className="bg-[var(--surface)] p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] shadow-xs space-y-3">
              {/* Live Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="Buscar convites por e-mail..."
                  aria-label="Buscar convites por e-mail"
                  className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-colors min-h-[44px]"
                />
                {inviteSearch.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInviteSearch("")}
                    aria-label="Limpar busca"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                  Status:
                </span>
                {(
                  [
                    { id: "ALL", label: "Todos" },
                    { id: "PENDING", label: "Pendentes" },
                    { id: "ACCEPTED", label: "Aceitos" },
                    { id: "EXPIRED", label: "Expirados" },
                    { id: "REVOKED", label: "Revogados" },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setInviteStatusFilter(chip.id);
                      setInvitePage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] cursor-pointer select-none ${
                      inviteStatusFilter === chip.id
                        ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Invitations List Table (Desktop) / Cards (Mobile) */}
            {filteredInvitations.length === 0 ? (
              <EmptyState
                title={
                  debouncedInviteSearch || inviteStatusFilter !== "ALL"
                    ? "Nenhum convite encontrado para esta busca"
                    : "Nenhum convite registrado"
                }
                description={
                  debouncedInviteSearch || inviteStatusFilter !== "ALL"
                    ? "Tente alterar os filtros ou o e-mail digitado."
                    : "Clique em 'Convidar membro' acima para gerar seu primeiro convite."
                }
              />
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden md:block bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] shadow-xs overflow-visible">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3.5 font-semibold">
                          Convidado
                        </th>
                        <th scope="col" className="px-5 py-3.5 font-semibold">
                          Funções
                        </th>
                        <th scope="col" className="px-5 py-3.5 font-semibold">
                          Expiração
                        </th>
                        <th scope="col" className="px-5 py-3.5 font-semibold">
                          Status
                        </th>
                        <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {paginatedInvitations.map((inv) => {
                        const isMenuOpen = openInviteMenuId === inv.publicId;

                        return (
                          <tr key={inv.publicId} className="hover:bg-[var(--surface-hover)] transition-colors">
                            <td className="px-5 py-4 min-w-0">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-[var(--text-primary)] truncate text-sm">
                                  {inv.email}
                                </p>
                                <p className="text-[11px] text-[var(--text-tertiary)]">
                                  Criado em {formatDateTime(inv.createdAt)}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {inv.roles.map((role) => (
                                  <Badge key={role} variant="brand" size="sm">
                                    {ADMIN_ROLE_LABELS[role] || role}
                                  </Badge>
                                ))}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                              {formatDateTime(inv.expiresAt)}
                            </td>

                            <td className="px-5 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  inv.status === "PENDING"
                                    ? "warning"
                                    : inv.status === "ACCEPTED"
                                    ? "success"
                                    : "neutral"
                                }
                                size="sm"
                              >
                                {inv.statusLabel}
                              </Badge>
                            </td>

                            {/* Menu ⋯ por linha */}
                            <td className="px-5 py-4 text-right whitespace-nowrap relative">
                              <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setOpenInviteMenuId(isMenuOpen ? null : inv.publicId)}
                                  aria-label="Abrir menu de ações do convite"
                                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] active:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-default)] transition-colors cursor-pointer select-none"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="2" />
                                    <circle cx="19" cy="12" r="2" />
                                    <circle cx="5" cy="12" r="2" />
                                  </svg>
                                </button>

                                {isMenuOpen && (
                                  <div className="absolute right-5 mt-1 w-52 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl shadow-xl py-1.5 z-40 text-xs font-medium space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
                                    {inv.status === "PENDING" && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleCopyExistingLinkOrRenew(inv);
                                            setOpenInviteMenuId(null);
                                          }}
                                          className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] cursor-pointer"
                                        >
                                          <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                          <span>Copiar link do convite</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleResendInvitation(inv);
                                            setOpenInviteMenuId(null);
                                          }}
                                          className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--brand)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          <span>Reenviar convite (7 dias)</span>
                                        </button>

                                        <div className="border-t border-[var(--border-subtle)] my-1" />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmRevokeInvite(inv);
                                            setOpenInviteMenuId(null);
                                          }}
                                          className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors min-h-[36px] cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          <span>Cancelar convite</span>
                                        </button>
                                      </>
                                    )}

                                    {inv.status === "EXPIRED" && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleResendInvitation(inv);
                                          setOpenInviteMenuId(null);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--brand)] hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Reativar / Reenviar</span>
                                      </button>
                                    )}

                                    {(inv.status === "ACCEPTED" || inv.status === "REVOKED") && (
                                      <div className="px-3.5 py-2 text-xs text-[var(--text-tertiary)] italic">
                                        Nenhuma ação pendente
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards (1-Coluna) */}
                <div className="md:hidden space-y-3">
                  {paginatedInvitations.map((inv) => {
                    const isMenuOpen = openInviteMenuId === inv.publicId;

                    return (
                      <div
                        key={inv.publicId}
                        className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border-default)] shadow-xs space-y-3 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {inv.email}
                            </p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              Criado em {formatDateTime(inv.createdAt)}
                            </p>
                          </div>

                          <div className="relative shrink-0 flex items-center gap-2">
                            <Badge
                              variant={
                                inv.status === "PENDING"
                                  ? "warning"
                                  : inv.status === "ACCEPTED"
                                  ? "success"
                                  : "neutral"
                              }
                              size="sm"
                            >
                              {inv.statusLabel}
                            </Badge>

                            <button
                              type="button"
                              onClick={() => setOpenInviteMenuId(isMenuOpen ? null : inv.publicId)}
                              aria-label="Abrir menu de ações do convite"
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="19" cy="12" r="2" />
                                <circle cx="5" cy="12" r="2" />
                              </svg>
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-11 w-52 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl shadow-xl py-1.5 z-40 text-xs font-medium space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
                                {inv.status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleCopyExistingLinkOrRenew(inv);
                                        setOpenInviteMenuId(null);
                                      }}
                                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-hover)] min-h-[44px] cursor-pointer"
                                    >
                                      <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      <span>Copiar link</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleResendInvitation(inv);
                                        setOpenInviteMenuId(null);
                                      }}
                                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--brand)] hover:bg-[var(--surface-hover)] min-h-[44px] cursor-pointer"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      <span>Reenviar convite (7 dias)</span>
                                    </button>

                                    <div className="border-t border-[var(--border-subtle)] my-1" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmRevokeInvite(inv);
                                        setOpenInviteMenuId(null);
                                      }}
                                      className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--danger)] hover:bg-[var(--danger-soft)] min-h-[44px] cursor-pointer"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      <span>Cancelar convite</span>
                                    </button>
                                  </>
                                )}

                                {inv.status === "EXPIRED" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleResendInvitation(inv);
                                      setOpenInviteMenuId(null);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-[var(--brand)] hover:bg-[var(--surface-hover)] min-h-[44px] cursor-pointer"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Reativar / Reenviar</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {inv.roles.map((role) => (
                            <Badge key={role} variant="brand" size="sm">
                              {ADMIN_ROLE_LABELS[role] || role}
                            </Badge>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                          <span>Expira em: {formatDateTime(inv.expiresAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls (Convites) */}
                {totalInvitePages > 1 && (
                  <nav
                    aria-label="Paginação de convites"
                    className="bg-[var(--surface)] px-4 py-3 rounded-2xl border border-[var(--border-default)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"
                  >
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] text-center sm:text-left">
                      Página <span className="font-semibold text-[var(--text-primary)]">{invitePage}</span> de{" "}
                      <span className="font-semibold text-[var(--text-primary)]">{totalInvitePages}</span> ({filteredInvitations.length} convites)
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={invitePage <= 1}
                        onClick={() => setInvitePage((p) => Math.max(1, p - 1))}
                        className="min-h-[44px] px-4 font-semibold text-xs"
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={invitePage >= totalInvitePages}
                        onClick={() => setInvitePage((p) => Math.min(totalInvitePages, p + 1))}
                        className="min-h-[44px] px-4 font-semibold text-xs"
                      >
                        Próxima
                      </Button>
                    </div>
                  </nav>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CONVIDAR MEMBRO (Dialog no Desktop / Bottom Sheet no Mobile) */}
      {/* ========================================================================= */}
      {isInviteDialogOpen && (
        <InviteMemberModal
          slug={slug}
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
          onSuccess={(newInvite) => {
            setInvitations((prev) => [newInvite, ...prev]);
            setCounters((prev) => ({
              ...prev,
              pendingInvitations: prev.pendingInvitations + 1,
              totalInvitations: prev.totalInvitations + 1,
            }));
            setActiveTab("invitations");
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR FUNÇÕES DO MEMBRO */}
      {/* ========================================================================= */}
      {editingRolesMember && (
        <EditMemberRolesModal
          slug={slug}
          member={editingRolesMember}
          onClose={() => setEditingRolesMember(null)}
          onSuccess={(newRoles) => {
            setMembers((prev) =>
              prev.map((m) =>
                m.membershipPublicId === editingRolesMember.membershipPublicId
                  ? { ...m, roles: newRoles }
                  : m
              )
            );
            showToast(`Funções de ${editingRolesMember.fullName} atualizadas com sucesso!`, "success");
            setEditingRolesMember(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMAR SUSPENDER MEMBRO */}
      {/* ========================================================================= */}
      {confirmSuspendMember && (
        <ConfirmationDialog
          title="Suspender membro?"
          description={`Tem certeza que deseja suspender o acesso de ${confirmSuspendMember.fullName}? O usuário não poderá acessar os painéis da consultoria enquanto estiver suspenso.`}
          confirmLabel="Suspender membro"
          confirmVariant="warning"
          isPending={isPending}
          onClose={() => setConfirmSuspendMember(null)}
          onConfirm={() => handleToggleMemberStatus(confirmSuspendMember, "SUSPENDED")}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRMAR REATIVAR MEMBRO */}
      {/* ========================================================================= */}
      {confirmReactivateMember && (
        <ConfirmationDialog
          title="Reativar membro?"
          description={`Deseja reativar o acesso de ${confirmReactivateMember.fullName}? O usuário voltará a ter acesso normal à consultoria de acordo com suas funções.`}
          confirmLabel="Reativar membro"
          confirmVariant="primary"
          isPending={isPending}
          onClose={() => setConfirmReactivateMember(null)}
          onConfirm={() => handleToggleMemberStatus(confirmReactivateMember, "ACTIVE")}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONFIRMAR DESLIGAR MEMBRO */}
      {/* ========================================================================= */}
      {confirmDeactivateMember && (
        <ConfirmationDialog
          title="Desligar membro da consultoria?"
          description={`Esta ação desvinculará ${confirmDeactivateMember.fullName} permanentemente desta consultoria. Planilhas, treinos e histórico associados serão preservados, mas o membro perderá todo o acesso.`}
          confirmLabel="Desligar membro"
          confirmVariant="danger"
          isPending={isPending}
          onClose={() => setConfirmDeactivateMember(null)}
          onConfirm={() => handleDeactivateMember(confirmDeactivateMember)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRMAR CANCELAR CONVITE */}
      {/* ========================================================================= */}
      {confirmRevokeInvite && (
        <ConfirmationDialog
          title="Cancelar convite?"
          description={`Tem certeza que deseja revogar o convite para ${confirmRevokeInvite.email}? O link se tornará imediatamente inválido.`}
          confirmLabel="Cancelar convite"
          confirmVariant="danger"
          isPending={isPending}
          onClose={() => setConfirmRevokeInvite(null)}
          onConfirm={() => handleRevokeInvitation(confirmRevokeInvite)}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL: CONVIDAR MEMBRO (Dialog / Bottom Sheet)
// ============================================================================
function InviteMemberModal({
  slug,
  isOpen,
  onClose,
  onSuccess,
}: {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvite: ConsultancyInvitationItem) => void;
}) {
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<ConsultancyRole[]>(["STUDENT"]);
  const [error, setError] = useState<string | null>(null);
  const [generatedPath, setGeneratedPath] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleRole = (role: ConsultancyRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCopy = async () => {
    if (!generatedPath) return;
    const fullUrl = `${window.location.origin}${generatedPath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (selectedRoles.length === 0) {
      setError("Selecione pelo menos uma função.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", trimmedEmail);
        for (const role of selectedRoles) {
          formData.append("roles", role);
        }

        const res = await createInvitationAction(slug, { success: false }, formData);
        if (!res.success || !res.invitationPath) {
          setError(res.error || "Não foi possível criar o convite.");
          return;
        }

        setGeneratedPath(res.invitationPath);

        // Notify parent
        onSuccess({
          publicId: crypto.randomUUID(),
          email: trimmedEmail,
          roles: selectedRoles,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          acceptedAt: null,
          revokedAt: null,
          status: "PENDING",
          statusLabel: INVITATION_STATUS_LABELS.PENDING,
        });
      } catch {
        setError("Erro ao gerar convite. Tente novamente.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[var(--surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="invite-modal-title" className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Convidar novo membro
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Gere um link seguro com validade de 7 dias para convidar uma nova pessoa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] shrink-0 cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-soft-border)] text-xs text-[var(--danger)] font-medium">
            {error}
          </div>
        )}

        {generatedPath ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--brand-foreground)]">
                Convite gerado com sucesso!
              </span>
              <Badge variant="brand" size="sm">
                Válido por 7 dias
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Envie o link abaixo diretamente para a pessoa convidada:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}${generatedPath}`}
                className="flex-1 min-h-[44px] h-11 px-3 text-xs bg-[var(--surface)] border border-[var(--brand-soft-border)] rounded-xl text-[var(--text-primary)] font-mono select-all focus:outline-none"
              />
              <Button
                type="button"
                variant="primary"
                onClick={handleCopy}
                className="shrink-0 min-h-[44px] font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                {isCopied ? "Copiado!" : "Copiar link"}
              </Button>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose} className="min-h-[44px] text-xs font-semibold">
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="invite_email" className="block text-xs font-semibold text-[var(--text-secondary)]">
                E-mail do convidado <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="invite_email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pessoa@exemplo.com"
                className="w-full h-11 px-3.5 text-xs sm:text-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-colors min-h-[44px]"
              />
            </div>

            {/* Funções como Pills / Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Funções na consultoria <span className="text-[var(--danger)]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "STUDENT", label: "Aluno" },
                    { id: "PERSONAL", label: "Personal" },
                    { id: "NUTRITIONIST", label: "Nutricionista" },
                    { id: "CONSULTANCY_ADMIN", label: "Administrador" },
                    { id: "INFLUENCER", label: "Influenciador / VIP" },
                  ] as const
                ).map((role) => {
                  const isChecked = selectedRoles.includes(role.id as ConsultancyRole);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id as ConsultancyRole)}
                      className={`p-3 rounded-xl border text-left font-medium text-xs transition-all flex items-center justify-between min-h-[44px] cursor-pointer select-none ${
                        isChecked
                          ? "bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-foreground)] font-semibold"
                          : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <span>{role.label}</span>
                      {isChecked && (
                        <svg className="w-4 h-4 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={onClose}
                className="min-h-[44px] text-xs font-semibold px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="min-h-[44px] text-xs font-semibold px-5"
              >
                {isPending ? "Criando convite..." : "Criar convite"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: EDITAR FUNÇÕES DO MEMBRO
// ============================================================================
function EditMemberRolesModal({
  slug,
  member,
  onClose,
  onSuccess,
}: {
  slug: string;
  member: ConsultancyMemberItem;
  onClose: () => void;
  onSuccess: (newRoles: ConsultancyRole[]) => void;
}) {
  const [selectedRoles, setSelectedRoles] = useState<ConsultancyRole[]>(member.roles);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleRole = (role: ConsultancyRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = () => {
    if (selectedRoles.length === 0) {
      setError("Pelo menos uma função deve permanecer selecionada.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateMemberRolesAction(slug, member.membershipPublicId, selectedRoles);
        if (!res.success) {
          setError(res.error || "Não foi possível atualizar as funções.");
          return;
        }
        onSuccess(selectedRoles);
      } catch {
        setError("Erro inesperado ao salvar alterações.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-roles-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h3 id="edit-roles-title" className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              Editar funções
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {member.fullName} ({member.email})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] shrink-0 cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-soft-border)] text-xs text-[var(--danger)] font-medium">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            Selecione as funções atribuídas:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                { id: "STUDENT", label: "Aluno" },
                { id: "PERSONAL", label: "Personal Trainer" },
                { id: "NUTRITIONIST", label: "Nutricionista" },
                { id: "CONSULTANCY_ADMIN", label: "Administrador" },
                { id: "INFLUENCER", label: "Influenciador / VIP" },
              ] as const
            ).map((role) => {
              const isChecked = selectedRoles.includes(role.id as ConsultancyRole);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id as ConsultancyRole)}
                  className={`p-3 rounded-xl border text-left font-medium text-xs transition-all flex items-center justify-between min-h-[44px] cursor-pointer select-none ${
                    isChecked
                      ? "bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-foreground)] font-semibold"
                      : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>{role.label}</span>
                  {isChecked && (
                    <svg className="w-4 h-4 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onClose}
            className="min-h-[44px] text-xs font-semibold px-4"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={handleSave}
            className="min-h-[44px] text-xs font-semibold px-5"
          >
            {isPending ? "Salvando..." : "Salvar funções"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: CONFIRMAÇÃO GENÉRICA DE AÇÕES (Desligar, Suspender, Revogar)
// ============================================================================
function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  confirmVariant,
  isPending,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "danger" | "warning" | "primary";
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onClose}
            className="min-h-[44px] text-xs font-semibold px-4"
          >
            Cancelar
          </Button>

          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className={`min-h-[44px] px-5 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer select-none ${
              confirmVariant === "danger"
                ? "bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white"
                : confirmVariant === "warning"
                ? "bg-[var(--warning)] hover:brightness-110 text-black font-bold"
                : "bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white"
            }`}
          >
            {isPending ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
