import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getMyProfile, computeEffectiveUsername } from "@/lib/account/user-profile";
import { PageHeader } from "@/components/ui/page-header";
import { UserProfileForm } from "@/components/account/user-profile-form";

export const metadata = {
  title: "Meu Perfil | Trevo One",
  description: "Gerencie seu nome de usuário e foto de perfil no Trevo One.",
};

export default async function AccountProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await getMyProfile(
    session.userId,
    session.userPublicId,
    session.fullName,
    session.email
  );

  const safeProfile = profile || {
    userId: session.userId,
    userPublicId: session.userPublicId,
    fullName: session.fullName,
    email: session.email,
    customUsername: null,
    effectiveUsername: computeEffectiveUsername(session.userPublicId),
    hasProfilePhoto: false,
    profilePhotoMime: null,
    profilePhotoSizeBytes: null,
    profilePhotoUpdatedAt: null,
  };

  return (
    <main className="min-h-dvh w-full bg-[var(--background)] text-[var(--text-primary)] p-4 sm:p-6 lg:p-8 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2">
          <Link
            href="/selecionar-consultoria"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-[var(--brand)] rounded-md px-1 py-0.5 -ml-1"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Voltar ao seletor de ambientes</span>
          </Link>
        </div>

        {/* Page Header */}
        <PageHeader
          title="Meu Perfil"
          description="Personalize seu nome de usuário (@username) e sua foto de perfil no Trevo One."
        />

        {/* Profile Management Form */}
        <UserProfileForm initialProfile={safeProfile} />
      </div>
    </main>
  );
}
