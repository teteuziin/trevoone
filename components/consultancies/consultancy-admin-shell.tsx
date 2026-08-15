import React from "react";
import { ConsultancyAppShell } from "./consultancy-app-shell";

export interface ConsultancyAdminShellProps {
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl: string | null;
  currentSection?: "overview" | "members";
  userName?: string;
  userEmail?: string;
  children: React.ReactNode;
}

export function ConsultancyAdminShell({
  consultancyName,
  consultancySlug,
  consultancyLogoUrl,
  userName,
  userEmail,
  children,
}: ConsultancyAdminShellProps) {
  return (
    <ConsultancyAppShell
      consultancyName={consultancyName}
      consultancySlug={consultancySlug}
      consultancyLogoUrl={consultancyLogoUrl}
      roles={["CONSULTANCY_ADMIN"]}
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </ConsultancyAppShell>
  );
}
