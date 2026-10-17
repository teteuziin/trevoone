import React from "react";

/**
 * TREVO ONE — DASHBOARD WALLPAPER COMPONENT
 *
 * Aplica os quatro papéis de parede aprovados exclusivamente na área principal
 * das telas Treinador e Administração, respeitando a barra lateral (sidebar)
 * no desktop (left-64) e preenchendo a viewport visível sem distorção nem repetição.
 *
 * Seleção automática 100% via CSS / media queries:
 * - Tema claro + formato horizontal: wallpaper-light-desktop.webp
 * - Tema claro + formato vertical: wallpaper-light-mobile.webp
 * - Tema escuro + formato horizontal: wallpaper-dark-desktop.webp
 * - Tema escuro + formato vertical: wallpaper-dark-mobile.webp
 *
 * Camada 100% decorativa (pointer-events: none, z-0, aria-hidden: true).
 */
export function DashboardWallpaper() {
  return (
    <div
      data-trevo-dashboard-wallpaper="true"
      className="pointer-events-none fixed inset-0 lg:left-64 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      <div className="trevo-dashboard-wallpaper w-full h-full" />
    </div>
  );
}
