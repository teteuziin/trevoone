"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { NutritionTemplatesModal } from "./nutrition-templates-modal";

interface NutritionTemplatesButtonProps {
  consultancySlug: string;
}

export function NutritionTemplatesButton({ consultancySlug }: NutritionTemplatesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => setIsOpen(true)}
        className="font-semibold min-h-[44px] gap-2 border-[var(--border-default)] hover:bg-[var(--surface-hover)] shadow-2xs text-xs sm:text-sm"
      >
        <svg
          className="w-4 h-4 text-[var(--text-secondary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span>Modelos</span>
      </Button>

      <NutritionTemplatesModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        consultancySlug={consultancySlug}
      />
    </>
  );
}
