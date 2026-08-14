import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  resolveConsultancyContext,
  ROLE_LABELS,
} from "@/lib/consultancies/context";
import { getConsultancyAdminOverview } from "@/lib/consultancies/admin";
import { getStudentOnboardingStatus } from "@/lib/consultancies/student-onboarding";
import { ConsultancyAdminShell } from "@/components/consultancies/consultancy-admin-shell";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { logoutFromConsultancyArea } from "../../selecionar-consultoria/actions";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ConsultancyPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  // Se o usuário possui CONSULTANCY_ADMIN na consultoria
  if (isConsultancyAdmin) {
    const overview = await getConsultancyAdminOverview(context.consultancyId);

    const metrics = [
      {
        id: "active_members",
        title: "Membros ativos",
        value: overview.activeMembers,
        description: "Usuários com acesso ativo à consultoria",
      },
      {
        id: "students",
        title: "Alunos",
        value: overview.students,
        description: "Cadastrados com papel de aluno",
      },
      {
        id: "personals",
        title: "Personais",
        value: overview.personals,
        description: "Treinadores e profissionais de treino",
      },
      {
        id: "nutritionists",
        title: "Nutricionistas",
        value: overview.nutritionists,
        description: "Profissionais de nutrição e dieta",
      },
      {
        id: "admins",
        title: "Administradores",
        value: overview.admins,
        description: "Gestores com acesso administrativo",
      },
    ];

    return (
      <ConsultancyAdminShell
        consultancyName={context.consultancyName}
        consultancySlug={context.consultancySlug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        currentSection="overview"
      >
        <div className="space-y-6">
          {/* Header section */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Visão geral
            </h2>
            <p className="text-sm text-zinc-500 font-normal">
              Acompanhe as métricas e a estrutura de membros da sua consultoria.
            </p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-2"
              >
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {metric.title}
                </p>
                <p className="text-3xl font-bold text-zinc-900 tracking-tight">
                  {metric.value}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {metric.description}
                </p>
              </div>
            ))}
          </div>

          {/* Quick link to Members */}
          <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-900">
                Diretório de Membros
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500">
                Consulte todos os alunos, profissionais e administradores vinculados à consultoria.
              </p>
            </div>
            <Link
              href={`/consultoria/${context.consultancySlug}/membros`}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
            >
              Ver membros
            </Link>
          </div>
        </div>
      </ConsultancyAdminShell>
    );
  }

  // Se for membro STUDENT
  const isStudent = context.roles.includes("STUDENT");
  const isPersonal = context.roles.includes("PERSONAL");
  const studentOnboarding = isStudent
    ? await getStudentOnboardingStatus(session.userId, slug)
    : null;

  // Se for membro válido comum (STUDENT, PERSONAL, NUTRITIONIST sem CONSULTANCY_ADMIN)
  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[480px] mx-auto flex flex-col items-center space-y-6 sm:space-y-8 text-center">
        <div className="w-[130px] sm:w-[150px] shrink-0">
          <TrevoOneLogo priority size={150} />
        </div>

        <div className="w-full space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#00A859] border border-emerald-200">
            Acesso Confirmado
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {context.consultancyName}
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Seu ambiente de consultoria está pronto para acesso.
          </p>
        </div>

        {/* Card de Onboarding para STUDENT */}
        {isStudent && studentOnboarding && studentOnboarding.applicable && (
          <div className="w-full p-5 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Onboarding
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  studentOnboarding.isComplete
                    ? "bg-emerald-50 text-[#00A859] border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {studentOnboarding.isComplete
                  ? "Concluído"
                  : `${studentOnboarding.confirmedRequirements} de ${studentOnboarding.totalRequirements} confirmadas`}
              </span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {studentOnboarding.isComplete
                ? "Todas as etapas obrigatórias de onboarding foram confirmadas."
                : "Preencha os formulários obrigatórios para liberar seus acessos de treino e dieta."}
            </p>

            <Link
              href={`/consultoria/${context.consultancySlug}/onboarding`}
              className="inline-flex items-center justify-center w-full py-2 px-4 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-xs rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
            >
              {studentOnboarding.isComplete ? "Ver etapas" : "Continuar onboarding"}
            </Link>
          </div>
        )}

        {/* Módulos do Aluno (Treinos & Nutrição) */}
        {isStudent && studentOnboarding && studentOnboarding.applicable && (
          <div className="w-full space-y-3 text-left">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Seus Módulos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card Treinos */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-900">Treinos</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        studentOnboarding.isComplete
                          ? "bg-emerald-50 text-[#00A859] border border-emerald-200"
                          : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                      }`}
                    >
                      {studentOnboarding.isComplete ? "Liberado" : "Bloqueado"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {studentOnboarding.isComplete
                      ? "Acesse seus treinos e rotinas."
                      : "Conclua o onboarding para liberar."}
                  </p>
                </div>

                <Link
                  href={`/consultoria/${context.consultancySlug}/treinos`}
                  className={`inline-flex items-center justify-center w-full py-1.5 px-3 text-xs font-semibold rounded-lg shadow-2xs transition-all ${
                    studentOnboarding.isComplete
                      ? "bg-[#00A859] hover:bg-[#008f4c] text-white focus:ring-2 focus:ring-[#00A859]"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 focus:ring-2 focus:ring-zinc-400"
                  }`}
                >
                  {studentOnboarding.isComplete ? "Acessar treinos" : "Ver módulo"}
                </Link>
              </div>

              {/* Card Dieta e Nutrição */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-900">Dieta e Nutrição</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        studentOnboarding.isComplete
                          ? "bg-emerald-50 text-[#00A859] border border-emerald-200"
                          : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                      }`}
                    >
                      {studentOnboarding.isComplete ? "Liberado" : "Bloqueado"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {studentOnboarding.isComplete
                      ? "Acesse seus planos alimentares."
                      : "Conclua o onboarding para liberar."}
                  </p>
                </div>

                <Link
                  href={`/consultoria/${context.consultancySlug}/nutricao`}
                  className={`inline-flex items-center justify-center w-full py-1.5 px-3 text-xs font-semibold rounded-lg shadow-2xs transition-all ${
                    studentOnboarding.isComplete
                      ? "bg-[#00A859] hover:bg-[#008f4c] text-white focus:ring-2 focus:ring-[#00A859]"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 focus:ring-2 focus:ring-zinc-400"
                  }`}
                >
                  {studentOnboarding.isComplete ? "Acessar nutrição" : "Ver módulo"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Card Profissional para PERSONAL */}
        {isPersonal && (
          <div className="w-full p-5 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Área do Personal
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#00A859] border border-emerald-200">
                Profissional
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900">
                Biblioteca de Exercícios
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Cadastre e gerencie o catálogo de exercícios para a prescrição de treinos.
              </p>
            </div>

            <Link
              href={`/consultoria/${context.consultancySlug}/personal/exercicios`}
              className="inline-flex items-center justify-center w-full py-2 px-4 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-xs rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
            >
              Acessar biblioteca
            </Link>
          </div>
        )}

        <div className="w-full p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3 text-left">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Seus acessos nesta consultoria
          </h2>
          <div className="flex flex-wrap gap-2">
            {context.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-zinc-200 text-zinc-800 shadow-2xs"
              >
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full space-y-2.5 pt-2">
          <Link
            href="/selecionar-consultoria"
            className="block w-full py-2.5 px-4 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-sm rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
          >
            Minhas consultorias
          </Link>

          <form action={logoutFromConsultancyArea}>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
