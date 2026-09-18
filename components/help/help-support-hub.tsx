"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  SearchIcon as Search,
  DumbbellIcon as Dumbbell,
  UtensilsIcon as Utensils,
  UserPlusIcon as UserPlus,
  CreditCardIcon as CreditCard,
  CalendarIcon as Calendar,
  TrendingUpIcon as TrendingUp,
  UserIcon as User,
  WifiOffIcon as WifiOff,
  DownloadIcon as Download,
  HelpCircleIcon as HelpCircle,
  MessageSquareIcon as MessageSquare,
  ChevronDownIcon as ChevronDown,
  SparklesIcon as Sparkles,
  CheckIcon as Check,
  SendIcon as Send,
  CloseIcon as X,
  SmartphoneIcon as Smartphone,
} from "@/components/ui/icons";

import { sendSupportMessageAction } from "@/app/consultoria/[slug]/ajuda/actions";
import type { SupportRecipientDto } from "@/lib/consultancies/support";

interface HelpSupportHubProps {
  consultancySlug: string;
  consultancyName: string;
  userRole?: string;
  recipients?: SupportRecipientDto[];
  currentUserFullName?: string;
}

interface ActionCard {
  id: string;
  title: string;
  description: string;
  href?: string;
  actionType?: "route" | "offline-modal" | "install-modal" | "tutorial" | "support-modal";
  category: "treino" | "nutricao" | "gestao" | "financeiro" | "app";
  icon: React.ElementType;
  badge?: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    id: "faq-install",
    category: "Instalação",
    question: "Como instalar o Trevo One no celular?",
    answer:
      "No iPhone (Safari), toque no botão de compartilhar (ícone de quadrado com seta para cima) e selecione 'Adicionar à Tela de Início'. No Android (Chrome), toque no menu de 3 pontinhos e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'. O app funcionará em tela cheia como um app nativo.",
  },
  {
    id: "faq-offline",
    category: "Conexão",
    question: "Consigo ver meu treino sem internet na academia?",
    answer:
      "Sim! Suas fichas de treino acessadas recentemente permanecem armazenadas no seu celular. Ao reconectar ao Wi-Fi ou dados móveis, suas anotações e repetições são sincronizadas automaticamente com seu treinador.",
  },
  {
    id: "faq-progresso",
    category: "Evolução",
    question: "Com que frequência devo registrar minhas medidas?",
    answer:
      "Recomendamos registrar peso e medidas a cada 7 a 15 dias, preferencialmente pela manhã em jejum. Dessa forma, seu treinador e nutricionista terão dados consistentes para ajustar suas cargas e cardápio.",
  },
  {
    id: "faq-nutricao",
    category: "Alimentação",
    question: "Como funcionam as opções de substituição no cardápio?",
    answer:
      "Cada refeição prescrita pode conter opções alternativas cadastradas pelo seu nutricionista, com equivalência de macronutrientes calculada para não alterar o seu plano alimentar.",
  },
  {
    id: "faq-seguranca",
    category: "Privacidade",
    question: "Meus dados de saúde e financeiros estão protegidos?",
    answer:
      "Sim, seguimos padrões rigorosos de segurança e LGPD. Suas fotos de evolução, pesos e histórico financeiro são restritos e acessíveis unicamente por você e pelos profissionais autorizados da sua consultoria.",
  },
  {
    id: "faq-suporte",
    category: "Suporte",
    question: "Como falar com meu treinador ou suporte técnico?",
    answer:
      "Você pode entrar em contato diretamente com a equipe através do botão 'Falar com suporte' no rodapé desta página ou agendar uma teleconsulta no menu de Consultas.",
  },
];

