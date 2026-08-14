import Link from "next/link";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { ConsultancyAdminNavigation } from "./consultancy-admin-navigation";
import { logoutFromConsultancyArea } from "@/app/selecionar-consultoria/actions";

interface ConsultancyAdminShellProps {
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl: string | null;
  currentSection: "overview" | "members";
  children: React.ReactNode;
}

export function ConsultancyAdminShell({
  consultancyName,
  consultancySlug,
  consultancyLogoUrl,
  currentSection,
  children,
}: ConsultancyAdminShellProps) {
  return (
    <div className="min-h-svh w-full bg-zinc-50/60 text-zinc-900 flex flex-col selection:bg-[#00A859]/10 selection:text-[#00A859]">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-zinc-200 sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Branding */}
            <div className="flex items-center gap-3 min-w-0">
              <ConsultancyLogo
                logoUrl={consultancyLogoUrl}
                name={consultancyName}
                size={40}
              />
              <div className="space-y-0.5 min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-zinc-900 truncate leading-tight">
                  {consultancyName}
                </h1>
                <p className="text-xs text-zinc-500 font-normal truncate leading-tight">
                  Administração da consultoria
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/selecionar-consultoria"
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                Trocar ambiente
              </Link>
              <form action={logoutFromConsultancyArea}>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>

          {/* Navigation bar */}
          <ConsultancyAdminNavigation
            slug={consultancySlug}
            currentSection={currentSection}
          />
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
    </div>
  );
}
