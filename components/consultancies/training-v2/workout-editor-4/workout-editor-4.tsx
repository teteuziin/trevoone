"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  WorkoutRootDto,
  WorkoutVersionDto,
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
  ExerciseItemDto,
} from "@/lib/training-v2/types";
import type { WorkoutVersionSummaryDto } from "@/lib/training-v2/workout-repository";
import { parseRepsInput } from "@/lib/training-v2/reps-normalizer";
import type {
  AutoSaveStatus,
  EditorStudentInfo,
  ActiveDrawerType,
  ActiveInsertTarget,
} from "./types";
import {
  updateWorkoutDraftMetadataAction,
  addBlockToDraftAction,
  updateBlockTitleAction,
  batchUpdateBlockTitlesAction,
  duplicateBlockAction,
  removeBlockAction,
  addExerciseItemToBlockAction,
  deleteExerciseAction,
  duplicateExerciseAction,
  reorderItemsAction,
  updateExerciseQuickConfigAction,
  createItemCombinationAction,
  ungroupItemCombinationAction,
  deleteItemCombinationAction,
  reorderItemsInCombinationAction,
  duplicateItemCombinationAction,
  addItemToCombinationAction,
  removeItemFromCombinationAction,
  publishWorkoutAction,
  assignWorkoutVersionAction,
  saveWorkoutAsTemplateAction,
  applyTemplateToExistingDraftAction,
  getActiveStudentByMembershipAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import { EditorHeader } from "./editor-header";
import { DivisionsBar } from "./divisions-bar";
import { DivisionWorkspace } from "./division-workspace";
import { ShortcutsDock } from "./shortcuts-dock";
import { AddItemModal } from "./add-item-modal";
import { ModelsDrawer } from "./models-drawer";
import { AiHelperDrawer } from "./ai-helper-drawer";
import { ReorderDrawer } from "./reorder-drawer";
import { FinalizeDrawer } from "./finalize-drawer";
import { StudentSelectModal } from "./student-select-modal";
import { MethodModal, type MethodType } from "./method-modal";
import { StudentWorkoutRenderer } from "../student-workout-renderer";

export interface WorkoutEditor4Props {
  consultancySlug: string;
  workout: WorkoutRootDto;
  initialVersion: WorkoutVersionDto;
  isDraft: boolean;
  allVersions: WorkoutVersionSummaryDto[];
  isConsultancyAdmin: boolean;
  initialStudentPublicId?: string;
  from?: string;
  isAutoPlaceholderDraft?: boolean;
}

function parseToUtcMs(val: Date | string | number | null | undefined): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  const str = String(val).trim();
  if (!str) return 0;
  const isoStr = str.includes("T") ? str : str.replace(" ", "T");
  const normalized = isoStr.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(isoStr) ? isoStr : isoStr + "Z";
  const ms = new Date(normalized).getTime();
  return isNaN(ms) ? 0 : ms;
}

