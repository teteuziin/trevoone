import React from "react";
import { PlatformAdminNavigation } from "./platform-admin-navigation";

export interface PlatformAdminShellProps {
  userName?: string;
  userEmail?: string;
  unreadNotificationsCount?: number;
  className?: string;
  children: React.ReactNode;
}

export function PlatformAdminShell({
  userName,
  userEmail,
  unreadNotificationsCount = 0,
  className = "",
  children,
}: PlatformAdminShellProps) {
  return (
    <div className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)] transition-colors">
      <PlatformAdminNavigation
        userName={userName}
        userEmail={userEmail}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Content Area with Bottom Offset for Mobile Hotbar */}
      <main className={`flex-1 w-full pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 lg:pb-10 print:pb-0 ${className}`.trim()}>
        {children}
      </main>
    </div>
  );
}
