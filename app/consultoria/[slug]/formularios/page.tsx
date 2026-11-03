import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import {
  listConsultancyForms,
  listAssignmentsForAdmin,
  listAssignmentsForStudent,
  listActiveStudentsForForms,
  ensureConsultancyFormsSchema,
} from "@/lib/consultancies/forms";
import { AdminFormsView } from "@/components/consultancies/forms/admin-forms-view";
import { StudentFormsView } from "@/components/consultancies/forms/student-forms-view";

interface FormulariosPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ open?: string }>;
}

export const dynamic = "force-dynamic";

export default async function FormulariosPage({
  params,
  searchParams,
}: FormulariosPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const autoOpenPublicId = sParams.open;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/formularios`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    notFound();
  }

  // Ensure database schema and ETAPA 0 data transition
  await ensureConsultancyFormsSchema();

  const viewModeState = await resolveEffectiveViewMode(slug, context.roles);
  const effectiveMode = viewModeState.effectiveMode;

  const isStaff =
    effectiveMode === "ADMIN" ||
    effectiveMode === "PERSONAL" ||
    effectiveMode === "NUTRITIONIST" ||
    (!context.roles.includes("STUDENT") &&
      context.roles.some((r) =>
        ["CONSULTANCY_ADMIN", "PLATFORM_ADMIN", "PERSONAL", "NUTRITIONIST"].includes(r)
      ));

  if (isStaff) {
    const [forms, assignments, students] = await Promise.all([
      listConsultancyForms(slug, session.userId).catch((err) => {
        console.error("[FormulariosPage] Error listing forms:", err);
        return [];
      }),
      listAssignmentsForAdmin(slug, session.userId).catch((err) => {
        console.error("[FormulariosPage] Error listing assignments:", err);
        return [];
      }),
      listActiveStudentsForForms(slug, session.userId).catch((err) => {
        console.error("[FormulariosPage] Error listing students:", err);
        return [];
      }),
    ]);

    return (
      <ConsultancyAppShell
        consultancySlug={slug}
        consultancyName={context.consultancyName}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        userName={session.fullName}
        userEmail={session.email}
        userPublicId={session.userPublicId}
        hasProfilePhoto={session.hasProfilePhoto}
        profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
        consultancyPublicId={context.consultancyPublicId}
      >
        <AdminFormsView
          consultancySlug={slug}
          initialForms={forms}
          initialAssignments={assignments}
          students={students}
        />
      </ConsultancyAppShell>
    );
  }

  // Student view
  const studentAssignments = await listAssignmentsForStudent(slug, session.userId).catch((err) => {
    console.error("[FormulariosPage] Error listing student assignments:", err);
    return [];
  });

  return (
    <ConsultancyAppShell
      consultancySlug={slug}
      consultancyName={context.consultancyName}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
    >
      <StudentFormsView
        consultancySlug={slug}
        initialAssignments={studentAssignments}
        autoOpenAssignmentPublicId={autoOpenPublicId}
      />
    </ConsultancyAppShell>
  );
}
