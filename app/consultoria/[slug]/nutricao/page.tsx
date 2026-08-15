import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentNutricaoPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);

  if (access.reason === "UNAUTHENTICATED") {
    redirect("/login");
  }

  if (access.reason === "INVALID_CONTEXT" || !access.context) {
    redirect("/selecionar-consultoria");
  }

  if (access.reason === "NOT_STUDENT") {
    redirect(`/consultoria/${access.context.consultancySlug}`);
  }

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <StudentModuleAccessPanel
          moduleType="NUTRITION"
          consultancySlug={access.context.consultancySlug}
          consultancyName={access.context.consultancyName}
          allowed={access.allowed}
          confirmedRequirements={access.confirmedRequirements}
          totalRequirements={access.totalRequirements}
        />
      </div>
    </ConsultancyAppShell>
  );
}
