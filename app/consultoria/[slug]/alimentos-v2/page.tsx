import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext, type AccessibleConsultancy } from "@/lib/consultancies/context";
import { resolveNutritionAccessContext, type NutritionAccessContext } from "@/lib/nutrition-v2/access";
import {
  listUnifiedFoodsForNutritionist,
  FoodLibraryQueryError,
  FoodLibraryQueryCountError,
  FoodLibraryQuerySelectError,
  FoodLibraryQueryOrderError,
  FoodLibraryQueryPortionsError,
  FoodLibraryQueryUnknownError,
  FoodLibraryMappingError,
  type ListFoodsResult,
  type FoodSourceTab,
} from "@/lib/nutrition-v2/food-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { NutritionistFoodLibrary } from "@/components/consultancies/nutrition-v2/nutritionist-food-library";
import { NutritionWorkspaceNav } from "@/components/consultancies/nutrition-v2/nutrition-workspace-nav";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type SafeDiagnosticCode =
  | "FOOD_LIB_CONTEXT"
  | "FOOD_LIB_AUTH"
  | "FOOD_LIB_QUERY"
  | "FOOD_LIB_QUERY_COUNT"
  | "FOOD_LIB_QUERY_SELECT"
  | "FOOD_LIB_QUERY_ORDER"
  | "FOOD_LIB_QUERY_PORTIONS"
  | "FOOD_LIB_QUERY_UNKNOWN"
  | "FOOD_LIB_MAPPING"
  | "FOOD_LIB_RENDER"
  | "FOOD_LIB_UNKNOWN";

interface DiagnosticPanelProps {
  slug: string;
  code: SafeDiagnosticCode;
  title: string;
  description: string;
  canRetry?: boolean;
}

