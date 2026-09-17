"use client";

import React, { useState, useMemo } from "react";
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

interface HelpSupportHubProps {
  consultancySlug: string;
  consultancyName: string;
  userRole?: string;
}

interface ActionCard {
  id: string;
  title: string;
  description: string;
  href?: string;
  actionType?: "route" | "offline-modal" | "install-modal" | "tutorial";
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
}: HelpSupportHubProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Support message state
  const [supportName, setSupportName] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);

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
        title: "Como Usar Offline",
        description: "Entenda como acessar seus treinos mesmo sem conexão à internet.",
        actionType: "offline-modal",
        category: "app",
        icon: WifiOff,
        badge: "Dica",
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
    }
  };

  const handleSendSupportMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSent(true);
    setTimeout(() => {
      setSupportSent(false);
      setShowSupportModal(false);
      setSupportMessage("");
    }, 1800);
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
                <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Enviar Mensagem
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                aria-label="Fechar"
                className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supportSent ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" strokeWidth={2} />
                </div>
                <p className="font-heading text-base font-bold text-[var(--text-primary)]">
                  Mensagem enviada com sucesso!
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Nossa equipe retornará o contato o mais breve possível.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSupportMessage} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Seu nome
                  </label>
                  <input
                    type="text"
                    value={supportName}
                    onChange={(e) => setSupportName(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Como podemos te ajudar? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Descreva sua dúvida, sugestão ou dificuldade encontrada..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--brand)] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSupportModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: COMO USAR OFFLINE */}
      {showOfflineModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] p-6 sm:p-7 shadow-2xl space-y-5 text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <WifiOff className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Uso Offline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOfflineModal(false)}
                aria-label="Fechar"
                className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                O Trevo One foi construído com tecnologia PWA para que você consiga treinar mesmo em academias com sinal fraco ou sem internet.
              </p>
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <h4 className="font-bold text-[var(--text-primary)] text-xs">Como funciona:</h4>
                <ul className="space-y-1.5 list-disc list-inside text-xs">
                  <li>Abra o app enquanto ainda estiver conectado para carregar seu treino.</li>
                  <li>Na academia, execute suas séries e registre suas repetições normalmente.</li>
                  <li>Assim que seu celular recuperar sinal, seus dados sincronizam automaticamente.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOfflineModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px]"
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
