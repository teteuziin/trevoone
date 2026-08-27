import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { listPlatformConsultancies } from "@/lib/platform-admin/consultancies";
import { Button } from "@/components/ui/button";
import { ChargeForm } from "./charge-form";

type PageProps = {
  searchParams: Promise<{
    consultancy?: string;
  }>;
};

export default async function NewPlatformChargePage({ searchParams }: PageProps) {
  const { consultancy } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const consultancies = await listPlatformConsultancies();

  return (
    <div className="w-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/cobranca-plataforma">
            <Button variant="outline" size="sm">
              ← Voltar para Cobrança
            </Button>
          </Link>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
              EMISSÃO DE FATURA
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Emitir Cobrança para Consultoria
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Gere uma fatura avulsa ou mensal para uma consultoria parceira com vencimento e prazo de carência oficial.
            </p>
          </div>

          <ChargeForm
            consultancies={consultancies.map((c) => ({
              publicId: c.publicId,
              name: c.name,
              slug: c.slug,
            }))}
            defaultConsultancyPublicId={consultancy}
          />
        </div>
      </div>
    </div>
  );
}
