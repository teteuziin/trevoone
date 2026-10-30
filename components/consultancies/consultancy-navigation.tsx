"use client";

import { resolveUserIdentity } from "@/lib/auth/user-identity";

import { UserAvatar } from "@/components/account/user-avatar";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircleIcon as HelpCircle } from "@/components/ui/icons";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { logoutFromConsultancyArea } from "@/app/selecionar-consultoria/actions";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";
import { ViewModeSelector } from "./view-mode-selector";
import { CockpitRoleModeSwitcher } from "@/components/dashboard/cockpit-role-mode-switcher";
import { FirstAccessTutorial } from "@/components/onboarding/first-access-tutorial";
import type { EffectiveViewModeState } from "@/lib/consultancies/view-mode";
import {
  DuotoneOverviewIcon,
  DuotoneStudentsIcon,
  DuotoneTrainingIcon,
  DuotoneNutritionIcon,
  DuotoneProgressIcon,
  DuotoneExercisesIcon,
  DuotoneFinanceIcon,
  DuotoneSubscriptionIcon,
  DuotoneMissionsIcon,
  DuotoneConsultationsIcon,
  DuotoneActivityIcon,
  DuotoneOperationsIcon,
  DuotoneReferralsIcon,
  DuotoneAiIcon,
} from "@/components/ui/icons/duotone-icons";

export interface NavItemConfig {
  id: string;
  label: string;
  mobileLabel?: string;
  href: string;
  iconName:
    | "overview"
    | "training"
    | "nutrition"
    | "progress"
    | "prescriptions"
    | "exercises"
    | "members"
    | "onboarding"
    | "finance"
    | "subscription"
    | "missions"
    | "consultations"
    | "activity"
    | "operations"
    | "referrals"
    | "ai";
}

export interface ConsultancyNavigationProps {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl: string | null;
  items: NavItemConfig[];
  mobilePrimaryItems?: NavItemConfig[];
  userName?: string;
  userEmail?: string;
  roleLabels?: string[];
  unreadNotificationsCount?: number;
  viewModeState?: EffectiveViewModeState;
  avatarUrl?: string | null;
  userPublicId?: string;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
  themeVariant?: "default" | "dark-overview";
}

type ThemeMode = "light" | "dark" | "system";

function NavIcon({
  name,
  className = "w-5 h-5 shrink-0",
}: {
  name: NavItemConfig["iconName"];
  className?: string;
}) {
  switch (name) {
    case "overview":
      return <DuotoneOverviewIcon className={className} />;
    case "training":
      return <DuotoneTrainingIcon className={className} />;
    case "nutrition":
      return <DuotoneNutritionIcon className={className} />;
    case "progress":
      return <DuotoneProgressIcon className={className} />;
    case "prescriptions":
    case "exercises":
      return <DuotoneExercisesIcon className={className} />;
    case "members":
      return <DuotoneStudentsIcon className={className} />;
    case "onboarding":
      return <DuotoneOperationsIcon className={className} />;
    case "finance":
      return <DuotoneFinanceIcon className={className} />;
    case "subscription":
      return <DuotoneSubscriptionIcon className={className} />;
    case "missions":
      return <DuotoneMissionsIcon className={className} />;
    case "consultations":
      return <DuotoneConsultationsIcon className={className} />;
    case "activity":
      return <DuotoneActivityIcon className={className} />;
    case "operations":
      return <DuotoneOperationsIcon className={className} />;
    case "referrals":
      return <DuotoneReferralsIcon className={className} />;
    case "ai":
      return <DuotoneAiIcon className={className} />;
    default:
      return null;
  }
}

