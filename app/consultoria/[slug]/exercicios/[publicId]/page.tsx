import { notFound, redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getExerciseByIdOrPublicId } from "@/lib/training-v2/exercise-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ConsultancyExerciseForm } from "@/components/consultancies/training-v2/consultancy-exercise-form";

type PageProps = {
  params: Promise<{
    slug: string;
    publicId: string;
  }>;
};

export default async function ConsultancyExerciseDetailPage({ params }: PageProps) {
  const { slug, publicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isProfessional =
    context.roles.includes("PERSONAL") || context.roles.includes("CONSULTANCY_ADMIN");
  if (!isProfessional) {
    redirect(`/consultoria/${slug}`);
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx || !ctx.canAuthorTraining) {
    redirect(`/consultoria/${slug}`);
  }

  const exercise = await getExerciseByIdOrPublicId(ctx, { publicId });
  if (!exercise) {
    notFound();
  }

  const isGlobal = exercise.scope === "GLOBAL";
  let isTenantOwner = false;

  if (!isGlobal) {
    if (ctx.canManageConsultancy || exercise.visibility === "CREATOR_ONLY") {
      isTenantOwner = true;
    } else {
      const conn = await getDbConnection();
      try {
        const [rows] = await conn.execute<RowDataPacket[]>(
          `SELECT created_by_membership_id FROM exercises WHERE public_id = ? LIMIT 1;`,
          [publicId]
        );
        isTenantOwner = Boolean(
          rows && rows.length > 0 && ctx.membershipId && Number(rows[0].created_by_membership_id) === ctx.membershipId
        );
      } finally {
        conn.release();
      }
    }
  }

  // Determine view mode
  // If global: read-only view
  // If consultancy shared and not owner: read-only view
  // If owner or admin: edit mode
  const mode = isGlobal || !isTenantOwner ? "view" : "edit";
  const canEdit = isTenantOwner;

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
        <PageHeader
          title={exercise.name}
          description={
            isGlobal
              ? "Exercício do acervo oficial Trevo One. Disponível para consulta e prescrição em treinos."
              : isTenantOwner
              ? "Edite os detalhes, gerencie fotos e vídeos e controle a visibilidade do exercício."
              : "Exercício compartilhado na consultoria. Disponível para prescrição nos seus treinos."
          }
          backHref={`/consultoria/${slug}/exercicios`}
          backLabel="Voltar para a Biblioteca"
          actions={
            <div className="flex items-center gap-2">
              {isGlobal ? (
                <Badge variant="brand" size="sm" className="font-bold">
                  Trevo One Oficial • Somente Leitura
                </Badge>
              ) : exercise.visibility === "CONSULTANCY" ? (
                <Badge variant="info" size="sm" className="font-bold">
                  Compartilhado na Consultoria
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" className="font-bold">
                  Privado • Só para mim
                </Badge>
              )}
            </div>
          }
        />

        <ConsultancyExerciseForm
          slug={slug}
          consultancyPublicId={context.consultancyPublicId}
          mode={mode}
          initialData={exercise}
          canEdit={canEdit}
        />
      </div>
    </ConsultancyAppShell>
  );
}
