import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentTreinosPage({ params }: PageProps) {
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
    <main className="min-h-svh w-full flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-zinc-50/50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[640px] mx-auto space-y-6">
        <div className="flex items-center justify-between pb-2">
          <div className="w-[120px] sm:w-[130px] shrink-0">
            <TrevoOneLogo priority size={130} />
          </div>
          <span className="text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-3 py-1 rounded-full shadow-2xs">
            {access.context.consultancyName}
          </span>
        </div>

        <StudentModuleAccessPanel
          moduleType="TRAINING"
          consultancySlug={access.context.consultancySlug}
          consultancyName={access.context.consultancyName}
          allowed={access.allowed}
          confirmedRequirements={access.confirmedRequirements}
          totalRequirements={access.totalRequirements}
        />
      </div>
    </main>
  );
}
