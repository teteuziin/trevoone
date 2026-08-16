import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { listNutritionFoodsForNutritionist } from "@/lib/consultancies/nutrition";
import { NutritionFoodLibrary } from "@/components/consultancies/nutrition-food-library";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

export default async function NutritionistFoodLibraryPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { q, page } = await searchParams;

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

  const parsedPage = Number(page);
  const validPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const listResult = await listNutritionFoodsForNutritionist({
    actorUserId: session.userId,
    consultancySlug: slug,
    search: q || "",
    page: validPage,
    pageSize: 24,
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
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <NutritionFoodLibrary
          consultancySlug={context.consultancySlug}
          items={listResult.items}
          total={listResult.total}
          page={listResult.page}
          pageSize={listResult.pageSize}
          totalPages={listResult.totalPages}
          searchQuery={q || ""}
        />
      </div>
    </ConsultancyAppShell>
  );
}
