import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getFoodDetailsForNutritionist } from "@/lib/consultancies/nutrition";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { NutritionFoodInactivateButton } from "@/components/consultancies/nutrition-food-inactivate-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type PageProps = {
  params: Promise<{
    slug: string;
    foodPublicId: string;
  }>;
};

function formatNumber(val: number, decimals: number = 1): string {
  if (!Number.isFinite(val)) return "0";
  return val.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default async function NutritionistFoodDetailPage({ params }: PageProps) {
  const { slug, foodPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Permissão estrita: apenas NUTRITIONIST
  if (!context.roles.includes("NUTRITIONIST")) {
    redirect(`/consultoria/${slug}`);
  }

  const food = await getFoodDetailsForNutritionist({
    actorUserId: session.userId,
    consultancySlug: slug,
    foodPublicId,
  });

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${context.consultancySlug}/nutricao/alimentos`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar para a biblioteca de alimentos
          </Link>
        </div>

        {!food ? (
          <EmptyState
            title="Alimento não encontrado"
            description="O alimento solicitado não foi encontrado ou não está disponível nesta consultoria."
            action={
              <Link
                href={`/consultoria/${context.consultancySlug}/nutricao/alimentos`}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-colors"
              >
                Voltar à biblioteca
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {food.name}
                  </h1>
                  {food.category && (
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                      {food.category}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {food.sourceType === "EXTERNAL" ? (
                    <Badge variant="neutral">Fonte TACO</Badge>
                  ) : (
                    <Badge variant="neutral">Manual</Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons for MANUAL ACTIVE foods only */}
              {food.sourceType === "MANUAL" && food.status === "ACTIVE" && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <Link
                    href={`/consultoria/${context.consultancySlug}/nutricao/alimentos/${food.publicId}/editar`}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] bg-[var(--surface)] border border-[var(--border-default)] rounded-lg transition-colors"
                  >
                    Editar alimento
                  </Link>
                  <NutritionFoodInactivateButton
                    consultancySlug={context.consultancySlug}
                    foodPublicId={food.publicId}
                    foodName={food.name}
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                Base de cálculo e referência:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {food.referenceAmount} {food.referenceUnit.toLowerCase()}
                </span>{" "}
                de parte comestível.
              </div>
            </div>

            {/* Nutritional Macros Cards */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
                Composição Nutricional (por {food.referenceAmount} {food.referenceUnit.toLowerCase()})
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Calories */}
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Energia
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {Math.round(food.caloriesKcal)}{" "}
                    <span className="text-xs font-normal text-[var(--text-secondary)]">kcal</span>
                  </p>
                </div>

                {/* Protein */}
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Proteína
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {formatNumber(food.proteinG)}{" "}
                    <span className="text-xs font-normal text-[var(--text-secondary)]">g</span>
                  </p>
                </div>

                {/* Carbohydrate */}
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Carboidrato
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {formatNumber(food.carbohydrateG)}{" "}
                    <span className="text-xs font-normal text-[var(--text-secondary)]">g</span>
                  </p>
                </div>

                {/* Fat */}
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Gordura total
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {formatNumber(food.fatG)}{" "}
                    <span className="text-xs font-normal text-[var(--text-secondary)]">g</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Source & Provenance Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Informações da Fonte e Proveniência
              </h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <dt className="text-[var(--text-secondary)]">Tipo de Origem</dt>
                  <dd className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {food.sourceType === "EXTERNAL" ? "Tabela Nutricional Oficial (Externa)" : "Cadastro manual"}
                  </dd>
                </div>

                {food.sourceLabel && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Fonte Oficial</dt>
                    <dd className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {food.sourceLabel}
                    </dd>
                  </div>
                )}

                {food.sourceVersion && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Edição / Versão</dt>
                    <dd className="font-medium text-[var(--text-primary)] mt-0.5">
                      {food.sourceVersion}
                    </dd>
                  </div>
                )}

                {food.sourceExternalCode && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Código na Tabela</dt>
                    <dd className="font-medium text-[var(--text-primary)] mt-0.5 font-mono">
                      #{food.sourceExternalCode}
                    </dd>
                  </div>
                )}
              </dl>

              {food.sourceReference && (
                <div className="pt-3 border-t border-[var(--border-subtle)]">
                  <details className="text-xs text-[var(--text-secondary)] group">
                    <summary className="font-medium cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors select-none">
                      Ver detalhes da referência técnica
                    </summary>
                    <div className="mt-2 p-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-mono text-[11px] break-all">
                      {food.sourceReference}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