function FoodLibraryDiagnosticPanel({
  slug,
  code,
  title,
  description,
  canRetry = true,
}: DiagnosticPanelProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full max-w-lg mx-auto my-8 p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-sm text-center space-y-5"
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--warning-soft)] border border-[var(--warning-border)] text-[var(--warning-foreground)] mx-auto flex items-center justify-center shadow-2xs">
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono font-bold text-[var(--text-primary)] tracking-wide">
        Código de diagnóstico: {code}
      </div>

      <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
        {canRetry && (
          <Link href={`/consultoria/${slug}/alimentos-v2`} className="block w-full">
            <Button variant="primary" fullWidth size="md" className="font-bold min-h-[44px]">
              Tentar novamente
            </Button>
          </Link>
        )}
        <Link href={`/consultoria/${slug}`} className="block w-full">
          <Button variant="secondary" fullWidth size="md" className="font-semibold min-h-[44px]">
            Voltar ao painel da consultoria
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default async function AlimentosV2Page({ params, searchParams }: PageProps) {
  let slug = "";
  try {
    const resolvedParams = await params;
    slug = typeof resolvedParams.slug === "string" ? resolvedParams.slug.trim() : "";
  } catch {
    slug = "";
  }

  // ------------------------------------------------------------------------
  // STAGE 0: SESSION RESOLUTION
  // ------------------------------------------------------------------------
  let session = null;
  let sessionError = false;
  try {
    session = await getCurrentSession();
  } catch (err: unknown) {
    sessionError = true;
    console.error("[Food Library] Failed resolving session:", err instanceof Error ? err.message : String(err));
  }

  if (sessionError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <FoodLibraryDiagnosticPanel
          slug={slug}
          code="FOOD_LIB_CONTEXT"
          title="Erro de sessão"
          description="Não foi possível verificar a autenticação da sua sessão. Tente fazer login novamente."
        />
      </main>
    );
  }

  if (!session) {
    redirect(`/login?returnUrl=/consultoria/${slug}/alimentos-v2`);
  }

  // ------------------------------------------------------------------------
  // STAGE A: CONTEXT RESOLUTION (resolveNutritionAccessContext)
  // ------------------------------------------------------------------------
  let context: AccessibleConsultancy | null = null;
  let ctx: NutritionAccessContext | null = null;
  let diagnostic: DiagnosticPanelProps | null = null;

  try {
    context = await resolveConsultancyContext(session.userId, slug);
    ctx = await resolveNutritionAccessContext(slug);
  } catch (contextErr: unknown) {
    console.error("[Food Library] Failed at FOOD_LIB_CONTEXT stage:", contextErr instanceof Error ? contextErr.message : String(contextErr));
    diagnostic = {
      slug,
      code: "FOOD_LIB_CONTEXT",
      title: "Erro ao resolver contexto",
      description: "Ocorreu uma instabilidade temporária ao carregar o contexto da sua consultoria.",
    };
  }

  // ------------------------------------------------------------------------
  // STAGE B: AUTHORIZATION VALIDATION
  // ------------------------------------------------------------------------
  if (!diagnostic) {
    if (!ctx || !ctx.canViewNutrition) {
      diagnostic = {
        slug,
        code: "FOOD_LIB_AUTH",
        title: "Acesso não autorizado ao workspace nutricional",
        description: "A visualização da biblioteca profissional de alimentos é restrita a nutricionistas e administradores autorizados.",
        canRetry: false,
      };
    }
  }

  // ------------------------------------------------------------------------
  // STAGE C: DATA QUERY & ROW MAPPING (listUnifiedFoodsForNutritionist)
  // ------------------------------------------------------------------------
  let initialResult: ListFoodsResult | null = null;
  let currentSourceTab: FoodSourceTab = "TREVO_BRASIL";
  if (!diagnostic && ctx) {
    let resolvedSearchParams: { [key: string]: string | string[] | undefined } = {};
    try {
      resolvedSearchParams = (await searchParams) || {};
    } catch {
      resolvedSearchParams = {};
    }

    const rawQuery = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q.trim() : "";
    const query = rawQuery.length > 0 ? rawQuery : undefined;

    const scope: "ALL" | "GLOBAL" | "CONSULTANCY" =
      resolvedSearchParams.scope === "GLOBAL" || resolvedSearchParams.scope === "CONSULTANCY"
        ? resolvedSearchParams.scope
        : "ALL";

    const status: "ACTIVE" | "ARCHIVED" | "ALL" =
      resolvedSearchParams.status === "ARCHIVED" || resolvedSearchParams.status === "ALL"
        ? resolvedSearchParams.status
        : "ACTIVE";

    const rawPage = typeof resolvedSearchParams.page === "string" ? parseInt(resolvedSearchParams.page, 10) : 1;
    const page = !Number.isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;

    const rawTab = typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : typeof resolvedSearchParams.sourceTab === "string"
      ? resolvedSearchParams.sourceTab
      : "TREVO_BRASIL";
    const sourceTab: FoodSourceTab = ["TREVO_BRASIL", "COMMERCIAL", "MY_FOODS", "OTHER_DATABASES"].includes(rawTab)
      ? (rawTab as FoodSourceTab)
      : "TREVO_BRASIL";
    currentSourceTab = sourceTab;

    try {
      initialResult = await listUnifiedFoodsForNutritionist(ctx, {
        query,
        scope,
        status,
        sourceTab,
        page,
        pageSize: 20,
      });
    } catch (queryOrMappingErr: unknown) {
      let diagnosticCode: SafeDiagnosticCode = "FOOD_LIB_QUERY_UNKNOWN";
      let title = "Erro ao consultar alimentos";
      let description = "Ocorreu uma instabilidade na consulta ao catálogo de alimentos.";

      if (queryOrMappingErr instanceof FoodLibraryMappingError) {
        diagnosticCode = "FOOD_LIB_MAPPING";
        title = "Erro no processamento dos alimentos";
        description = "Ocorreu uma inconsistência no processamento dos dados nutricionais retornados.";
      } else if (queryOrMappingErr instanceof FoodLibraryQueryCountError) {
        diagnosticCode = "FOOD_LIB_QUERY_COUNT";
        title = "Erro na contagem de alimentos";
        description = "Ocorreu uma falha ao determinar a contagem total de itens do catálogo.";
      } else if (queryOrMappingErr instanceof FoodLibraryQueryPortionsError) {
        diagnosticCode = "FOOD_LIB_QUERY_PORTIONS";
        title = "Erro na consulta de porções";
        description = "Ocorreu uma falha ao contabilizar as porções dos alimentos.";
      } else if (queryOrMappingErr instanceof FoodLibraryQueryOrderError) {
        diagnosticCode = "FOOD_LIB_QUERY_ORDER";
        title = "Erro na ordenação dos alimentos";
        description = "Ocorreu uma falha ao ordenar os itens do catálogo.";
      } else if (queryOrMappingErr instanceof FoodLibraryQuerySelectError) {
        diagnosticCode = "FOOD_LIB_QUERY_SELECT";
        title = "Erro na seleção de alimentos";
        description = "Ocorreu uma falha na consulta aos campos do catálogo de alimentos.";
      } else if (queryOrMappingErr instanceof FoodLibraryQueryUnknownError || queryOrMappingErr instanceof FoodLibraryQueryError) {
        diagnosticCode = "FOOD_LIB_QUERY_UNKNOWN";
        title = "Erro na consulta de alimentos";
        description = "Ocorreu uma instabilidade na execução da consulta de alimentos.";
      }

      console.error(`[Food Library] Failed at ${diagnosticCode} stage:`, queryOrMappingErr instanceof Error ? queryOrMappingErr.message : String(queryOrMappingErr));

      diagnostic = {
        slug,
        code: diagnosticCode,
        title,
        description,
      };
    }
  }

  // ------------------------------------------------------------------------
  // STAGE D: RENDER PROPS & PAGE RENDER
  // ------------------------------------------------------------------------
  if (diagnostic) {
    if (context || ctx) {
      return (
        <ConsultancyAppShell
          consultancyName={context?.consultancyName || ctx?.consultancySlug || slug}
          consultancySlug={context?.consultancySlug || ctx?.consultancySlug || slug}
          consultancyLogoUrl={context?.consultancyLogoUrl}
          roles={context?.roles || ctx?.roles || []}
          userName={session.fullName}
          userEmail={session.email}
        >
          <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
            {diagnostic.code !== "FOOD_LIB_AUTH" && <NutritionWorkspaceNav slug={slug} activeTab="alimentos" />}
            <FoodLibraryDiagnosticPanel
              slug={diagnostic.slug}
              code={diagnostic.code}
              title={diagnostic.title}
              description={diagnostic.description}
              canRetry={diagnostic.canRetry}
            />
          </div>
        </ConsultancyAppShell>
      );
    }

    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <FoodLibraryDiagnosticPanel
          slug={diagnostic.slug}
          code={diagnostic.code}
          title={diagnostic.title}
          description={diagnostic.description}
          canRetry={diagnostic.canRetry}
        />
      </main>
    );
  }

  if (!initialResult || !ctx) {
    return (
      <ConsultancyAppShell
        consultancyName={context?.consultancyName || ctx?.consultancySlug || slug}
        consultancySlug={context?.consultancySlug || ctx?.consultancySlug || slug}
        consultancyLogoUrl={context?.consultancyLogoUrl}
        roles={context?.roles || ctx?.roles || []}
        userName={session.fullName}
        userEmail={session.email}
      >
        <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
          <FoodLibraryDiagnosticPanel
            slug={slug}
            code="FOOD_LIB_UNKNOWN"
            title="Erro inesperado"
            description="Não foi possível concluir o carregamento da biblioteca de alimentos."
          />
        </div>
      </ConsultancyAppShell>
    );
  }

  return (
    <ConsultancyAppShell
      consultancyName={context?.consultancyName || ctx.consultancySlug || slug}
      consultancySlug={context?.consultancySlug || ctx.consultancySlug || slug}
      consultancyLogoUrl={context?.consultancyLogoUrl}
      roles={context?.roles || ctx.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
        <NutritionWorkspaceNav slug={slug} activeTab="alimentos" />
        <NutritionistFoodLibrary
          slug={slug}
          initialResult={initialResult}
          initialSourceTab={currentSourceTab}
          canAuthorNutrition={ctx.canAuthorNutrition}
        />
      </div>
    </ConsultancyAppShell>
  );
}
