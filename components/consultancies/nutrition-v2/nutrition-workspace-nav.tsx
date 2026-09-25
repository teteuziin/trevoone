"use client";

import React from "react";
import Link from "next/link";
import { NutritionTemplatesButton } from "./nutrition-templates-button";

interface NutritionWorkspaceNavProps {
  slug: string;
  activeTab: "planos" | "prontuario" | "alimentos";
}

export function NutritionWorkspaceNav({
  slug,
  activeTab,
}: NutritionWorkspaceNavProps) {
  const tabs = [
    {
      id: "planos",
      label: "Planos Alimentares",
      href: `/consultoria/${slug}/planos-v2`,
    },
    {
      id: "prontuario",
      label: "Pacientes & Prontuários",
      href: `/consultoria/${slug}/planos-v2/prontuario`,
    },
    {
      id: "alimentos",
      label: "Biblioteca de Alimentos",
      href: `/consultoria/${slug}/alimentos-v2`,
    },
  ] as const;

  return (
    <div className="w-full border-b border-[var(--border-default)] bg-[var(--surface)] mb-6">
      <div className="flex items-center justify-between gap-4 py-2.5 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1.5 shrink-0" aria-label="Navegação Nutricional">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                  isActive
                    ? "bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-soft-border)] shadow-2xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <NutritionTemplatesButton consultancySlug={slug} />
        </div>
      </div>
    </div>
  );
}