export function WorkoutEditor4({
  consultancySlug,
  workout,
  initialVersion,
  isDraft,
  initialStudentPublicId,
  from,
  isAutoPlaceholderDraft = false,
}: WorkoutEditor4Props) {
  const router = useRouter();

  // Root states
  const [version, setVersion] = useState<WorkoutVersionDto>(initialVersion);
  const [title, setTitle] = useState<string>(initialVersion.title || workout.title);
  const [blocks, setBlocks] = useState<WorkoutBlockDto[]>(initialVersion.blocks || []);
  const [activeBlockPublicId, setActiveBlockPublicId] = useState<string>(
    initialVersion.blocks?.[0]?.publicId || ""
  );
  const [hasUserMutatedDraft, setHasUserMutatedDraft] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ isOpen: boolean; message: string } | null>(null);

  // Authoritative revision tracker (UTC epoch milliseconds)
  const lastKnownRevisionRef = useRef<number>(
    initialVersion.updatedAt ? parseToUtcMs(initialVersion.updatedAt) : 0
  );

  const syncRevision = useCallback((newTimestamp?: string | Date | number) => {
    if (!newTimestamp) return;
    const ms = parseToUtcMs(newTimestamp);
    if (ms > 0) {
      lastKnownRevisionRef.current = ms;
      setVersion((prev) => ({ ...prev, updatedAt: new Date(ms) }));
    }
  }, []);

  // Sequential mutation coordination queue to avoid concurrent operation races in the same Builder
  const mutationQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const executeCoordinatedMutation = useCallback(
    <T,>(mutationFn: () => Promise<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        mutationQueueRef.current = mutationQueueRef.current
          .then(async () => {
            try {
              const res = await mutationFn();
              resolve(res);
            } catch (err) {
              reject(err);
            }
          })
          .catch(async () => {
            try {
              const res = await mutationFn();
              resolve(res);
            } catch (err) {
              reject(err);
            }
          });
      });
    },
    []
  );

  // Authoritative proof: Combines backend persistent database verification with client session mutations
  const isProvenUntouchedAutoPlaceholder = useMemo(() => {
    // 1. Authoritative Backend Check: Backend must have proven in MySQL that this draft was created
    // as an initial untouched auto-placeholder within the active new-workout workflow
    if (!isAutoPlaceholderDraft) return false;

    // 2. Client Session Check: If the user made ANY mutation in this browser session, it is no longer untouched
    if (hasUserMutatedDraft) return false;

    // 3. Client Structure Check: Must still have exactly 1 block with title "Treino A" and 0 items
    if (!blocks || blocks.length !== 1) return false;
    const b = blocks[0];
    if (b.items && b.items.length > 0) return false;
    if (b.subBlocks && b.subBlocks.length > 0) return false;
    if (b.combinations && b.combinations.length > 0) return false;
    const titleStr = (b.title || "").trim().toLowerCase();
    if (titleStr !== "treino a") return false;

    return true;
  }, [isAutoPlaceholderDraft, hasUserMutatedDraft, blocks]);

  // Student context
  const [student, setStudent] = useState<EditorStudentInfo | null>(null);

  // Target combination context (when choosing exercise for a combination slot)
  const [targetCombinationPublicId, setTargetCombinationPublicId] = useState<string | null>(null);

  // Auto-save and drawer management
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("saved");
  const saveStatusRef = useRef(saveStatus);
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerType>(null);
  const [insertTarget, setInsertTarget] = useState<ActiveInsertTarget | null>(null);
  const [activeMethodModal, setActiveMethodModal] = useState<MethodType | null>(null);

  // Sync last edited draft into local device storage
  useEffect(() => {
    if (typeof window !== "undefined" && workout?.publicId && isDraft) {
      try {
        localStorage.setItem(`trevo_last_edited_workout_${consultancySlug}`, workout.publicId);
      } catch {
        // ignore storage errors
      }
    }
  }, [consultancySlug, workout?.publicId, isDraft]);

  const isFromInicio =
    from === "inicio" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("from") === "inicio");

  // Fallback back URL
  const backHref = student
    ? `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`
    : isFromInicio
    ? `/consultoria/${consultancySlug}`
    : `/consultoria/${consultancySlug}/rotinas${workout.isTemplate ? "?tab=templates" : ""}`;

  const handleBack = async () => {
    // 1. Blur any focused active element to ensure onBlur fires immediately
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // 2. Allow blur handlers to synchronously dispatch their updates
    await new Promise((r) => setTimeout(r, 60));

    // 3. If saving is currently in progress, wait briefly for it to complete
    if (saveStatusRef.current === "saving") {
      const start = Date.now();
      while (saveStatusRef.current === "saving" && Date.now() - start < 1200) {
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    // 4. Update last edited workout in local device storage
    if (typeof window !== "undefined" && workout?.publicId && isDraft) {
      try {
        localStorage.setItem(`trevo_last_edited_workout_${consultancySlug}`, workout.publicId);
      } catch {
        // ignore storage errors
      }
    }

    // 5. Navigate deterministically:
    // Determine whether user arrived from Início or from /rotinas
    let target = backHref;
    if (isFromInicio) {
      target = `/consultoria/${consultancySlug}`;
    } else if (typeof window !== "undefined" && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        const refPath = refUrl.pathname;
        const inicioPath = `/consultoria/${consultancySlug}`;
        const rotinasPath = `/consultoria/${consultancySlug}/rotinas`;
        if (refPath === inicioPath || refPath === `${inicioPath}/`) {
          target = inicioPath;
        } else if (refPath === rotinasPath || refPath === `${rotinasPath}/`) {
          target = rotinasPath;
        }
      } catch {
        // fallback to backHref
      }
    }

    router.push(target);
    router.refresh();
  };

  // Fetch initial student details if provided in query params
  useEffect(() => {
    if (initialStudentPublicId && !student) {
      getActiveStudentByMembershipAction(consultancySlug, initialStudentPublicId).then((res) => {
        if (res.ok && res.data) {
          setStudent({
            membershipPublicId: res.data.membershipPublicId,
            name: res.data.name,
            email: res.data.email,
          });
        }
      });
    }
  }, [initialStudentPublicId, consultancySlug, student]);

  // Power user shortcut (Ctrl + K) to open Add modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === "add" ? null : "add"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeBlock = useMemo(() => {
    return blocks.find((b) => b.publicId === activeBlockPublicId) || blocks[0] || null;
  }, [blocks, activeBlockPublicId]);

  // =========================================================================
  // 1. WORKOUT METADATA MUTATIONS
  // =========================================================================
  const handleUpdateTitle = async (newTitle: string) => {
    setHasUserMutatedDraft(true);
    setTitle(newTitle);
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await updateWorkoutDraftMetadataAction(consultancySlug, version.publicId, {
          title: newTitle,
        });
        if (res.ok) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          else if (res.data?.updatedAt) syncRevision(res.data.updatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  // =========================================================================
  // 2. DIVISION / BLOCK MUTATIONS
  // =========================================================================
  const handleAddBlock = async (blockTitle?: string) => {
    setHasUserMutatedDraft(true);
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await addBlockToDraftAction(consultancySlug, version.publicId, {
          title: blockTitle || `Treino ${String.fromCharCode(65 + blocks.length)}`,
        });
        if (res.ok && res.data) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          const newBlock = res.data;
          setBlocks((prev) => [...prev, newBlock]);
          setActiveBlockPublicId(newBlock.publicId);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleRenameBlock = async (blockPublicId: string, newTitle: string) => {
    setHasUserMutatedDraft(true);
    setBlocks((prev) =>
      prev.map((b) => (b.publicId === blockPublicId ? { ...b, title: newTitle } : b))
    );
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await updateBlockTitleAction(consultancySlug, blockPublicId, newTitle);
        if (res.ok) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleBatchRenameBlocks = async (
    updates: Array<{ blockPublicId: string; title: string }>
  ) => {
    setHasUserMutatedDraft(true);
    const titleMap = new Map(updates.map((u) => [u.blockPublicId, u.title]));
    setBlocks((prev) =>
      prev.map((b) => (titleMap.has(b.publicId) ? { ...b, title: titleMap.get(b.publicId)! } : b))
    );
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await batchUpdateBlockTitlesAction(consultancySlug, updates);
        if (res.ok && res.data && res.data.length > 0) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setBlocks((prev) =>
            prev.map((b) => {
              const updated = res.data!.find((ub) => ub.publicId === b.publicId);
              return updated ? { ...b, title: updated.title } : b;
            })
          );
          setSaveStatus("saved");
        } else if (res.ok) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleDuplicateBlock = async (blockPublicId: string) => {
    setHasUserMutatedDraft(true);
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await duplicateBlockAction(consultancySlug, blockPublicId);
        if (res.ok && res.data) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setBlocks((prev) => [...prev, res.data!]);
          setActiveBlockPublicId(res.data!.publicId);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleDeleteBlock = async (blockPublicId: string) => {
    setHasUserMutatedDraft(true);
    const deletedIndex = blocks.findIndex((b) => b.publicId === blockPublicId);
    const nextBlocks = blocks.filter((b) => b.publicId !== blockPublicId);
    setBlocks(nextBlocks);

    // If the deleted block was the active one, select a valid sibling
    if (activeBlockPublicId === blockPublicId) {
      const nextActive = nextBlocks[Math.max(0, deletedIndex - 1)] || nextBlocks[0];
      setActiveBlockPublicId(nextActive ? nextActive.publicId : "");
    }

    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await removeBlockAction(consultancySlug, blockPublicId);
        if (res.ok) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  // =========================================================================
  // 3. EXERCISE ITEM MUTATIONS
  // =========================================================================
  const handleSelectExercise = async (exercise: ExerciseItemDto) => {
    if (!activeBlock) return;
    setHasUserMutatedDraft(true);
    setSaveStatus("saving");

    return executeCoordinatedMutation(async () => {
      try {
        const res = await addExerciseItemToBlockAction(
          consultancySlug,
          activeBlock.publicId,
          exercise.publicId
        );

        if (res.ok && res.data) {
          const newItem = res.data;
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);

          // If targeted for an existing combination slot
          if (targetCombinationPublicId) {
            await addItemToCombinationAction(
              consultancySlug,
              targetCombinationPublicId,
              newItem.publicId
            );

            setBlocks((prev) =>
              prev.map((b) => {
                if (b.publicId !== activeBlock.publicId) return b;
                return {
                  ...b,
                  items: [...(b.items || []), newItem],
                  combinations: (b.combinations || []).map((c) =>
                    c.publicId === targetCombinationPublicId
                      ? {
                          ...c,
                          items: [...(c.items || []), newItem],
                        }
                      : c
                  ),
                };
              })
            );

            setTargetCombinationPublicId(null);
            setSaveStatus("saved");
            setActiveDrawer(null);
            setInsertTarget(null);
            return;
          }

          // If an explicit insert index was targeted, reorder items accordingly
          setBlocks((prev) => {
            return prev.map((b) => {
              if (b.publicId !== activeBlock.publicId) return b;
              const currentItems = [...(b.items || [])];

              if (
                insertTarget?.insertIndex !== undefined &&
                insertTarget.insertIndex < currentItems.length
              ) {
                currentItems.splice(insertTarget.insertIndex, 0, newItem);
              } else {
                currentItems.push(newItem);
              }

              return { ...b, items: currentItems };
            });
          });

          // If inserted at a specific index, sync new ordering with server
          if (
            insertTarget?.insertIndex !== undefined &&
            activeBlock.items &&
            insertTarget.insertIndex < activeBlock.items.length
          ) {
            const currentIds = activeBlock.items.map((i) => i.publicId);
            currentIds.splice(insertTarget.insertIndex, 0, newItem.publicId);
            const reorderRes = await reorderItemsAction(consultancySlug, activeBlock.publicId, currentIds);
            if (reorderRes.ok && reorderRes.versionUpdatedAt) syncRevision(reorderRes.versionUpdatedAt);
          }

          setSaveStatus("saved");
          setActiveDrawer(null);
          setInsertTarget(null);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleUpdateItemConfig = async (
    itemPublicId: string,
    updates: {
      setsCount?: number;
      reps?: string;
      loadKg?: number | null;
      restSeconds?: number | null;
      notes?: string;
      tempo?: string;
      rpeTarget?: number | null;
    }
  ) => {
    let currentItem: WorkoutBlockItemDto | undefined;
    for (const b of blocks) {
      const found = b.items?.find((i) => i.publicId === itemPublicId);
      if (found) {
        currentItem = found;
        break;
      }
    }

    const existingSetsCount = currentItem?.sets?.length || 3;
    const finalSetsCount = updates.setsCount !== undefined && updates.setsCount > 0 ? updates.setsCount : existingSetsCount;

    const existingReps = currentItem?.sets?.[0]?.targetReps;
    const existingRepsMax = currentItem?.sets?.[0]?.targetRepsMax;
    const existingRepsStr = existingReps && existingRepsMax ? `${existingReps}-${existingRepsMax}` : existingReps ? String(existingReps) : "10";

    const parsedReps = parseRepsInput(updates.reps !== undefined ? updates.reps : existingRepsStr);
    const repsMin = parsedReps?.repsMin ?? 10;
    const repsMax = parsedReps?.repsMax ?? null;

    const existingRest = currentItem?.sets?.[0]?.targetRestSeconds ?? 60;
    const finalRest = updates.restSeconds !== undefined && updates.restSeconds !== null ? updates.restSeconds : existingRest;

    const existingLoad = currentItem?.sets?.[0]?.targetLoadKg ?? null;
    const finalLoad = updates.loadKg !== undefined ? updates.loadKg : existingLoad;

    const existingNotes = currentItem?.notes ?? "";
    const finalNotes = updates.notes !== undefined ? updates.notes : existingNotes;

    // Optimistic local update
    setBlocks((prev) =>
      prev.map((b) => ({
        ...b,
        items: (b.items || []).map((it) => {
          if (it.publicId !== itemPublicId) return it;
          const updatedSets = Array.from({ length: finalSetsCount }).map(
            (_, sIdx) => ({
              ...(it.sets?.[sIdx] || {
                setNumber: sIdx + 1,
                setType: "NORMAL" as const,
              }),
              setNumber: sIdx + 1,
              targetReps: repsMin,
              targetRepsMax: repsMax,
              targetLoadKg: finalLoad,
              targetRestSeconds: finalRest,
            })
          );
          return {
            ...it,
            sets: updatedSets,
            notes: finalNotes,
            targetCadence: updates.tempo !== undefined ? updates.tempo : it.targetCadence,
            targetRpe: updates.rpeTarget !== undefined ? updates.rpeTarget : it.targetRpe,
          };
        }),
      }))
    );

    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await updateExerciseQuickConfigAction(consultancySlug, itemPublicId, {
          seriesCount: finalSetsCount,
          reps: repsMin,
          targetRepsMax: repsMax,
          restSeconds: finalRest,
          loadKg: finalLoad,
          notes: finalNotes,
        });

        if (res.ok) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleMoveItem = async (itemPublicId: string, direction: "up" | "down") => {
    if (!activeBlock || !activeBlock.items) return;
    const items = [...activeBlock.items];
    const index = items.findIndex((i) => i.publicId === itemPublicId);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const temp = items[index];
      items[index] = items[index - 1];
      items[index - 1] = temp;
    } else if (direction === "down" && index < items.length - 1) {
      const temp = items[index];
      items[index] = items[index + 1];
      items[index + 1] = temp;
    } else {
      return;
    }

    setBlocks((prev) =>
      prev.map((b) => (b.publicId === activeBlock.publicId ? { ...b, items } : b))
    );

    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const ids = items.map((i) => i.publicId);
        const res = await reorderItemsAction(consultancySlug, activeBlock.publicId, ids);
        if (res.ok) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleDuplicateItem = async (itemPublicId: string) => {
    setHasUserMutatedDraft(true);
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await duplicateExerciseAction(consultancySlug, itemPublicId);
        if (res.ok && res.data) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          const newItem = res.data;
          setBlocks((prev) =>
            prev.map((b) => {
              if (b.publicId !== activeBlock?.publicId) return b;
              return { ...b, items: [...(b.items || []), newItem] };
            })
          );
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleDeleteItem = async (itemPublicId: string) => {
    setHasUserMutatedDraft(true);
    setBlocks((prev) =>
      prev.map((b) => ({
        ...b,
        items: (b.items || []).filter((i) => i.publicId !== itemPublicId),
      }))
    );
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await deleteExerciseAction(consultancySlug, itemPublicId);
        if (res.ok) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  // =========================================================================
  // 4. COMBINATIONS (BI-SET, TRI-SET, CIRCUIT, SUPERSET)
  // =========================================================================
  const handleOpenMethodModal = async (method: MethodType) => {
    setActiveDrawer(null);
    setActiveMethodModal(method);
  };

  const handleConfirmMethod = async (
    method: MethodType,
    itemIds: string[]
  ) => {
    if (!activeBlock) return;
    setSaveStatus("saving");

    try {
      const titleMap: Record<string, string> = {
        BI_SET: "Bi-set",
        TRI_SET: "Tri-set",
        SUPERSET: "Supersérie",
        CIRCUIT: "Circuito",
      };

      const res = await createItemCombinationAction(consultancySlug, {
        blockPublicId: activeBlock.publicId,
        combinationType: method,
        title: titleMap[method] || "Combinação",
        restAfterSeconds: 90,
        itemPublicIds: itemIds,
      });

      if (res.ok && res.data) {
        const newComb = res.data;
        const currentItems = activeBlock.items || [];
        const combItems = currentItems.filter((it) => itemIds.includes(it.publicId));
        const fullNewComb: WorkoutItemCombinationDto = {
          ...newComb,
          items: combItems,
        };

        setBlocks((prev) =>
          prev.map((b) => {
            if (b.publicId !== activeBlock.publicId) return b;
            return {
              ...b,
              combinations: [...(b.combinations || []), fullNewComb],
            };
          })
        );
        setSaveStatus("saved");
        setActiveMethodModal(null);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const handleAddExerciseToBlockForMethod = async (exercisePublicId: string) => {
    if (!activeBlock) return null;
    const res = await addExerciseItemToBlockAction(
      consultancySlug,
      activeBlock.publicId,
      exercisePublicId
    );
    if (res.ok && res.data) {
      const newItem = res.data;
      setBlocks((prev) =>
        prev.map((b) =>
          b.publicId === activeBlock.publicId
            ? { ...b, items: [...(b.items || []), newItem] }
            : b
        )
      );
      return newItem;
    }
    return null;
  };

  const handleSwapCombinationOrder = async (combinationPublicId: string) => {
    if (!activeBlock) return;
    const comb = activeBlock.combinations?.find((c) => c.publicId === combinationPublicId);
    if (!comb || !comb.items || comb.items.length < 2) return;

    const swapped = [...comb.items].reverse();

    setBlocks((prev) =>
      prev.map((b) => {
        if (b.publicId !== activeBlock.publicId) return b;
        return {
          ...b,
          combinations: (b.combinations || []).map((c) =>
            c.publicId === combinationPublicId ? { ...c, items: swapped } : c
          ),
        };
      })
    );

    setSaveStatus("saving");
    try {
      const res = await reorderItemsInCombinationAction(
        consultancySlug,
        combinationPublicId,
        swapped.map((it) => (typeof it === "string" ? it : it.publicId))
      );
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleUngroupCombination = async (combinationPublicId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.publicId !== activeBlock?.publicId) return b;
        return {
          ...b,
          combinations: (b.combinations || []).filter((c) => c.publicId !== combinationPublicId),
        };
      })
    );

    setSaveStatus("saving");
    try {
      const res = await ungroupItemCombinationAction(consultancySlug, combinationPublicId);
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleDuplicateCombination = async (combinationPublicId: string) => {
    setSaveStatus("saving");
    try {
      const res = await duplicateItemCombinationAction(consultancySlug, combinationPublicId);
      if (res.ok && res.data) {
        setBlocks((prev) =>
          prev.map((b) => {
            if (b.publicId !== activeBlock?.publicId) return b;
            return {
              ...b,
              combinations: [...(b.combinations || []), res.data!],
            };
          })
        );
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const handleDeleteCombination = async (combinationPublicId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.publicId !== activeBlock?.publicId) return b;
        return {
          ...b,
          combinations: (b.combinations || []).filter((c) => c.publicId !== combinationPublicId),
        };
      })
    );
    setSaveStatus("saving");
    try {
      const res = await deleteItemCombinationAction(consultancySlug, combinationPublicId);
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleCreateCombinationFromItem = async (
    methodType: import("@/lib/training-v2/types").WorkoutCombinationType,
    firstItemPublicId: string,
    secondExercise: ExerciseItemDto
  ) => {
    if (!activeBlock) return;
    setSaveStatus("saving");
    try {
      // 1. Add second exercise into block
      const addRes = await addExerciseItemToBlockAction(
        consultancySlug,
        activeBlock.publicId,
        secondExercise.publicId
      );

      if (!addRes.ok || !addRes.data) {
        setSaveStatus("error");
        return;
      }

      const secondItem = addRes.data;

      // 2. Create combination uniting both items
      const methodLabels: Record<string, string> = {
        BI_SET: "Bi-set",
        SUPERSET: "Supersérie",
        TRI_SET: "Tri-set",
        CIRCUIT: "Circuito",
      };
      const title = methodLabels[methodType] || "Método";

      const combRes = await createItemCombinationAction(consultancySlug, {
        blockPublicId: activeBlock.publicId,
        combinationType: methodType,
        title,
        restAfterSeconds: 90,
        itemPublicIds: [firstItemPublicId, secondItem.publicId],
      });

      if (combRes.ok && combRes.data) {
        setBlocks((prev) =>
          prev.map((b) => {
            if (b.publicId !== activeBlock.publicId) return b;
            return {
              ...b,
              items: [...(b.items || []), secondItem],
              combinations: [...(b.combinations || []), combRes.data!],
            };
          })
        );
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const handleCombineWithNext = async (itemPublicId: string) => {
    if (!activeBlock || !activeBlock.items) return;
    const idx = activeBlock.items.findIndex((i) => i.publicId === itemPublicId);
    if (idx === -1 || idx >= activeBlock.items.length - 1) return;

    const nextItem = activeBlock.items[idx + 1];

    setSaveStatus("saving");
    try {
      const res = await createItemCombinationAction(consultancySlug, {
        blockPublicId: activeBlock.publicId,
        combinationType: "BI_SET",
        title: "Bi-set",
        restAfterSeconds: 90,
        itemPublicIds: [itemPublicId, nextItem.publicId],
      });

      if (res.ok && res.data) {
        setBlocks((prev) =>
          prev.map((b) => {
            if (b.publicId !== activeBlock.publicId) return b;
            return {
              ...b,
              combinations: [...(b.combinations || []), res.data!],
            };
          })
        );
        setSaveStatus("saved");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  // =========================================================================
  // 5. TEMPLATES & AI ACTIONS
  // =========================================================================
  const handleApplyWholeTemplate = async (
    templatePublicId: string,
    replace: boolean,
    autoReplaceOnly?: boolean
  ) => {
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const expectedIso =
          lastKnownRevisionRef.current > 0
            ? new Date(lastKnownRevisionRef.current).toISOString()
            : undefined;

        const res = await applyTemplateToExistingDraftAction(
          consultancySlug,
          version.publicId,
          templatePublicId,
          {
            replaceExisting: replace,
            autoReplaceUntouchedOnly: autoReplaceOnly,
            expectedUpdatedAt: expectedIso,
          }
        );
        if (res.ok && res.data) {
          setBlocks(res.data.blocks || []);
          if (res.data.blocks && res.data.blocks.length > 0) {
            setActiveBlockPublicId(res.data.blocks[0].publicId);
          }
          setVersion(res.data);
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          else if (res.data.updatedAt) syncRevision(res.data.updatedAt);
          setSaveStatus("saved");
        } else {
          setSaveStatus("idle");
          if (
            res.error?.includes("alterações recentes") ||
            res.error?.includes("CONCURRENT_MODIFICATION") ||
            res.error?.includes("modificado em outra")
          ) {
            setConflictModal({
              isOpen: true,
              message:
                "Este treino recebeu alterações recentes. Atualize os dados antes de continuar para evitar perder informações.",
            });
          } else {
            setConflictModal({
              isOpen: true,
              message: res.error || "Erro ao aplicar programa ao treino.",
            });
          }
        }
      } catch {
        setSaveStatus("error");
        setConflictModal({
          isOpen: true,
          message: "Erro de comunicação ao aplicar programa. Tente novamente.",
        });
      }
    });
  };

  const handleApplySplitFromTemplate = async (templatePublicId: string, blockTitle: string) => {
    setHasUserMutatedDraft(true);
    setSaveStatus("saving");
    return executeCoordinatedMutation(async () => {
      try {
        const res = await addBlockToDraftAction(consultancySlug, version.publicId, {
          title: blockTitle,
        });
        if (res.ok && res.data) {
          if (res.versionUpdatedAt) syncRevision(res.versionUpdatedAt);
          setBlocks((prev) => [...prev, res.data!]);
          setActiveBlockPublicId(res.data.publicId);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleSaveAsTemplate = async () => {
    setSaveStatus("saving");
    try {
      const res = await saveWorkoutAsTemplateAction(consultancySlug, workout.publicId, title);
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleApplyAiSuggestion = async (proposal: {
    divisions: Array<{
      title: string;
      exercises: Array<{ name: string; sets: number; reps: string; rest: number }>;
    }>;
  }) => {
    setSaveStatus("saving");
    const newBlocks: WorkoutBlockDto[] = proposal.divisions.map((div, dIdx) => ({
      publicId: crypto.randomUUID(),
      blockType: "SINGLE",
      title: div.title,
      sortOrder: dIdx + 1,
      rounds: null,
      restBetweenItemsSeconds: null,
      restBetweenRoundsSeconds: null,
      restAfterBlockSeconds: null,
      instructions: null,
      items: div.exercises.map((e, eIdx) => ({
        publicId: crypto.randomUUID(),
        exercisePublicId: null,
        exerciseNameSnapshot: e.name,
        muscleGroupSnapshot: null,
        equipmentSnapshot: null,
        instructionsSnapshot: null,
        prescriptionMode: "SETS",
        targetCadence: null,
        targetRpe: null,
        targetRir: null,
        methodConfig: null,
        customVideoUrl: null,
        notes: null,
        pinnedMedia: [],
        sortOrder: eIdx + 1,
        sets: Array.from({ length: e.sets }).map((_, sIdx) => ({
          setNumber: sIdx + 1,
          setType: "NORMAL" as const,
          targetReps: 10,
          targetRepsMax: null,
          targetLoadKg: null,
          targetRestSeconds: e.rest,
        })),
      })),
    }));

    setBlocks(newBlocks);
    if (newBlocks.length > 0) {
      setActiveBlockPublicId(newBlocks[0].publicId);
    }
    setSaveStatus("saved");
  };

  // =========================================================================
  // 6. PUBLISHING & STUDENT ASSIGNMENT
  // =========================================================================
  const handlePublish = async () => {
    setSaveStatus("saving");
    try {
      const res = await publishWorkoutAction(consultancySlug, version.publicId);
      if (res.ok) {
        // If student is linked, assign workout version to student
        if (student) {
          await assignWorkoutVersionAction(
            consultancySlug,
            workout.publicId,
            version.publicId,
            student.membershipPublicId
          );
        }

        setSaveStatus("saved");
        setActiveDrawer(null);

        // Redirect to student page or rotinas
        if (student) {
          router.push(
            `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?published=true`
          );
        } else {
          router.push(`/consultoria/${consultancySlug}/rotinas?published=true`);
        }
        router.refresh();
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F5F5F0] text-[#1E2922] font-sans flex flex-col justify-between selection:bg-[#176B49] selection:text-white pb-32 sm:pb-28">
      {/* 1. CABEÇALHO DO EDITOR 4.0 */}
      <EditorHeader
        title={title}
        onUpdateTitle={handleUpdateTitle}
        student={student}
        onOpenStudentSelector={() => setActiveDrawer("student-select")}
        saveStatus={saveStatus}
        backHref={backHref}
        onBackClick={handleBack}
        onOpenPreview={() => setActiveDrawer("preview")}
        onOpenFinalize={() => setActiveDrawer("finalize")}
        isDraft={isDraft}
        versionNumber={version.versionNumber}
      />

      {/* 2. ÁREA DE MONTAGEM */}
      <main className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 space-y-4">
        {/* Faixa Compacta de Divisões (Treino A, B, C...) */}
        <DivisionsBar
          blocks={blocks}
          activeBlockPublicId={activeBlockPublicId}
          onSelectBlock={(id) => setActiveBlockPublicId(id)}
          onAddBlock={handleAddBlock}
          onRenameBlock={handleRenameBlock}
          onBatchRenameBlocks={handleBatchRenameBlocks}
          onDuplicateBlock={handleDuplicateBlock}
          onDeleteBlock={handleDeleteBlock}
        />

        {/* Divisão Ativa com Exercícios ou Estado Vazio */}
        {activeBlock ? (
          <DivisionWorkspace
            consultancySlug={consultancySlug}
            block={activeBlock}
            onUpdateItemConfig={handleUpdateItemConfig}
            onMoveItemUp={(id) => handleMoveItem(id, "up")}
            onMoveItemDown={(id) => handleMoveItem(id, "down")}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onOpenAddModal={(idx) => {
              setInsertTarget({ blockPublicId: activeBlock.publicId, insertIndex: idx });
              setActiveDrawer("add");
            }}
            onSelectExercise={handleSelectExercise}
            onOpenMethodModal={(m) => {
              handleOpenMethodModal(m);
            }}
            onOpenModelsDrawer={(idx) => {
              setInsertTarget({ blockPublicId: activeBlock.publicId, insertIndex: idx });
              setActiveDrawer("models");
            }}
            onOpenAiDrawer={(idx) => {
              setInsertTarget({ blockPublicId: activeBlock.publicId, insertIndex: idx });
              setActiveDrawer("ai");
            }}
            onSwapCombinationOrder={handleSwapCombinationOrder}
            onUngroupCombination={handleUngroupCombination}
            onDuplicateCombination={handleDuplicateCombination}
            onDeleteCombination={handleDeleteCombination}
            onAddItemToCombination={(combId) => {
              setTargetCombinationPublicId(combId);
              setActiveDrawer("add");
            }}
            onCreateCombinationFromItem={handleCreateCombinationFromItem}
            onOpenReorderDrawer={() => setActiveDrawer("reorder")}
            onRemoveItemFromCombination={async (combId, itemId) => {
              await removeItemFromCombinationAction(consultancySlug, combId, itemId);
              setBlocks((prev) =>
                prev.map((b) => {
                  if (b.publicId !== activeBlock.publicId) return b;
                  return {
                    ...b,
                    combinations: (b.combinations || []).map((c) =>
                      c.publicId === combId
                        ? {
                            ...c,
                            items: (c.items || []).filter((it) =>
                              typeof it === "string" ? it !== itemId : it.publicId !== itemId
                            ),
                          }
                        : c
                    ),
                  };
                })
              );
            }}
            onCombineWithNext={handleCombineWithNext}
          />
        ) : (
          <div className="w-full bg-white border border-[#E5E8E2] rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs font-sans">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center font-bold text-2xl shadow-xs">
              📋
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-[#102E23]">
                Nenhuma divisão neste treino
              </h3>
              <p className="text-xs sm:text-sm text-[#526058] max-w-md mx-auto leading-relaxed">
                Todas as divisões foram removidas. Adicione uma nova divisão para começar a montar o treino ou escolha um programa pronto.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleAddBlock("Treino A")}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>+ Adicionar divisão</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawer("models")}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5F5F0] text-[#102E23] hover:bg-[#EAEFEA] transition-colors border border-[#E5E8E2] cursor-pointer min-h-[44px]"
              >
                Escolher programa pronto
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. BARRA DE ATALHOS FIXA (DOCK) */}
      <ShortcutsDock
        onOpenAdd={() => {
          setInsertTarget(null);
          setActiveDrawer("add");
        }}
        onOpenModels={() => setActiveDrawer("models")}
        onOpenAi={() => setActiveDrawer("ai")}
        onOpenReorder={() => setActiveDrawer("reorder")}
        onOpenFinalize={() => setActiveDrawer("finalize")}
      />

      {/* 4. MODAIS E DRAWERS CONTEXTUAIS */}
      {/* Modal Adicionar Exercício / Método */}
      <AddItemModal
        isOpen={activeDrawer === "add"}
        onClose={() => {
          setActiveDrawer(null);
          setInsertTarget(null);
          setTargetCombinationPublicId(null);
        }}
        consultancySlug={consultancySlug}
        blockPublicId={activeBlock?.publicId}
        onSelectExercise={handleSelectExercise}
        onCreateMethod={handleOpenMethodModal}
        targetIndex={insertTarget?.insertIndex}
      />

      {/* Drawer Modelos */}
      <ModelsDrawer
        isOpen={activeDrawer === "models"}
        onClose={() => {
          setActiveDrawer(null);
          setInsertTarget(null);
        }}
        consultancySlug={consultancySlug}
        currentWorkoutPublicId={workout.publicId}
        hasExistingItems={blocks.some((b) => (b.items || []).length > 0)}
        blocks={blocks}
        isProvenUntouchedAutoPlaceholder={isProvenUntouchedAutoPlaceholder}
        onApplyWholeTemplate={handleApplyWholeTemplate}
        onApplySplitFromTemplate={handleApplySplitFromTemplate}
        onSaveCurrentAsTemplate={handleSaveAsTemplate}
      />

      {/* Drawer Me ajuda (IA) */}
      <AiHelperDrawer
        isOpen={activeDrawer === "ai"}
        onClose={() => {
          setActiveDrawer(null);
          setInsertTarget(null);
        }}
        consultancySlug={consultancySlug}
        blocks={blocks}
        activeBlockPublicId={activeBlockPublicId}
        onApplyAiSuggestion={handleApplyAiSuggestion}
        onReplaceExerciseWithAlternative={async (itemPublicId, newName) => {
          // Replace name
          setBlocks((prev) =>
            prev.map((b) => ({
              ...b,
              items: (b.items || []).map((it) =>
                it.publicId === itemPublicId ? { ...it, exerciseNameSnapshot: newName } : it
              ),
            }))
          );
        }}
        onAddBiSetSuggestion={async () => {
          handleOpenMethodModal("BI_SET");
        }}
      />

      {/* Drawer Organizar */}
      {activeBlock && (
        <ReorderDrawer
          isOpen={activeDrawer === "reorder"}
          onClose={() => setActiveDrawer(null)}
          block={activeBlock}
          blocks={blocks}
          activeBlockPublicId={activeBlockPublicId}
          onSelectBlock={(id) => setActiveBlockPublicId(id)}
          onSaveNewOrder={async (newIds) => {
            const reordered = newIds
              .map((id) => activeBlock.items?.find((i) => i.publicId === id))
              .filter(Boolean) as WorkoutBlockItemDto[];

            setBlocks((prev) =>
              prev.map((b) => (b.publicId === activeBlock.publicId ? { ...b, items: reordered } : b))
            );

            await reorderItemsAction(consultancySlug, activeBlock.publicId, newIds);
          }}
        />
      )}

      {/* Drawer Finalizar */}
      <FinalizeDrawer
        isOpen={activeDrawer === "finalize"}
        onClose={() => setActiveDrawer(null)}
        title={title}
        student={student}
        blocks={blocks}
        onOpenStudentSelector={() => setActiveDrawer("student-select")}
        onPublish={handlePublish}
        onSaveAsTemplate={handleSaveAsTemplate}
        isTemplate={workout.isTemplate}
      />

      {/* Modal Selecionar Aluno */}
      <StudentSelectModal
        isOpen={activeDrawer === "student-select"}
        onClose={() => setActiveDrawer(null)}
        consultancySlug={consultancySlug}
        onSelectStudent={async (st) => {
          setStudent(st);
        }}
      />

      {/* Modal Guiado de Métodos Avançados (Bi-set, Tri-set, Supersérie, Circuito) */}
      {activeBlock && activeMethodModal && (
        <MethodModal
          key={`${activeMethodModal}-${activeBlock.publicId}`}
          isOpen={Boolean(activeMethodModal)}
          onClose={() => setActiveMethodModal(null)}
          method={activeMethodModal}
          consultancySlug={consultancySlug}
          existingItems={activeBlock.items || []}
          onConfirm={handleConfirmMethod}
          onAddExerciseToBlock={handleAddExerciseToBlockForMethod}
        />
      )}

      {/* Modal Prévia de Aluno (Full screen preview) */}
      {activeDrawer === "preview" && (
        <div className="fixed inset-0 z-50 bg-[#F5F5F0] overflow-y-auto p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
              <span className="text-xs font-bold text-[#102E23]">
                Prévia exata da visualização do Aluno
              </span>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#102E23] text-white hover:bg-[#176B49] transition-colors cursor-pointer"
              >
                Fechar prévia ✕
              </button>
            </div>

            <StudentWorkoutRenderer
              workout={{
                assignmentPublicId: "preview-mode",
                consultancyName: "TREVO ONE",
                startsOn: null,
                endsOn: null,
                versionNumber: version.versionNumber || 1,
                title,
                subtitle: workout.subtitle,
                objective: workout.objective,
                estimatedDurationMinutes: workout.estimatedDurationMinutes,
                difficultyLevel: workout.difficultyLevel,
                notesForStudent: version.notes || null,
                blocks,
              }}
              isPreview={true}
              isDraft={isDraft}
            />
          </div>
        </div>
      )}

      {/* Modal de Conflito de Alterações Integrado (Zero Alert Nativo) */}
      {conflictModal?.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#E5E8E2] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#102E23]">
                Alterações recentes detectadas
              </h3>
              <p className="text-xs text-[#526058] leading-relaxed">
                {conflictModal.message}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (hasUserMutatedDraft) {
                    const confirmDiscard = window.confirm(
                      "Você possui alterações locais não salvas neste treino. Ao atualizar os dados, essas alterações locais serão substituídas pela versão mais recente do servidor. Deseja continuar?"
                    );
                    if (!confirmDiscard) return;
                  }
                  setConflictModal(null);
                  router.refresh();
                }}
                className="w-full sm:flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
              >
                Atualizar dados
              </button>
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="w-full sm:flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5F5F0] text-[#526058] hover:bg-[#E5E8E2] transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