export function HelpSupportHub({
  consultancySlug,
  consultancyName,
  userRole = "STUDENT",
  recipients = [],
  currentUserFullName,
}: HelpSupportHubProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Real Support message state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const activeRecipientId =
    selectedRecipientId || (recipients && recipients.length > 0 ? recipients[0].membershipPublicId : "");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportSuccess, setSupportSuccess] = useState<{
    recipientName: string;
    recipientRoleLabel: string;
  } | null>(null);

  // Live Sync Status State (Section 6.18 Central de Sincronização)
  const [syncState, setSyncState] = useState<{
    isSyncing: boolean;
    pendingCount: number;
    lastSyncAt: string | null;
    errorCount: number;
  }>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    errorCount: 0,
  });
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let unsubscribe: (() => void) | null = null;
    import("@/lib/offline/offline-sync").then(({ subscribeToSyncStatus }) => {
      unsubscribe = subscribeToSyncStatus((status) => {
        setSyncState(status);
      });
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    try {
      const { runOfflineSync } = await import("@/lib/offline/offline-sync");
      await runOfflineSync(consultancySlug);
    } catch {
      // Handled via listener
    }
  };

  const formattedLastSync = useMemo(() => {
    if (!syncState.lastSyncAt) return "Nenhuma nesta sessão";
    try {
      const d = new Date(syncState.lastSyncAt);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch {
      return "Recente";
    }
  }, [syncState.lastSyncAt]);

  // Listen for global open support event
  useEffect(() => {
    function handleOpenSupportEvent() {
      setShowSupportModal(true);
    }
    window.addEventListener("trevo:open-support", handleOpenSupportEvent);
    return () => window.removeEventListener("trevo:open-support", handleOpenSupportEvent);
  }, []);

  const actionCards: ActionCard[] = useMemo(
    () => [
      {
        id: "create-workout",
        title: "Criar ou Ver Treinos",
        description: "Acesse suas fichas ativas, monte rotinas e registre cargas.",
        href: `/consultoria/${consultancySlug}/treinos`,
        category: "treino",
        icon: Dumbbell,
        badge: "Fichas",
      },
      {
        id: "create-nutrition",
        title: "Ver ou Criar Cardápio",
        description: "Consulte seu plano alimentar e opções de substituição.",
        href: `/consultoria/${consultancySlug}/planos-v2`,
        category: "nutricao",
        icon: Utensils,
        badge: "Alimentação",
      },
      {
        id: "add-student",
        title: "Adicionar ou Ver Alunos",
        description: "Gerencie matrículas e o perfil dos seus alunos.",
        href: `/consultoria/${consultancySlug}/membros`,
        category: "gestao",
        icon: UserPlus,
        badge: "Equipe",
      },
      {
        id: "view-payments",
        title: "Ver Pagamentos & Faturas",
        description: "Consulte recibos, histórico financeiro e status de planos.",
        href: `/consultoria/${consultancySlug}/financeiro`,
        category: "financeiro",
        icon: CreditCard,
        badge: "Financeiro",
      },
      {
        id: "schedule-consultation",
        title: "Agendar ou Ver Consultas",
        description: "Marque teleconsultas e acompanhe horários com profissionais.",
        href: `/consultoria/${consultancySlug}/consultas`,
        category: "gestao",
        icon: Calendar,
        badge: "Agenda",
      },
      {
        id: "view-progress",
        title: "Acompanhar Evolução",
        description: "Registre peso corporal, medidas físicas e veja seu gráfico.",
        href: `/consultoria/${consultancySlug}/progresso`,
        category: "treino",
        icon: TrendingUp,
        badge: "Resultados",
      },
      {
        id: "edit-profile",
        title: "Alterar Meu Perfil",
        description: "Atualize sua foto, nome, dados pessoais e senha.",
        href: "/conta/perfil",
        category: "app",
        icon: User,
        badge: "Conta",
      },
      {
        id: "use-offline",
        title: "Central de Sincronização & Offline",
        description: "Status dos dados locais, sincronização de treinos e uso sem internet.",
        actionType: "offline-modal",
        category: "app",
        icon: WifiOff,
        badge: "Offline",
      },
      {
        id: "install-app",
        title: "Instalar o Aplicativo",
        description: "Instale o Trevo One no seu celular como app nativo.",
        actionType: "install-modal",
        category: "app",
        icon: Download,
        badge: "PWA",
      },
      {
        id: "replay-tutorial",
        title: "Rever Tutorial Inicial",
        description: "Veja o passo a passo com as principais ferramentas do app.",
        actionType: "tutorial",
        category: "app",
        icon: Sparkles,
        badge: "Guia",
      },
    ],
    [consultancySlug]
  );

  // Filter actions and FAQs based on search
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actionCards;
    const q = searchQuery.toLowerCase();
    return actionCards.filter(
      (card) =>
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        card.category.toLowerCase().includes(q)
    );
  }, [searchQuery, actionCards]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const q = searchQuery.toLowerCase();
    return FAQS.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleActionClick = (card: ActionCard) => {
    if (card.actionType === "offline-modal") {
      setShowOfflineModal(true);
    } else if (card.actionType === "install-modal") {
      setShowInstallModal(true);
    } else if (card.actionType === "tutorial") {
      window.dispatchEvent(new Event("trevo:open-tutorial"));
    } else if (card.actionType === "support-modal") {
      setShowSupportModal(true);
    }
  };

  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSubmittingSupport(true);
    setSupportError(null);

    const chosenRecipient = recipients.find(
      (r) => r.membershipPublicId === activeRecipientId
    );

    const res = await sendSupportMessageAction(consultancySlug, {
      recipientMembershipPublicId: activeRecipientId || undefined,
      targetRole: chosenRecipient?.role,
      subject: supportSubject.trim() || "Dúvida do aluno",
      message: supportMessage.trim(),
    });

    setIsSubmittingSupport(false);

    if (!res.success) {
      setSupportError(res.error || "Não foi possível enviar a mensagem. Tente novamente.");
      return;
    }

    setSupportSuccess({
      recipientName: res.recipientName || "Administração",
      recipientRoleLabel: res.recipientRoleLabel || "Equipe",
    });
    setSupportSubject("");
    setSupportMessage("");
  };

  return (
    <div className="space-y-8 sm:space-y-10 max-w-4xl mx-auto pb-16">
      {/* 1. HERO & SEARCH HEADER */}
      <div className="relative rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] p-6 sm:p-8 lg:p-10 shadow-xs space-y-6 border-specular-t depth-surface">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)]">
              Central de Ajuda
            </span>
            <span className="text-xs text-[var(--text-tertiary)] font-medium">
              {consultancyName}
            </span>
            {userRole && (
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                • Modo {userRole === "STUDENT" ? "Aluno" : userRole === "PERSONAL" ? "Personal" : userRole === "NUTRITIONIST" ? "Nutricionista" : "Gestão"}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
            Como podemos te ajudar hoje?
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
            Encontre atalhos rápidos para suas tarefas, tire dúvidas sobre o aplicativo e descubra como aproveitar ao máximo a sua consultoria.
          </p>
        </div>

        {/* Real-time Search Input */}
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <Search className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O que você quer fazer? (ex: criar treino, usar offline, instalar app)"
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Limpar busca"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. "O QUE VOCÊ QUER FAZER?" — ACTION CARDS HUB */}
      <section className="space-y-4" aria-label="Ações Rápidas">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight font-heading">
              O que você quer fazer?
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Selecione uma tarefa para ir diretamente ao lugar certo
            </p>
          </div>
          <span className="text-xs text-[var(--text-tertiary)] font-medium hidden sm:inline">
            {filteredActions.length} opções
          </span>
        </div>

        {filteredActions.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-center space-y-2">
            <HelpCircle className="w-8 h-8 text-[var(--text-tertiary)] mx-auto" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Nenhuma ação encontrada para &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Tente buscar por termos como treino, cardápio, pagamentos ou fale com o suporte.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredActions.map((card) => {
              const CardIcon = card.icon;
              const content = (
                <div className="h-full p-4.5 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] hover:shadow-xs transition-all flex flex-col justify-between space-y-3 depth-surface group cursor-pointer">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--brand)] flex items-center justify-center group-hover:bg-[var(--brand)] group-hover:text-white transition-colors shadow-2xs">
                        <CardIcon className="w-5 h-5" strokeWidth={1.8} />
                      </div>
                      {card.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                          {card.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-heading text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
                    <span>Acessar</span>
                    <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
                  </div>
                </div>
              );

              if (card.href) {
                return (
                  <Link key={card.id} href={card.href} className="block">
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleActionClick(card)}
                  className="w-full text-left"
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. DÚVIDAS FREQUENTES (FAQ ACCORDION) */}
      <section className="space-y-4" aria-label="Perguntas Frequentes">
        <div className="px-1">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight font-heading">
            Dúvidas Frequentes
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Respostas práticas para as perguntas mais comuns
          </p>
        </div>

        <div className="space-y-2.5">
          {filteredFaqs.map((faq) => {
            const isExpanded = activeFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden transition-all shadow-2xs depth-surface"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isExpanded ? null : faq.id)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[48px] gap-3"
                >
                  <span className="font-heading leading-snug">{faq.question}</span>
                  <div
                    className={`w-6 h-6 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-[var(--brand)]" : ""
                    }`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. CTA SUPORTE & FEEDBACK CARD */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-strong)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs depth-surface">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] flex items-center justify-center shadow-2xs">
              <MessageSquare className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Precisa de ajuda ou tem uma sugestão?
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
            Nossa equipe está pronta para te atender. Envie sua dúvida técnica, sugestão de melhoria ou solicitação de suporte.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-xs transition-all min-h-[44px] depth-interactive cursor-pointer"
          >
            <Send className="w-4 h-4" strokeWidth={1.8} />
            <span>Falar com suporte</span>
          </button>
        </div>
      </div>

      {/* MODAL: SUPORTE / ENVIAR MENSAGEM */}
      {showSupportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] p-6 sm:p-7 shadow-2xl space-y-5 text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    Falar com suporte
                  </h3>
                  {currentUserFullName && (
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      De: {currentUserFullName}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportError(null);
                  setSupportSuccess(null);
                }}
                aria-label="Fechar"
                className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supportSuccess ? (
              <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading text-base font-bold text-[var(--text-primary)]">
                    Solicitação enviada com sucesso!
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                    Sua mensagem foi entregue para <strong className="text-[var(--text-primary)]">{supportSuccess.recipientName}</strong> ({supportSuccess.recipientRoleLabel}).
                  </p>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">
                  Uma notificação foi registrada no painel da consultoria. A equipe responderá diretamente pelo aplicativo.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSupportSuccess(null);
                      setShowSupportModal(false);
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendSupportMessage} className="space-y-4">
                {/* 1. Destinatário */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Com quem você quer falar? *
                  </label>
                  {recipients && recipients.length > 0 ? (
                    <select
                      value={activeRecipientId}
                      onChange={(e) => setSelectedRecipientId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px] cursor-pointer font-medium"
                    >
                      {recipients.map((r) => (
                        <option key={r.membershipPublicId} value={r.membershipPublicId}>
                          {r.roleLabel}: {r.fullName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium">
                      Administração da consultoria
                    </div>
                  )}
                </div>

                {/* 2. Assunto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Assunto *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={120}
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="Ex: Dúvida sobre treino, ajuste de plano..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                  />
                </div>

                {/* 3. Mensagem */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Descreva como podemos ajudar *
                  </label>
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Descreva sua dúvida, sugestão ou dificuldade encontrada..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--brand)] resize-none min-h-[96px]"
                  />
                  <div className="text-[10px] text-[var(--text-tertiary)] text-right">
                    {supportMessage.length}/1000
                  </div>
                </div>

                {supportError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                    {supportError}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isSubmittingSupport}
                    onClick={() => setShowSupportModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSupport}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingSupport ? (
                      <span>Enviando...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar solicitação</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CENTRAL DE SINCRONIZAÇÃO & USO OFFLINE */}
      {showOfflineModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] p-6 sm:p-7 shadow-2xl space-y-5 text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-foreground)] flex items-center justify-center">
                  <WifiOff className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    Central de Sincronização & Offline
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        isOnline ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-amber-500"
                      }`}
                    />
                    <span>{isOnline ? "Conectado à internet" : "Modo Offline (sem internet)"}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfflineModal(false)}
                aria-label="Fechar"
                className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PAINEL DE SINCRONIZAÇÃO */}
            <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                    Pendentes
                  </div>
                  <div
                    className={`text-base font-extrabold mt-0.5 ${
                      syncState.pendingCount > 0 ? "text-amber-500" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {syncState.pendingCount}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                    Com Erro
                  </div>
                  <div
                    className={`text-base font-extrabold mt-0.5 ${
                      syncState.errorCount > 0 ? "text-red-500" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {syncState.errorCount}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                    Status
                  </div>
                  <div className="text-xs font-bold text-[var(--brand)] mt-1">
                    {syncState.isSyncing
                      ? "Enviando..."
                      : syncState.pendingCount > 0
                      ? "Pendente"
                      : "Em dia"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
                <span>Última sincronização:</span>
                <span className="font-semibold text-[var(--text-primary)]">{formattedLastSync}</span>
              </div>

              <button
                type="button"
                disabled={syncState.isSyncing || !isOnline}
                onClick={handleManualSync}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] min-h-[44px] shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {syncState.isSyncing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Sincronizando dados...</span>
                  </>
                ) : !isOnline ? (
                  <span>Conecte-se para sincronizar</span>
                ) : (
                  <span>Sincronizar agora</span>
                )}
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <h4 className="font-bold text-[var(--text-primary)] text-xs">Como funciona o modo offline:</h4>
                <ul className="space-y-1.5 list-disc list-inside text-xs">
                  <li>Seu treino e plano alimentar ativos são preparados automaticamente quando online.</li>
                  <li>Na academia, execute suas séries e marque repetições e cargas normalmente.</li>
                  <li>Seus dados ficam protegidos no seu aparelho até a reconexão.</li>
                  <li>Assim que o celular recuperar sinal, a sincronização é realizada automaticamente.</li>
                </ul>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOfflineModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] cursor-pointer shadow-xs"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMO INSTALAR O APP */}
      {showInstallModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] p-6 sm:p-7 shadow-2xl space-y-5 text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Instalar o Aplicativo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                aria-label="Fechar"
                className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                <h4 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <span>No iPhone (iOS / Safari)</span>
                </h4>
                <ol className="space-y-1 list-decimal list-inside text-xs">
                  <li>Abra o Trevo One no Safari.</li>
                  <li>Toque no botão <strong>Compartilhar</strong> (ícone do meio inferior).</li>
                  <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                <h4 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <span>No Android (Chrome)</span>
                </h4>
                <ol className="space-y-1 list-decimal list-inside text-xs">
                  <li>Abra o Trevo One no Google Chrome.</li>
                  <li>Toque nos <strong>3 pontinhos</strong> no canto superior direito.</li>
                  <li>Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px]"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
