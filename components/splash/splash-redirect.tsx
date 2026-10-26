"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export type SplashTarget = "/login" | "/selecionar-consultoria";

interface SplashRedirectProps {
  target?: SplashTarget;
}

export function SplashRedirect({ target = "/login" }: SplashRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    // Warm up the target route during splash animation for instant transition
    try {
      router.prefetch(target);
    } catch {
      // Non-blocking fallback
    }

    const timer = setTimeout(() => {
      router.replace(target);
    }, 1300);

    return () => clearTimeout(timer);
  }, [router, target]);

  return null;
}
