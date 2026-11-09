import React from "react";
import { PlatformAdminNavigation } from "./platform-admin-navigation";
import { DashboardWallpaper } from "@/components/dashboard/dashboard-wallpaper";

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
    <div className="relative min-h-svh w-full max-w-full min-w-0 bg-transparent text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)] transition-colors">
      <DashboardWallpaper offsetSidebar={false} />
      <PlatformAdminNavigation
        userName={userName}
        userEmail={userEmail}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Content Area with Bottom Offset for Mobile Hotbar */}
      <main className={`relative z-10 flex-1 w-full min-w-0 max-w-full pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 lg:pb-10 print:pb-0 ${className}`.trim()}>
        {children}
      </main>
    </div>
  );
}
