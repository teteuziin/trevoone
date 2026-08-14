import Link from "next/link";

interface ConsultancyAdminNavigationProps {
  slug: string;
  currentSection: "overview" | "members";
}

export function ConsultancyAdminNavigation({
  slug,
  currentSection,
}: ConsultancyAdminNavigationProps) {
  const functionalItems = [
    {
      id: "overview",
      label: "Visão geral",
      href: `/consultoria/${slug}`,
      active: currentSection === "overview",
    },
    {
      id: "members",
      label: "Membros",
      href: `/consultoria/${slug}/membros`,
      active: currentSection === "members",
    },
  ];

  const upcomingItems = [
    "Alunos",
    "Profissionais",
    "Treinos",
    "Nutrição",
    "Financeiro",
    "Configurações",
  ];

  return (
    <nav aria-label="Navegação administrativa" className="w-full border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 px-1 text-sm">
        {functionalItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              item.active
                ? "bg-emerald-50 text-[#008f4c] font-semibold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        ))}

        {upcomingItems.map((item) => (
          <span
            key={item}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 font-normal cursor-not-allowed select-none"
          >
            {item}
            <span className="text-[10px] font-medium bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded">
              Em breve
            </span>
          </span>
        ))}
      </div>
    </nav>
  );
}
