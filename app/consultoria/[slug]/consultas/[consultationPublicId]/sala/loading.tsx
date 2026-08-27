import React from "react";

export default function ConsultationRoomLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-3 border-[var(--brand)] border-t-transparent animate-spin" />
          <div className="absolute w-8 h-8 rounded-full bg-[var(--brand)]/20 animate-ping" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white tracking-wide">
            Preparando sala de teleconsulta
          </h2>
          <p className="text-xs text-zinc-400">
            Validando permissões e conectando à infraestrutura segura...
          </p>
        </div>
      </div>
    </div>
  );
}