function getThemeSnapshot(): ThemeMode {
  try {
    const stored = localStorage.getItem("trevo_theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage access unavailable
  }
  return "system";
}

function getThemeServerSnapshot(): ThemeMode {
  return "system";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("trevo-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("trevo-theme-change", callback);
  };
}

export function AppearanceSegmentedControl({
  className = "",
  compact = false,
  showLabel = true,
  currentTheme: propCurrentTheme,
  onThemeSelect: propOnThemeSelect,
}: {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
  currentTheme?: ThemeMode;
  onThemeSelect?: (theme: ThemeMode) => void;
}) {
  const storeTheme = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );
  const currentTheme = propCurrentTheme ?? storeTheme;

  function handleThemeSelect(newTheme: ThemeMode) {
    if (propOnThemeSelect) {
      propOnThemeSelect(newTheme);
      return;
    }
    try {
      localStorage.setItem("trevo_theme", newTheme);
      const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = newTheme === "dark" || (newTheme === "system" && prefersDark);
      if (isDark) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
      }
      window.dispatchEvent(new Event("trevo-theme-change"));
    } catch {
      // Storage unavailable
    }
  }

  const options: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    {
      id: "light",
      label: "Claro",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
    },
    {
      id: "dark",
      label: "Escuro",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ),
    },
    {
      id: "system",
      label: "Sistema",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
        </svg>
      ),
    },
  ];

  if (compact) {
    return (
      <div
        role="group"
        aria-label="Selecionar tema de aparência"
        className={`inline-flex items-center p-0.5 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl shadow-inner ${className}`.trim()}
      >
        {options.map((opt) => {
          const selected = currentTheme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleThemeSelect(opt.id)}
              title={opt.label}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] rounded-lg select-none transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] depth-interactive ${
                selected
                  ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium"
              }`}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {showLabel && (
        <div className="flex items-center justify-between px-1">
          <label id="appearance-label" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Aparência
          </label>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] capitalize">
            {currentTheme === "system" ? "Sistema" : currentTheme === "dark" ? "Escuro" : "Claro"}
          </span>
        </div>
      )}

      <div
        role="group"
        aria-labelledby={showLabel ? "appearance-label" : undefined}
        aria-label={!showLabel ? "Selecionar tema de aparência" : undefined}
        className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl shadow-inner"
      >
        {options.map((opt) => {
          const selected = currentTheme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleThemeSelect(opt.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-lg min-h-[44px] select-none transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] depth-interactive ${
                selected
                  ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getRoleBadgeColor(lbl: string): string {
  const lower = lbl.toLowerCase();
  if (lower.includes("personal") || lower.includes("treinador")) {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30";
  }
  if (lower.includes("nutricionista") || lower.includes("nutri")) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
  }
  if (lower.includes("administrador") || lower.includes("admin")) {
    return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30";
  }
  if (lower.includes("aluno") || lower.includes("paciente") || lower.includes("student")) {
    return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30";
  }
  return "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]";
}

export function ConsultancyNavigation({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  items = [],
  mobilePrimaryItems,
  userName,
  userEmail,
  roleLabels = [],
  unreadNotificationsCount = 0,
  viewModeState,
  avatarUrl,
  userPublicId,
  hasProfilePhoto,
  profilePhotoUpdatedAt,
  themeVariant = "default",
}: ConsultancyNavigationProps) {
  const isDarkOverview = themeVariant === "dark-overview";
  const identity = resolveUserIdentity({
    fullName: userName,
    email: userEmail,
    userPublicId: userPublicId,
    avatarUrl: avatarUrl,
    hasProfilePhoto: hasProfilePhoto,
    profilePhotoUpdatedAt: profilePhotoUpdatedAt,
  });
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false);
  const desktopProfileRef = useRef<HTMLDivElement>(null);

  // Hydration-safe external store subscription to localStorage theme
  const currentTheme = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  function handleThemeSelect(newTheme: ThemeMode) {
    try {
      localStorage.setItem("trevo_theme", newTheme);
      const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = newTheme === "dark" || (newTheme === "system" && prefersDark);
      if (isDark) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
      }
      window.dispatchEvent(new Event("trevo-theme-change"));
    } catch {
      // Storage unavailable
    }
  }

  const baseSlugHref = `/consultoria/${consultancySlug}`;

  // Keyboard awareness on mobile devices (prevents bottom nav floating above keyboard)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.visualViewport) {
      const handleResize = () => {
        if (!window.visualViewport) return;
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 150);
      };
      const vv = window.visualViewport;
      vv.addEventListener("resize", handleResize);
      return () => {
        vv.removeEventListener("resize", handleResize);
      };
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(true);
      }
    };
    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Focused fullscreen workflows where mobile bottom nav should not compete with primary CTAs:
  // 1. Student active workout runtime (/treinos/[assignmentPublicId]) -> focus on CONCLUIR SÉRIE
  // 2. Workout builder editor (/rotinas/[publicId] or /rotinas/novo)
  // 3. Nutrition plan builder editor (/planos-v2/[planPublicId] or /planos-v2/novo)
  const isStudentRuntime =
    Boolean(pathname) &&
    pathname.startsWith(`${baseSlugHref}/treinos/`) &&
    pathname !== `${baseSlugHref}/treinos`;

  const isWorkoutBuilder =
    Boolean(pathname) &&
    (pathname.startsWith(`${baseSlugHref}/rotinas/novo`) ||
      (pathname.startsWith(`${baseSlugHref}/rotinas/`) &&
        pathname !== `${baseSlugHref}/rotinas`));

  const isNutritionBuilder =
    Boolean(pathname) &&
    (pathname.startsWith(`${baseSlugHref}/planos-v2/novo`) ||
      (pathname.startsWith(`${baseSlugHref}/planos-v2/`) &&
        pathname !== `${baseSlugHref}/planos-v2` &&
        !pathname.startsWith(`${baseSlugHref}/planos-v2/prontuario`)));

  const isStudentChat =
    Boolean(pathname) &&
    pathname === `${baseSlugHref}/progresso/alunos`;

  const hasChatQuery = React.useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    () => (typeof window !== "undefined" ? window.location.search.includes("c=") : false),
    () => false
  );

  const isConsultasActiveChat =
    Boolean(pathname) &&
    pathname.startsWith(`${baseSlugHref}/consultas`) &&
    hasChatQuery;

  const shouldHideMobileBottomNav =
    isStudentRuntime ||
    isWorkoutBuilder ||
    isNutritionBuilder ||
    isStudentChat ||
    isConsultasActiveChat ||
    isKeyboardOpen;

  function isItemActive(itemHref?: string | null): boolean {
    if (!pathname || !itemHref) return false;
    if (itemHref === baseSlugHref) {
      return pathname === baseSlugHref;
    }
    const cleanItemHref = itemHref.split("#")[0].split("?")[0];

    // Special routing for Nutritionist Patient Record (/planos-v2/prontuario):
    // Conceptually belongs to "Pacientes" (/progresso/alunos), NOT "Planos Alimentares" (/planos-v2)
    const isPatientRecordRoute =
      pathname === `${baseSlugHref}/planos-v2/prontuario` ||
      pathname.startsWith(`${baseSlugHref}/planos-v2/prontuario/`);

    if (isPatientRecordRoute) {
      if (cleanItemHref === `${baseSlugHref}/progresso/alunos`) {
        return true;
      }
      if (cleanItemHref === `${baseSlugHref}/planos-v2`) {
        return false;
      }
    }

    if (pathname === cleanItemHref) return true;

    // Subroute matching with explicit boundary
    if (pathname.startsWith(cleanItemHref + "/")) {
      // Disambiguate /progresso (Evolução Aluno) vs /progresso/alunos (Alunos Personal):
      if (
        cleanItemHref === `${baseSlugHref}/progresso` &&
        pathname.startsWith(`${baseSlugHref}/progresso/alunos`)
      ) {
        return false;
      }
      return true;
    }
    return false;
  }

  const handleNavClick = useCallback(
    (item: { href?: string | null; id?: string }) => {
      try {
        const isConsultasNav = Boolean(
          item.href?.endsWith("/consultas") ||
          item.id === "student-consultas" ||
          item.id === "atendimento-consultas"
        );
        if (isConsultasNav) {
          sessionStorage.setItem(
            "trevo_chat_nav_intent",
            JSON.stringify({ slug: consultancySlug, ts: Date.now() })
          );
        } else {
          sessionStorage.removeItem("trevo_chat_nav_intent");
        }
      } catch {}
    },
    [consultancySlug]
  );

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close menus during render when pathname changes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setDesktopProfileOpen(false);
  }

  // Handle keyboard Escape and outside click listeners
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setDesktopProfileOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        desktopProfileRef.current &&
        !desktopProfileRef.current.contains(e.target as Node)
      ) {
        setDesktopProfileOpen(false);
      }
    }

    if (mobileMenuOpen || desktopProfileOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    if (desktopProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen, desktopProfileOpen]);
  const primaryRoleLabel = roleLabels.length > 0 ? roleLabels[0] : null;

  // Determine primary (max 4) and secondary items for mobile navigation
  const primaryNavItems =
    mobilePrimaryItems && mobilePrimaryItems.length > 0
      ? mobilePrimaryItems.slice(0, 4)
      : items.slice(0, 4);

  const primaryHrefs = new Set(primaryNavItems.map((item) => item.href));
  const secondaryNavItems = items.filter((item) => !primaryHrefs.has(item.href));

  const isAnyPrimaryActive = primaryNavItems.some((item) => isItemActive(item.href));
  const isAnySecondaryActive =
    secondaryNavItems.some((item) => isItemActive(item.href)) ||
    pathname === "/notificacoes" ||
    pathname === "/conta/seguranca";

  const isMoreActive = !isAnyPrimaryActive && isAnySecondaryActive;
  const isMoreButtonActive = isMoreActive || mobileMenuOpen;

  // Drawer Secondary Navigation Groups (Mobile & Tablet "Mais" Screen)
  // GESTÃO: Consultas, Membros, Missões de Gestão, Prontuários, Atendimento de Alunos/Treinos/Planos (se secundários)
  const drawerManagementIds = new Set([
    "atendimento-consultas",
    "student-consultas",
    "admin-membros",
    "admin-missoes",
    "nutritionist-prontuario",
    "atendimento-alunos",
    "personal-rotinas",
    "nutritionist-planos",
    "student-formularios",
  ]);

  // NEGÓCIO: Financeiro, Pagamentos, Indicações/Afiliados, Assinatura, Comissões, Missões VIP
  const drawerBusinessIds = new Set([
    "admin-financeiro",
    "student-pagamentos",
    "admin-indicacoes",
    "influencer-indicacoes",
    "influencer-comissoes",
    "admin-assinatura",
    "influencer-missoes",
  ]);

  // SISTEMA: Cotas IA, Central de Atividades, Exercícios, Alimentos, Operações
  const drawerSystemIds = new Set([
    "admin-ia",
    "admin-atividades",
    "personal-exercicios",
    "nutritionist-alimentos",
    "admin-operacoes",
  ]);

  const secondaryManagementItems = secondaryNavItems.filter((i) => drawerManagementIds.has(i.id));
  const secondaryBusinessItems = secondaryNavItems.filter((i) => drawerBusinessIds.has(i.id));
  const secondarySystemItems = secondaryNavItems.filter((i) => drawerSystemIds.has(i.id));
  const secondaryOtherItems = secondaryNavItems.filter(
    (i) => !drawerManagementIds.has(i.id) && !drawerBusinessIds.has(i.id) && !drawerSystemIds.has(i.id)
  );

  const drawerItemDescriptions: Record<string, string> = {
    "admin-membros": "Gestão de profissionais e alunos",
    "atendimento-consultas": "Agendamentos e salas ao vivo",
    "student-consultas": "Agendamentos e videochamadas",
    "admin-missoes": "Metas, desafios e embaixadores",
    "influencer-missoes": "Missões ativas e recompensas",
    "nutritionist-prontuario": "Histórico e evolução clínica",
    "atendimento-alunos":
      viewModeState?.effectiveMode === "NUTRITIONIST" ||
      (roleLabels.includes("Nutricionista") && !roleLabels.includes("Personal Trainer"))
        ? "Acompanhamento de pacientes e prontuário"
        : "Acompanhamento de alunos",
    "personal-rotinas": "Treinos e rotinas prescritas",
    "nutritionist-planos": "Planos e prescrições alimentares",
    "admin-financeiro": "Cobranças, faturas e fluxo de caixa",
    "student-pagamentos": "Faturas e comprovantes",
    "admin-indicacoes": "Programa de afiliados e comissões",
    "influencer-indicacoes": "Links de divulgação e ganhos",
    "influencer-comissoes": "Histórico de repasses e comissões",
    "admin-assinatura": "Plano e licença Trevo One",
    "admin-ia": "Cotas e inteligência artificial",
    "admin-atividades": "Registro de auditoria e ações",
    "personal-exercicios": "Catálogo de vídeos e execuções",
    "nutritionist-alimentos": "Tabela TACO e alimentos",
    "admin-operacoes": "Rotinas e governança do negócio",
  };

  // MULTI-ROLE UNIFIED EXPERIENCE: Group items into clear semantic sections
  type NavSection = {
    title?: string;
    items: NavItemConfig[];
  };

  const desktopSections: NavSection[] = [];

  const overviewItem = items.find((item) => item.id === "overview");
  if (overviewItem) {
    desktopSections.push({ items: [overviewItem] });
  }

  // Itens categorizados
  const partnershipItems = items.filter((item) => item.id.startsWith("influencer-"));
  const attendanceItems = items.filter(
    (item) =>
      item.id.startsWith("atendimento-") ||
      item.id === "personal-rotinas" ||
      item.id === "nutritionist-planos" ||
      item.id === "nutritionist-prontuario"
  );
  const managementItems = items.filter((item) => item.id.startsWith("admin-"));
  const libraryItems = items.filter(
    (item) => item.id === "personal-exercicios" || item.id === "nutritionist-alimentos"
  );
  const trackingItems = items.filter((item) => item.id.startsWith("learner-"));
  const servicesItems = items.filter(
    (item) =>
      item.id === "student-consultas" ||
      item.id === "student-pagamentos" ||
      item.id === "student-formularios"
  );

  // STUDENT-FIRST: Se o usuário possui acompanhamento de aluno, priorizar Aluno sobre Parceria VIP
  const isStudentNavigation = trackingItems.length > 0;

  if (isStudentNavigation) {
    // 1. MEU ACOMPANHAMENTO (Treinos, Nutrição, Evolução)
    desktopSections.push({ title: "MEU ACOMPANHAMENTO", items: trackingItems });

    // 2. SERVIÇOS (Consultas, Pagamentos)
    if (servicesItems.length > 0) {
      desktopSections.push({ title: "SERVIÇOS", items: servicesItems });
    }

    // 3. ATENDIMENTO (se possuir personal/nutri)
    if (attendanceItems.length > 0) {
      desktopSections.push({ title: "ATENDIMENTO", items: attendanceItems });
    }

    // 4. GESTÃO (se possuir admin)
    if (managementItems.length > 0) {
      desktopSections.push({ title: "GESTÃO", items: managementItems });
    }

    // 5. BIBLIOTECA
    if (libraryItems.length > 0) {
      desktopSections.push({ title: "BIBLIOTECA", items: libraryItems });
    }

    // 6. PARCERIA VIP (Secundário para quem é Aluno: Missões, Indicações, Comissões)
    if (partnershipItems.length > 0) {
      const sidebarPartnershipItems = partnershipItems.filter((i) => i.id !== "influencer-pix");
      desktopSections.push({ title: "PARCERIA VIP", items: sidebarPartnershipItems });
    }
  } else {
    // 1. PARCERIA (Influenciador puro)
    if (partnershipItems.length > 0) {
      desktopSections.push({ title: "PARCERIA", items: partnershipItems });
    }

    // 2. ATENDIMENTO (Personal e/ou Nutricionista)
    if (attendanceItems.length > 0) {
      desktopSections.push({ title: "ATENDIMENTO", items: attendanceItems });
    }

    // 3. GESTÃO (Administrador da Consultoria)
    if (managementItems.length > 0) {
      desktopSections.push({ title: "GESTÃO", items: managementItems });
    }

    // 4. BIBLIOTECA (Exercícios e Alimentos)
    if (libraryItems.length > 0) {
      desktopSections.push({ title: "BIBLIOTECA", items: libraryItems });
    }

    // 5. SERVIÇOS
    if (servicesItems.length > 0) {
      desktopSections.push({ title: "SERVIÇOS", items: servicesItems });
    }
  }

  // 7. ITENS ADICIONAIS / OUTROS
  const knownIds = new Set([
    "overview",
    ...partnershipItems.map((i) => i.id),
    ...attendanceItems.map((i) => i.id),
    ...managementItems.map((i) => i.id),
    ...libraryItems.map((i) => i.id),
    ...trackingItems.map((i) => i.id),
    ...servicesItems.map((i) => i.id),
  ]);
  const leftoverItems = items.filter((item) => !knownIds.has(item.id));
  if (leftoverItems.length > 0) {
    desktopSections.push({ title: "OUTROS", items: leftoverItems });
  }

  return (
    <>
      {/* =========================================================================
          1. DESKTOP PERSISTENT SIDEBAR (>= 1024px / lg)
          ========================================================================= */}
      <aside
        aria-label="Barra lateral de navegação"
        className={`hidden lg:flex fixed top-0 bottom-0 left-0 w-64 ${
          isDarkOverview
            ? "bg-[#F9FAFB] dark:bg-[#111215] border-r border-[#E5E7EB] dark:border-[#303238] text-[#17191D] dark:text-white"
            : "bg-[var(--surface)] border-r border-[var(--border-default)]"
        } z-30 flex-col justify-between select-none print:hidden transition-colors`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 border-b border-[#E5E7EB] dark:border-[#303238] shrink-0">
          <Link
            href={baseSlugHref}
            prefetch={false}
            className={`flex items-center gap-3 p-2 rounded-xl ${
              isDarkOverview
                ? "hover:bg-[#E5E7EB] dark:hover:bg-[#1B1D21] border border-transparent hover:border-[#D1D5DB] dark:hover:border-[#303238]"
                : "hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-default)]"
            } transition-all group focus-visible:outline-2 focus-visible:outline-[var(--brand)] depth-interactive`}
          >
            <ConsultancyLogo
              logoUrl={consultancyLogoUrl}
              name={consultancyName}
              size={56}
              clean={true}
            />
            <div className="min-w-0 flex-1">
              <p className={`text-base font-bold tracking-tight ${
                isDarkOverview ? "text-[#17191D] dark:text-white" : "text-[var(--text-primary)]"
              } truncate leading-tight transition-colors`}>
                {consultancyName}
              </p>
              {roleLabels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {roleLabels.map((lbl) => (
                    <span
                      key={lbl}
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${getRoleBadgeColor(lbl)} uppercase tracking-wider`}
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>

          {/* Mode Switcher for Multi-Role on Desktop Sidebar */}
          {viewModeState && !viewModeState.isPreview && viewModeState.allowedOptions.filter(o => o.isRealRole).length > 1 && viewModeState.allowedOptions.some(o => o.isRealRole && (o.mode === "PERSONAL" || o.mode === "ADMIN" || o.mode === "NUTRITIONIST")) && (
            <div className="mt-3">
              <CockpitRoleModeSwitcher
                consultancySlug={consultancySlug}
                currentMode={viewModeState.effectiveMode}
                allowedOptions={viewModeState.allowedOptions}
                variant="desktop"
                className="w-full"
              />
            </div>
          )}

          {/* View Mode Selector ONLY if explicitly in preview mode */}
          {viewModeState?.isPreview && (
            <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">
                Modo Demonstração
              </p>
              <ViewModeSelector
                consultancySlug={consultancySlug}
                effectiveMode={viewModeState.effectiveMode}
                defaultMode={viewModeState.defaultMode}
                allowedOptions={viewModeState.allowedOptions}
              />
            </div>
          )}
        </div>

        {/* Middle: Navigation Links (Scrolls independently) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <nav aria-label="Navegação desktop" className="space-y-4">
            {desktopSections.map((section, sIdx) => (
              <div
                key={section.title || sIdx}
                className="space-y-1"
              >
                {section.title && (
                  <p className={`text-[11px] font-semibold ${
                    isDarkOverview ? "text-[#4B5563] dark:text-[#8E959E]" : "text-[var(--text-tertiary)]"
                  } uppercase tracking-wider px-3 mb-2 font-heading`}>
                    {section.title}
                  </p>
                )}
                {section.items.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      prefetch={false}
                      onClick={() => handleNavClick(item)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between px-3 py-2 text-[13px] min-h-[44px] rounded-xl border transition-all depth-interactive ${
                        active
                          ? isDarkOverview
                            ? "bg-[#E5E7EB] dark:bg-[#1B1D21] text-[#17191D] dark:text-white border-[#D1D5DB] dark:border-[#303238] shadow-xs font-semibold"
                            : "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                          : isDarkOverview
                          ? "text-[#4B5563] hover:text-[#17191D] hover:bg-[#F3F4F6] dark:text-[#C2C8CF] dark:hover:text-white dark:hover:bg-[#1B1D21] border-transparent font-medium"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <NavIcon name={item.iconName} className="w-5 h-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {active && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isDarkOverview ? "bg-[#10B981]" : "bg-[var(--brand)]"} shrink-0`} />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom: Refined Single Account Trigger & Unified Popover */}
        <div
          ref={desktopProfileRef}
          className={`relative p-3 border-t ${
            isDarkOverview
              ? "border-[#E5E7EB] dark:border-[#303238] bg-[#F9FAFB] dark:bg-[#111215]"
              : "border-[var(--border-default)] bg-[var(--surface)]"
          } shrink-0`}
        >
          {/* Desktop Account Menu Popover */}
          {desktopProfileOpen && (
            <div
              role="menu"
              aria-label="Menu da conta"
              className="absolute bottom-full left-3 right-3 mb-2 z-50 bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* User Identity Header */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#E5E7EB] dark:border-[#303238]">
                <UserAvatar
                  fullName={identity.fullName}
                  userPublicId={identity.userPublicId}
                  avatarUrl={identity.avatarUrl}
                  hasProfilePhoto={identity.hasProfilePhoto}
                  profilePhotoUpdatedAt={identity.profilePhotoUpdatedAt}
                  shape="circle"
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#17191D] dark:text-white truncate">
                    {identity.fullName}
                  </p>
                  {identity.email && (
<p title={identity.email} className="text-[11px] text-[#6B7280] dark:text-[#8E95A2] break-all leading-snug mt-0.5">
                      {identity.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-0.5">
                <Link
                  href={`/conta/perfil?returnTo=${encodeURIComponent(pathname)}`}
                  onClick={() => setDesktopProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-xl text-[#17191D] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0 text-[#6B7280] dark:text-[#8E95A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span>Meu perfil</span>
                </Link>

                <Link
                  href="/notificacoes"
                  onClick={() => setDesktopProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-xl text-[#17191D] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg className="w-4 h-4 shrink-0 text-[#6B7280] dark:text-[#8E95A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    <span className="truncate">Notificações</span>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                  )}
                </Link>

                <Link
                  href="/conta/seguranca"
                  onClick={() => setDesktopProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-xl text-[#17191D] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0 text-[#6B7280] dark:text-[#8E95A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span>Segurança e senha</span>
                </Link>

                <Link
                  href={`/consultoria/${consultancySlug}/ajuda`}
                  onClick={() => setDesktopProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-xl text-[#17191D] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0 text-[#6B7280] dark:text-[#8E95A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" />
                  </svg>
                  <span>Ajuda e suporte</span>
                </Link>
              </div>

              {/* Theme Selector */}
              <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#303238]">
                <p className="text-[10px] font-bold text-[#6B7280] dark:text-[#8E95A2] uppercase tracking-wider px-1 mb-1.5">
                  Tema da interface
                </p>
                <AppearanceSegmentedControl
                  compact
                  currentTheme={currentTheme}
                  onThemeSelect={handleThemeSelect}
                  className="w-full justify-center"
                />
              </div>

              {/* Actions: Switch consultancy and Logout */}
              <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#303238] space-y-1">
                <Link
                  href="/selecionar-consultoria"
                  prefetch={false}
                  onClick={() => setDesktopProfileOpen(false)}
                  className="flex items-center justify-center w-full py-2 px-3 text-xs font-semibold rounded-xl text-[#17191D] dark:text-white bg-[#F3F4F6] dark:bg-[#1B1D21] hover:bg-[#E5E7EB] dark:hover:bg-[#252830] transition-colors"
                >
                  Trocar consultoria
                </Link>
                <LogoutButton
                  logoutAction={logoutFromConsultancyArea}
                  className="flex items-center justify-center w-full py-2 px-3 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  Sair da conta
                </LogoutButton>
              </div>
            </div>
          )}

          {/* User Info Card Trigger */}
          <button
            type="button"
            onClick={() => setDesktopProfileOpen((prev) => !prev)}
            aria-expanded={desktopProfileOpen}
            aria-label="Abrir menu de conta"
            className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left ${
              isDarkOverview
                ? desktopProfileOpen
                  ? "bg-[#E5E7EB] dark:bg-[#1B1D21] border border-[#D1D5DB] dark:border-[#303238]"
                  : "hover:bg-[#E5E7EB] dark:hover:bg-[#1B1D21] border border-transparent"
                : "hover:bg-[var(--surface-subtle)] border border-transparent"
            } transition-colors min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <UserAvatar
                fullName={identity.fullName}
                userPublicId={identity.userPublicId}
                avatarUrl={identity.avatarUrl}
                hasProfilePhoto={identity.hasProfilePhoto}
                profilePhotoUpdatedAt={identity.profilePhotoUpdatedAt}
                shape="circle"
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold ${
                  isDarkOverview ? "text-[#17191D] dark:text-white" : "text-[var(--text-primary)]"
                } transition-colors truncate leading-tight`}>
                  {identity.fullName}
                </p>
                {identity.email && (
<p
                    title={identity.email}
                    className={`text-xs ${
                      isDarkOverview ? "text-[#4B5563] dark:text-[#C2C8CF]" : "text-[var(--text-tertiary)]"
                    } break-all leading-snug mt-0.5`}
                  >
                    {identity.email}
                  </p>
                )}
              </div>
            </div>

            <svg
              className={`w-4 h-4 shrink-0 transition-transform ${
                desktopProfileOpen ? "rotate-180" : ""
              } text-[#6B7280] dark:text-[#8E95A2]`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. TABLET ADAPTIVE TOPBAR (768px - 1023px / md to lg)
          ========================================================================= */}
      <header
        className={`hidden md:flex lg:hidden sticky top-0 z-30 w-full max-w-full min-w-0 ${
          isDarkOverview
            ? "bg-[#F9FAFB] dark:bg-[#111215] border-b border-[#E5E7EB] dark:border-[#303238] text-[#17191D] dark:text-white"
            : "bg-[var(--surface)] border-b border-[var(--border-default)]"
        } shadow-2xs print:hidden transition-colors border-specular-t`}
      >
        <div className="w-full max-w-7xl min-w-0 mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Branding */}
          <Link
            href={baseSlugHref}
            prefetch={false}
            className="flex items-center gap-2.5 min-w-0 group focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl py-1"
          >
            <ConsultancyLogo
              logoUrl={consultancyLogoUrl}
              name={consultancyName}
              size={32}
            />
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${isDarkOverview ? "text-[#17191D] dark:text-white" : "text-[var(--text-primary)]"} truncate leading-tight`}>
                {consultancyName}
              </p>
              {primaryRoleLabel && (
                <p className={`text-[10px] font-medium ${isDarkOverview ? "text-[#4B5563] dark:text-[#C2C8CF]" : "text-[var(--text-tertiary)]"} truncate leading-tight uppercase tracking-wider mt-0.5`}>
                  {primaryRoleLabel}
                </p>
              )}
            </div>
          </Link>

          {/* Center: Primary Navigation Tabs */}
          <nav aria-label="Navegação do tablet" className="flex items-center gap-1">
            {primaryNavItems.slice(0, 4).map((item) => {
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all depth-interactive ${
                    active
                      ? isDarkOverview
                        ? "bg-[#E5E7EB] dark:bg-[#1B1D21] text-[#17191D] dark:text-white border-[#D1D5DB] dark:border-[#303238] shadow-xs font-semibold"
                        : "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs font-semibold"
                      : isDarkOverview
                        ? "text-[#4B5563] hover:text-[#17191D] hover:bg-[#F3F4F6] dark:text-[#C2C8CF] dark:hover:text-white dark:hover:bg-[#1B1D21] border-transparent font-medium"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent font-medium"
                  }`}
                >
                  <NavIcon name={item.iconName} />
                  <span>{item.mobileLabel || item.label}</span>
                  {active && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isDarkOverview ? "bg-[#10B981]" : "bg-[var(--brand)]"} shrink-0`} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mode Switcher for Multi-Role on Tablet */}
          {viewModeState && !viewModeState.isPreview && viewModeState.allowedOptions.filter(o => o.isRealRole).length > 1 && viewModeState.allowedOptions.some(o => o.isRealRole && (o.mode === "PERSONAL" || o.mode === "ADMIN" || o.mode === "NUTRITIONIST")) && (
            <CockpitRoleModeSwitcher
              consultancySlug={consultancySlug}
              currentMode={viewModeState.effectiveMode}
              allowedOptions={viewModeState.allowedOptions}
              variant="mobile"
              compact={true}
              className="hidden sm:inline-flex"
            />
          )}

          {/* Right: Notifications & Drawer Menu Toggle */}
          <div className="flex items-center gap-2">
            <NotificationBell unreadCount={unreadNotificationsCount} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação e opções"
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                isDarkOverview
                  ? "border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F3F4F6] dark:hover:bg-[#252830] text-[#17191D] dark:text-white"
                  : "border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
              } text-xs font-semibold transition-all shadow-xs depth-interactive cursor-pointer min-h-[36px]`}
            >
              <svg className={`w-4 h-4 ${isDarkOverview ? "text-[#4B5563] dark:text-[#C2C8CF]" : "text-[var(--text-secondary)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          3. MOBILE TOPBAR (< 768px)
          ========================================================================= */}
      <header
        className={`flex md:hidden sticky top-0 z-30 w-full max-w-full min-w-0 ${
          isDarkOverview
            ? "bg-[#F9FAFB] dark:bg-[#111215] border-b border-[#E5E7EB] dark:border-[#303238] text-[#17191D] dark:text-white"
            : "bg-[var(--surface)] border-b border-[var(--border-default)]"
        } shadow-2xs pt-[env(safe-area-inset-top,0px)] print:hidden transition-colors border-specular-t`}
      >
        <div className="w-full max-w-full min-w-0 px-3.5 h-14 flex items-center justify-between gap-2">
          {/* Left: Branding */}
          <Link
            href={baseSlugHref}
            prefetch={false}
            className="flex items-center gap-2 min-w-0 shrink-0 group focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl py-1"
          >
            <ConsultancyLogo
              logoUrl={consultancyLogoUrl}
              name={consultancyName}
              size={28}
            />
          </Link>

          {/* Mode Switcher on Mobile Header (Single switcher for mobile viewport) */}
          {viewModeState && !viewModeState.isPreview && viewModeState.allowedOptions.filter(o => o.isRealRole).length > 1 && viewModeState.allowedOptions.some(o => o.isRealRole && (o.mode === "PERSONAL" || o.mode === "ADMIN" || o.mode === "NUTRITIONIST")) ? (
            <div className="flex-1 flex justify-center min-w-0 px-1">
              <CockpitRoleModeSwitcher
                consultancySlug={consultancySlug}
                currentMode={viewModeState.effectiveMode}
                allowedOptions={viewModeState.allowedOptions}
                variant="mobile"
                compact={true}
              />
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold ${isDarkOverview ? "text-[#17191D] dark:text-white" : "text-[var(--text-primary)]"} truncate leading-tight`}>
                {consultancyName}
              </p>
              {primaryRoleLabel && (
                <p className={`text-[10px] font-medium ${isDarkOverview ? "text-[#4B5563] dark:text-[#C2C8CF]" : "text-[var(--text-tertiary)]"} truncate leading-tight uppercase tracking-wider mt-0.5`}>
                  {primaryRoleLabel}
                </p>
              )}
            </div>
          )}

          {/* Right Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell unreadCount={unreadNotificationsCount} />
          </div>
        </div>
      </header>

      {/* =========================================================================
          4. MOBILE BOTTOM NAVIGATION (< 768px)
          ========================================================================= */}
      {!shouldHideMobileBottomNav && (
        <nav
          aria-label="Navegação rápida móvel"
          className={`md:hidden fixed bottom-0 inset-x-0 z-30 w-full max-w-full min-w-0 ${
            isDarkOverview
              ? "bg-[#F9FAFB] dark:bg-[#111215] border-t border-[#E5E7EB] dark:border-[#303238]"
              : "bg-[var(--surface)] border-t border-[var(--border-default)]"
          } pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] shadow-lg print:hidden border-specular-t`}
        >
          <div className="flex items-center justify-around min-h-[58px] sm:min-h-[64px] h-auto px-1 pt-1 pb-0.5">
            {primaryNavItems.map((item) => {
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  onClick={() => handleNavClick(item)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-0.5 select-none focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl ${
                    active
                      ? isDarkOverview ? "text-[#065F46] dark:text-[#10B981]" : "text-[var(--brand)]"
                      : isDarkOverview ? "text-[#4B5563] hover:text-[#17191D] dark:text-[#C2C8CF] dark:hover:text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <div
                    className={`px-3 py-1 rounded-full relative flex items-center justify-center shrink-0 transition-all duration-150 ${
                      active
                        ? isDarkOverview
                          ? "bg-emerald-500/15 text-[#065F46] dark:text-[#10B981] border border-emerald-500/30 shadow-xs"
                          : "bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 shadow-xs"
                        : isDarkOverview
                          ? "border border-transparent group-hover:bg-[#DFE3E8] dark:group-hover:bg-[#1B1D21]"
                          : "border border-transparent group-hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <NavIcon name={item.iconName} className="w-[22px] h-[22px] shrink-0" />
                  </div>
                  <span
                    className={`text-[11px] tracking-tight truncate max-w-full leading-none mt-1 text-center shrink-0 transition-colors duration-150 ${
                      active
                        ? isDarkOverview ? "font-bold text-[#065F46] dark:text-[#10B981]" : "font-bold text-[var(--brand)]"
                        : isDarkOverview ? "font-medium text-[#4B5563] group-hover:text-[#17191D] dark:text-[#C2C8CF] dark:group-hover:text-white" : "font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item.mobileLabel || item.label}
                  </span>
                  {active && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 shrink-0 ${
                        isDarkOverview ? "bg-[#065F46] dark:bg-[#10B981]" : "bg-[var(--brand)]"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}

            {/* "Mais" button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mais opções de navegação"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              className={`group flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-0.5 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl ${
                isMoreButtonActive
                  ? isDarkOverview ? "text-[#065F46] dark:text-[#10B981]" : "text-[var(--brand)]"
                  : isDarkOverview ? "text-[#4B5563] hover:text-[#17191D] dark:text-[#C2C8CF] dark:hover:text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div
                className={`px-3 py-1 rounded-full relative flex items-center justify-center shrink-0 transition-all duration-150 ${
                  isMoreButtonActive
                    ? isDarkOverview
                      ? "bg-emerald-500/15 text-[#065F46] dark:text-[#10B981] border border-emerald-500/30 shadow-xs"
                      : "bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 shadow-xs"
                    : isDarkOverview
                      ? "border border-transparent group-hover:bg-[#DFE3E8] dark:group-hover:bg-[#1B1D21]"
                      : "border border-transparent group-hover:bg-[var(--surface-hover)]"
                }`}
              >
                <svg
                  className="w-[22px] h-[22px] shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
                {unreadNotificationsCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${isDarkOverview ? "bg-[#065F46] ring-2 ring-[#F9FAFB] dark:bg-[#10B981] dark:ring-[#111215]" : "bg-[var(--brand)] ring-2 ring-[var(--surface)]"}`} />
                )}
              </div>
              <span
                className={`text-[11px] tracking-tight truncate max-w-full leading-none mt-1 text-center shrink-0 transition-colors duration-150 ${
                  isMoreButtonActive
                    ? isDarkOverview ? "font-bold text-[#065F46] dark:text-[#10B981]" : "font-bold text-[var(--brand)]"
                    : isDarkOverview ? "font-medium text-[#4B5563] group-hover:text-[#17191D] dark:text-[#C2C8CF] dark:group-hover:text-white" : "font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                }`}
              >
                Mais
              </span>
              {isMoreButtonActive && (
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 shrink-0 ${
                    isDarkOverview ? "bg-[#065F46] dark:bg-[#10B981]" : "bg-[var(--brand)]"
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </nav>
      )}

      {/* =========================================================================
          5. DRAWER MENU (For Mobile & Tablet "Mais" Screen)
          ========================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-label="Mais opções de navegação"
            aria-modal="true"
            className={`relative w-full max-h-[85vh] overflow-y-auto ${
              isDarkOverview
                ? "bg-[#F9FAFB] dark:bg-[#111215] border-t border-[#E5E7EB] dark:border-[#303238] text-[#17191D] dark:text-white"
                : "bg-[var(--surface)] border-t border-[var(--border-default)]"
            } rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom-6 duration-200 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-specular-t`}
          >
            {/* Header Handle & User Account Card */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
              <Link
                href={`/conta/perfil?returnTo=${encodeURIComponent(pathname)}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 min-w-0 group cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-xl py-0.5"
                title="Ver perfil"
              >
                <UserAvatar
                  fullName={identity.fullName}
                  userPublicId={identity.userPublicId}
                  avatarUrl={identity.avatarUrl}
                  hasProfilePhoto={identity.hasProfilePhoto}
                  profilePhotoUpdatedAt={identity.profilePhotoUpdatedAt}
                  shape="circle"
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {identity.fullName}
                    </p>
                    {primaryRoleLabel && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                        {primaryRoleLabel}
                      </span>
                    )}
                  </div>
                  {identity.email && (
<p title={identity.email} className="text-xs text-[var(--text-tertiary)] break-all leading-snug mt-0.5">
                      {identity.email}
                    </p>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center border border-[var(--border-default)] bg-[var(--surface-subtle)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Secondary Navigation Groups (Deduplicated from Bottom Nav) */}
            <div className="space-y-4">
              {/* Group 1: Gestão */}
              {secondaryManagementItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                    Gestão
                  </p>
                  <nav aria-label="Gestão" className="flex flex-col gap-1.5">
                    {secondaryManagementItems.map((item) => {
                      const active = isItemActive(item.href);
                      const description = drawerItemDescriptions[item.id];
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          prefetch={false}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleNavClick(item);
                          }}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[52px] depth-interactive ${
                            active
                              ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                active
                                  ? "bg-[var(--brand)]/15 text-[var(--brand)]"
                                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                              }`}
                            >
                              <NavIcon name={item.iconName} className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 flex flex-col text-left">
                              <span
                                className={`text-[13px] sm:text-sm truncate leading-snug ${
                                  active
                                    ? "font-semibold text-[var(--text-primary)]"
                                    : "font-medium text-[var(--text-primary)]"
                                }`}
                              >
                                {item.label}
                              </span>
                              {description && (
                                <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                                  {description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {active && (
                              <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
                            )}
                            <svg
                              className="w-4 h-4 text-[var(--text-tertiary)] shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Group 2: Negócio */}
              {secondaryBusinessItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                    Negócio
                  </p>
                  <nav aria-label="Negócio" className="flex flex-col gap-1.5">
                    {secondaryBusinessItems.map((item) => {
                      const active = isItemActive(item.href);
                      const description = drawerItemDescriptions[item.id];
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          prefetch={false}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleNavClick(item);
                          }}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[52px] depth-interactive ${
                            active
                              ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                active
                                  ? "bg-[var(--brand)]/15 text-[var(--brand)]"
                                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                              }`}
                            >
                              <NavIcon name={item.iconName} className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 flex flex-col text-left">
                              <span
                                className={`text-[13px] sm:text-sm truncate leading-snug ${
                                  active
                                    ? "font-semibold text-[var(--text-primary)]"
                                    : "font-medium text-[var(--text-primary)]"
                                }`}
                              >
                                {item.label}
                              </span>
                              {description && (
                                <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                                  {description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {active && (
                              <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
                            )}
                            <svg
                              className="w-4 h-4 text-[var(--text-tertiary)] shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Group 3: Sistema */}
              {secondarySystemItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                    Sistema
                  </p>
                  <nav aria-label="Sistema" className="flex flex-col gap-1.5">
                    {secondarySystemItems.map((item) => {
                      const active = isItemActive(item.href);
                      const description = drawerItemDescriptions[item.id];
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          prefetch={false}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleNavClick(item);
                          }}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[52px] depth-interactive ${
                            active
                              ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                active
                                  ? "bg-[var(--brand)]/15 text-[var(--brand)]"
                                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                              }`}
                            >
                              <NavIcon name={item.iconName} className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 flex flex-col text-left">
                              <span
                                className={`text-[13px] sm:text-sm truncate leading-snug ${
                                  active
                                    ? "font-semibold text-[var(--text-primary)]"
                                    : "font-medium text-[var(--text-primary)]"
                                }`}
                              >
                                {item.label}
                              </span>
                              {description && (
                                <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                                  {description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {active && (
                              <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
                            )}
                            <svg
                              className="w-4 h-4 text-[var(--text-tertiary)] shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Group 4: Outros Módulos (Fallback if any item not categorized) */}
              {secondaryOtherItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                    Outros módulos
                  </p>
                  <nav aria-label="Outros módulos" className="flex flex-col gap-1.5">
                    {secondaryOtherItems.map((item) => {
                      const active = isItemActive(item.href);
                      const description = drawerItemDescriptions[item.id];
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          prefetch={false}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleNavClick(item);
                          }}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[52px] depth-interactive ${
                            active
                              ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                active
                                  ? "bg-[var(--brand)]/15 text-[var(--brand)]"
                                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                              }`}
                            >
                              <NavIcon name={item.iconName} className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 flex flex-col text-left">
                              <span
                                className={`text-[13px] sm:text-sm truncate leading-snug ${
                                  active
                                    ? "font-semibold text-[var(--text-primary)]"
                                    : "font-medium text-[var(--text-primary)]"
                                }`}
                              >
                                {item.label}
                              </span>
                              {description && (
                                <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                                  {description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {active && (
                              <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
                            )}
                            <svg
                              className="w-4 h-4 text-[var(--text-tertiary)] shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}
            </div>

            {/* Preferências do usuário */}
            <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                Preferências
              </p>
              <nav aria-label="Preferências do usuário" className="flex flex-col gap-1.5">
                <Link
                  href="/notificacoes"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[52px] depth-interactive ${
                    pathname === "/notificacoes"
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      <svg className="w-5 h-5 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex flex-col text-left">
                      <span className="text-[13px] sm:text-sm font-medium text-[var(--text-primary)] truncate leading-snug">
                        Central de notificações
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                        Alertas, mensagens e avisos
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--brand)] text-[var(--text-inverse)]">
                        {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                      </span>
                    )}
                    <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>

                <Link
                  href={`/consultoria/${consultancySlug}/ajuda`}
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[52px] depth-interactive ${
                    pathname === `/consultoria/${consultancySlug}/ajuda`
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      <HelpCircle className="w-5 h-5 text-[var(--brand)]" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex flex-col text-left">
                      <span className="text-[13px] sm:text-sm font-medium text-[var(--text-primary)] truncate leading-snug">
                        Ajuda & Suporte
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                        Manuais, tutoriais e atendimento
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>

                <Link
                  href={`/conta/seguranca?returnTo=${encodeURIComponent(pathname)}`}
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[52px] depth-interactive ${
                    pathname === "/conta/seguranca"
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      <svg className="w-5 h-5 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex flex-col text-left">
                      <span className="text-[13px] sm:text-sm font-medium text-[var(--text-primary)] truncate leading-snug">
                        Conta e segurança
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                        Senha e dados de acesso
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </nav>
            </div>

            {/* Aparência & Tema */}
            <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
              <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                Aparência
              </span>
              <AppearanceSegmentedControl
                currentTheme={currentTheme}
                onThemeSelect={handleThemeSelect}
                showLabel={false}
              />
            </div>

            {/* Alternar Perfil (se multi-role disponível) */}
            {viewModeState && viewModeState.allowedOptions.length > 1 && (
              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <ViewModeSelector
                  consultancySlug={consultancySlug}
                  effectiveMode={viewModeState.effectiveMode}
                  defaultMode={viewModeState.defaultMode}
                  allowedOptions={viewModeState.allowedOptions}
                  onSelect={() => setMobileMenuOpen(false)}
                />
              </div>
            )}

            {/* Ações de Conta */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <Link
                href="/selecionar-consultoria"
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-3 px-4 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-all min-h-[48px] shadow-2xs depth-interactive"
              >
                Trocar consultoria
              </Link>
              <LogoutButton
                logoutAction={logoutFromConsultancyArea}
                className="flex items-center justify-center w-full py-3 px-4 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--danger-foreground)] bg-[var(--surface-subtle)] hover:bg-[var(--danger-soft)] border border-[var(--border-default)] hover:border-[var(--danger-border)] rounded-xl transition-all cursor-pointer min-h-[48px] depth-interactive"
              >
                Sair da conta
              </LogoutButton>
            </div>
          </div>
        </div>
      )}

      {/* First Access Guided Tutorial */}
      <FirstAccessTutorial
        consultancyName={consultancyName}
      />
    </>
  );
}
