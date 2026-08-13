"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SplashRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Temporary redirect until session-based routing is implemented.
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 1300);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
