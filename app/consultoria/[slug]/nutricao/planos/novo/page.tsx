import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { listActiveStudentsForNutritionist } from "@/lib/consultancies/nutrition";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { NutritionPlanCreateForm } from "@/components/consultancies/nutrition-plan-create-form";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NewNutritionPlanPage({ params }: PageProps) {
  const { slug } = await params;

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

  const students = await listActiveStudentsForNutritionist({
    actorUserId: session.userId,
    consultancySlug: slug,
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
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="space-y-1">
          <Link
            href={`/consultoria/${slug}/nutricao/planos`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar aos planos alimentares
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Plano Alimentar</h1>
          <p className="text-sm text-slate-500">
            Inicie um novo rascunho de plano alimentar para um aluno ativo da sua consultoria.
          </p>
        </div>

        {/* Create Form */}
        <NutritionPlanCreateForm slug={slug} students={students} />
      </div>
    </ConsultancyAppShell>
  );
}
