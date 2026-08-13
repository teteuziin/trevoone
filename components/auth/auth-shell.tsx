import { ReactNode } from "react";
import { TrevoOneLogo } from "../brand/trevo-one-logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[420px] mx-auto sm:my-auto flex flex-col items-center space-y-6 sm:space-y-8">
        {/* Logo Header */}
        <div className="w-[130px] sm:w-[150px] shrink-0 transition-all duration-300">
          <TrevoOneLogo priority size={150} />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center space-y-2 w-full px-2 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h1>
          <p className="text-sm text-zinc-500 font-normal leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Content Box */}
        <div className="w-full px-2 sm:px-0 shrink-0">{children}</div>
      </div>
    </main>
  );
}
