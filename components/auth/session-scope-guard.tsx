"use client";

import { useEffect, useRef } from "react";
import {
  getOfflineActiveContext,
  saveOfflineActiveContext,
} from "@/lib/offline/offline-context";
import {
  clearAllAuthenticatedOfflineData,
  clearOfflineDataForScope,
} from "@/lib/offline/offline-db";
import { recoverOrphanSyncingOperations } from "@/lib/offline/offline-sync";
import { runStorageMaintenance } from "@/lib/offline/offline-retention";

export interface SessionScopeGuardProps {
  userPublicId?: string;
  userName?: string;
  consultancyPublicId?: string;
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  role?: string;
}

/**
 * SessionScopeGuard
 *
 * Runs once at boot of authenticated consultancy layouts.
 * Compares authenticated session vs local offline_context:
 * - If different userPublicId: purges all private offline data from device.
 * - If different consultancy: purges data for previous consultancy scope.
 * - Saves/refreshes valid offline active context.
 * - Recovers any orphan operations stuck in SYNCING.
 * - Runs storage retention maintenance.
 */
export function SessionScopeGuard({
  userPublicId,
  userName = "Usuário",
  consultancyPublicId,
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  role = "STUDENT",
}: SessionScopeGuardProps) {
  const isGuardingRef = useRef(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !userPublicId ||
      userPublicId === "student" ||
      isGuardingRef.current
    ) {
      return;
    }

    const activeUserPublicId = userPublicId;
    const activeRole = (role || "STUDENT").trim().toUpperCase();
    isGuardingRef.current = true;

    async function evaluateSessionScope() {
      try {
        const storedContext = await getOfflineActiveContext();

        if (storedContext) {
          // Check 1: Different user -> purge all private offline data immediately
          if (
            storedContext.userPublicId &&
            storedContext.userPublicId !== activeUserPublicId
          ) {
            await clearAllAuthenticatedOfflineData();
          }
          // Check 2: Same user, but different consultancy -> purge prior consultancy scope
          else if (
            storedContext.consultancyPublicId &&
            consultancyPublicId &&
            storedContext.consultancyPublicId !== consultancyPublicId
          ) {
            await clearOfflineDataForScope(
              storedContext.userPublicId,
              storedContext.consultancyPublicId,
              storedContext.role
            );
          }
          // Check 3: Same user & consultancy, but different role -> purge prior role scope
          else if (
            storedContext.role &&
            activeRole &&
            storedContext.role.trim().toUpperCase() !== activeRole
          ) {
            await clearOfflineDataForScope(
              storedContext.userPublicId,
              storedContext.consultancyPublicId,
              storedContext.role
            );
          }
        }

        // Launch Core offline is strictly STUDENT.
        // If current session role is NOT STUDENT:
        // 1. Explicitly purge any previous STUDENT scope snapshots for this user + consultancy
        // 2. Do not enable Student Offline 360 features (do not recover student sync / run student retention)
        if (activeRole !== "STUDENT" && consultancyPublicId) {
          await clearOfflineDataForScope(
            activeUserPublicId,
            consultancyPublicId,
            "STUDENT"
          );
        }

        if (consultancyPublicId) {
          // Establish or refresh active context for current validated session
          await saveOfflineActiveContext({
            userPublicId: activeUserPublicId,
            userName,
            consultancyPublicId,
            consultancySlug,
            consultancyName,
            consultancyLogoUrl,
            role: activeRole,
          });

          // Only student participates in pending sync & retention maintenance
          if (activeRole === "STUDENT") {
            // Recover orphan SYNCING operations
            await recoverOrphanSyncingOperations();

            // Storage retention check (LRU max 5 snapshots, persistent storage)
            await runStorageMaintenance(activeUserPublicId, consultancyPublicId, activeRole);
          }
        }
      } catch (err) {
        console.warn("[SessionScopeGuard] Error evaluating session scope:", err);
      }
    }

    evaluateSessionScope();
  }, [
    userPublicId,
    userName,
    consultancyPublicId,
    consultancySlug,
    consultancyName,
    consultancyLogoUrl,
    role,
  ]);

  return null;
}
