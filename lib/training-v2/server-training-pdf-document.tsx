import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WorkoutItemSetDto } from "./types";
import { formatDurationNatural } from "./reps-normalizer";

const styles = StyleSheet.create({
  page: {
    size: "A4",
    orientation: "landscape",
    paddingTop: 18,
    paddingBottom: 28,
    paddingLeft: 20,
    paddingRight: 20,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1e293b", // slate-800
    backgroundColor: "#ffffff",
  },
  headerBar: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#10b981", // Emerald accent
    paddingBottom: 6,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  brandLogo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: "#10b981",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  draftBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#d97706", // amber-600
    backgroundColor: "#fef3c7", // amber-100
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: "#fcd34d",
    textTransform: "uppercase",
  },
  consultancyName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  workoutTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 1,
  },
  workoutSubtitle: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 4,
  },
  metadataGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 0.75,
    borderColor: "#e2e8f0",
    marginTop: 2,
  },
  metadataCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metadataLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metadataValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  notesBox: {
    backgroundColor: "#f8fafc",
    borderLeftWidth: 2.5,
    borderLeftColor: "#10b981",
    padding: 4.5,
    borderRadius: 3,
    marginVertical: 4,
  },
  notesTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 1,
  },
  notesText: {
    fontSize: 7.5,
    color: "#334155",
    lineHeight: 1.25,
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    flexWrap: "nowrap",
  },
  dayColumn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#ffffff",
    borderWidth: 0.75,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 5,
  },
  dayColumnSingle: {
    maxWidth: 480,
    marginHorizontal: "auto",
  },
  categoryHeader: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 3.5,
    borderLeftWidth: 2.5,
    borderLeftColor: "#10b981",
    marginBottom: 4,
    borderRadius: 2,
  },
  categoryTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  categoryInstructions: {
    fontSize: 6.5,
    color: "#64748b",
    marginTop: 1,
    fontStyle: "italic",
  },
  exerciseCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    padding: 4,
    marginBottom: 3.5,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  exerciseName: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    flex: 1,
  },
  exerciseMetaBadge: {
    fontSize: 6,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  combBadge: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "#a7f3d0",
    textTransform: "uppercase",
  },
  customBadge: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#7c3aed",
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "#ddd6fe",
    textTransform: "uppercase",
  },
  setRow: {
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 2,
    padding: 3,
    marginTop: 2,
  },
  setItem: {
    fontSize: 7,
    color: "#334155",
    fontFamily: "Helvetica",
  },
  setItemBold: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  exerciseNotes: {
    fontSize: 6.5,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: "#f1f5f9",
    paddingTop: 2,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderWidth: 0.5,
    borderColor: "#fde68a",
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
    marginBottom: 2,
    alignSelf: "flex-start",
  },
  methodBadgeText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
  },
  sequenceMovementsBox: {
    backgroundColor: "#faf5ff",
    borderWidth: 0.5,
    borderColor: "#e9d5ff",
    borderRadius: 2,
    padding: 3,
    marginTop: 2,
    marginBottom: 2,
  },
  sequenceMovementsTitle: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#7e22ce",
    marginBottom: 1,
  },
  sequenceMovementItem: {
    fontSize: 6,
    fontFamily: "Helvetica",
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 8,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 3,
  },
  footerLeft: {
    fontSize: 7,
    color: "#64748b",
  },
  footerRight: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
  },
  pdfCombinationCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 3.5,
    padding: 4,
    marginBottom: 3.5,
  },
  pdfCombHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2.5,
    marginBottom: 3,
  },
  pdfCombTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  pdfCombRest: {
    fontSize: 6,
    color: "#059669",
    fontFamily: "Helvetica-Bold",
  },
  pdfCombRow: {
    paddingVertical: 2,
  },
  pdfCombDivider: {
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    marginTop: 2,
    paddingTop: 2.5,
  },
  pdfCombLetter: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: "#059669",
    width: 11,
    height: 11,
    textAlign: "center",
    borderRadius: 5.5,
    marginRight: 4,
  },
  pdfTransitionText: {
    fontSize: 5.5,
    fontFamily: "Helvetica",
    color: "#059669",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 1,
  },
});

export interface PresentedTrainingPlan {
  title: string;
  subtitle?: string | null;
  objective?: string | null;
  studentName?: string | null;
  personalTrainerName?: string | null;
  consultancyName: string;
  startsOnFormatted?: string | null;
  generationDateFormatted: string;
  notes?: string | null;
  isDraft: boolean;
  versionNumber?: number;
  blocks: Array<{
    name: string;
    instructions?: string | null;
    exercises: Array<{
      name: string;
      muscleGroup?: string | null;
      equipment?: string | null;
      notes?: string | null;
      summaryString: string;
      combinationId?: string | null;
      combinationType?: string | null;
      combinationTitle?: string | null;
      combinationRestSeconds?: number | null;
      isCustomExercise?: boolean;
      isSequence?: boolean;
      sequenceMovements?: string[] | null;
      setsDetail: Array<{
        setNumber: number;
        reps?: number | null;
        loadKg?: number | null;
        restSeconds?: number | null;
        durationSeconds?: number | null;
      }>;
    }>;
  }>;
}

export function formatExerciseSetsSummary(sets: WorkoutItemSetDto[]): {
  summaryString: string;
  setsDetail: Array<{
    setNumber: number;
    reps?: number | null;
    loadKg?: number | null;
    restSeconds?: number | null;
    durationSeconds?: number | null;
  }>;
} {
  if (!sets || sets.length === 0) {
    return { summaryString: "1 série", setsDetail: [] };
  }

  const numSets = sets.length;
  const firstSet = sets[0];
  const allSameReps = sets.every(
    (s) => s.targetReps === firstSet.targetReps && s.targetRepsMax === firstSet.targetRepsMax
  );
  const allSameLoad = sets.every((s) => s.targetLoadKg === firstSet.targetLoadKg);
  const allSameRest = sets.every((s) => s.targetRestSeconds === firstSet.targetRestSeconds);

  const parts: string[] = [];

  // Sets and Reps
  if (allSameReps && firstSet.targetReps) {
    const repsStr =
      firstSet.targetRepsMax && firstSet.targetRepsMax > firstSet.targetReps
        ? `${firstSet.targetReps}–${firstSet.targetRepsMax}`
        : `${firstSet.targetReps}`;
    parts.push(`${numSets} × ${repsStr}`);
  } else if (allSameReps && firstSet.targetDurationSeconds) {
    parts.push(
      `${numSets} × ${formatDurationNatural(firstSet.targetDurationSeconds, firstSet.durationUnit)}`
    );
  } else {
    // Varied reps between sets (e.g. 12 / 10 / 8)
    const repsSeq = sets
      .map((s) => (s.targetReps ? (s.targetRepsMax ? `${s.targetReps}-${s.targetRepsMax}` : `${s.targetReps}`) : null))
      .filter(Boolean);
    if (repsSeq.length === numSets) {
      parts.push(`${numSets} séries (${repsSeq.join(" / ")} reps)`);
    } else {
      parts.push(`${numSets} séries`);
    }
  }

  // Load (ONLY if load is not null and > 0 - never show 0 kg)
  if (allSameLoad && firstSet.targetLoadKg && Number(firstSet.targetLoadKg) > 0) {
    parts.push(`Carga: ${firstSet.targetLoadKg} kg`);
  }

  // Rest
  if (allSameRest && firstSet.targetRestSeconds && Number(firstSet.targetRestSeconds) > 0) {
    parts.push(`Descanso: ${firstSet.targetRestSeconds}s`);
  }

  const summaryString = parts.join(" | ");

  const setsDetail = sets.map((s) => ({
    setNumber: s.setNumber,
    reps: s.targetReps ?? null,
    loadKg: s.targetLoadKg && Number(s.targetLoadKg) > 0 ? Number(s.targetLoadKg) : null,
    restSeconds: s.targetRestSeconds && Number(s.targetRestSeconds) > 0 ? Number(s.targetRestSeconds) : null,
    durationSeconds:
      s.targetDurationSeconds && Number(s.targetDurationSeconds) > 0
        ? Number(s.targetDurationSeconds)
        : null,
  }));

  return { summaryString, setsDetail };
}

export function ServerTrainingPdfDocument({ plan }: { plan: PresentedTrainingPlan }) {
  return (
    <Document
      title={`${plan.title} - ${plan.consultancyName}`}
      author={plan.personalTrainerName || plan.consultancyName}
      subject="Ficha de Treino Oficial"
      creator="TREVO ONE"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.brandRow}>
            <Text style={styles.brandLogo}>
              TREVO<Text style={styles.brandAccent}>ONE</Text>
            </Text>
            <View style={styles.headerRight}>
              {plan.isDraft && <Text style={styles.draftBadge}>Rascunho</Text>}
              <Text style={styles.consultancyName}>{plan.consultancyName}</Text>
            </View>
          </View>

          <Text style={styles.workoutTitle}>{plan.title}</Text>
          {plan.subtitle && <Text style={styles.workoutSubtitle}>{plan.subtitle}</Text>}

          {/* Metadata Grid */}
          <View style={styles.metadataGrid}>
            {plan.studentName && (
              <View style={styles.metadataCol}>
                <Text style={styles.metadataLabel}>Aluno</Text>
                <Text style={styles.metadataValue}>{plan.studentName}</Text>
              </View>
            )}

            {plan.personalTrainerName && (
              <View style={styles.metadataCol}>
                <Text style={styles.metadataLabel}>Prescrito por</Text>
                <Text style={styles.metadataValue}>{plan.personalTrainerName}</Text>
              </View>
            )}

            {plan.objective && (
              <View style={styles.metadataCol}>
                <Text style={styles.metadataLabel}>Objetivo</Text>
                <Text style={styles.metadataValue}>{plan.objective}</Text>
              </View>
            )}

            <View style={styles.metadataCol}>
              <Text style={styles.metadataLabel}>Data de Emissão</Text>
              <Text style={styles.metadataValue}>
                {plan.startsOnFormatted || plan.generationDateFormatted}
              </Text>
            </View>
          </View>
        </View>

        {/* General Notes / Guidance */}
        {plan.notes && plan.notes.trim().length > 0 && (
          <View style={styles.notesBox} wrap={false}>
            <Text style={styles.notesTitle}>Orientações Gerais</Text>
            <Text style={styles.notesText}>{plan.notes.trim()}</Text>
          </View>
        )}

        {/* Categories / Days Side-by-Side Row */}
        <View style={styles.daysRow}>
          {plan.blocks.map((block, bIdx) => (
            <View
              key={`b-${bIdx}`}
              style={[
                styles.dayColumn,
                plan.blocks.length === 1 ? styles.dayColumnSingle : {},
              ]}
            >
              <View style={styles.categoryHeader} wrap={false}>
                <Text style={styles.categoryTitle}>{block.name}</Text>
                {block.instructions && block.instructions.trim().length > 0 && (
                  <Text style={styles.categoryInstructions}>{block.instructions.trim()}</Text>
                )}
              </View>

              {(() => {
                type PdfUnit =
                  | { type: "single"; ex: (typeof block.exercises)[0]; idx: number }
                  | {
                      type: "combination";
                      combType: string;
                      combTitle?: string | null;
                      restSeconds?: number | null;
                      items: Array<(typeof block.exercises)[0]>;
                    };

                const units: PdfUnit[] = [];
                let currentComb: {
                  combType: string;
                  combTitle?: string | null;
                  restSeconds?: number | null;
                  combId?: string | null;
                  items: Array<(typeof block.exercises)[0]>;
                } | null = null;

                for (let idx = 0; idx < block.exercises.length; idx++) {
                  const ex = block.exercises[idx];
                  if (ex.combinationType) {
                    const key = ex.combinationId || ex.combinationType;
                    if (currentComb && currentComb.combId === key) {
                      currentComb.items.push(ex);
                    } else {
                      if (currentComb) {
                        units.push({
                          type: "combination",
                          combType: currentComb.combType,
                          combTitle: currentComb.combTitle,
                          restSeconds: currentComb.restSeconds,
                          items: currentComb.items,
                        });
                      }
                      currentComb = {
                        combType: ex.combinationType,
                        combTitle: ex.combinationTitle,
                        restSeconds: ex.combinationRestSeconds ?? 60,
                        combId: key,
                        items: [ex],
                      };
                    }
                  } else {
                    if (currentComb) {
                      units.push({
                        type: "combination",
                        combType: currentComb.combType,
                        combTitle: currentComb.combTitle,
                        restSeconds: currentComb.restSeconds,
                        items: currentComb.items,
                      });
                      currentComb = null;
                    }
                    units.push({ type: "single", ex, idx });
                  }
                }
                if (currentComb) {
                  units.push({
                    type: "combination",
                    combType: currentComb.combType,
                    combTitle: currentComb.combTitle,
                    restSeconds: currentComb.restSeconds,
                    items: currentComb.items,
                  });
                }

                const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

                return units.map((u, uIdx) => {
                  if (u.type === "single") {
                    const ex = u.ex;
                    return (
                      <View key={`e-${uIdx}`} style={styles.exerciseCard} wrap={false}>
                        <View style={styles.exerciseHeader}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, flex: 1 }}>
                            {ex.isCustomExercise && (
                              <Text style={styles.customBadge}>Personalizado</Text>
                            )}
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                          </View>
                          {(ex.muscleGroup || ex.equipment) && (
                            <Text style={styles.exerciseMetaBadge}>
                              {[ex.muscleGroup, ex.equipment].filter(Boolean).join(" • ")}
                            </Text>
                          )}
                        </View>

                        {/* Method / Observation */}
                        {ex.notes && ex.notes.trim().length > 0 && (
                          <View style={styles.methodBadge}>
                            <Text style={styles.methodBadgeText}>Método / Obs: {ex.notes.trim()}</Text>
                          </View>
                        )}

                        {/* Sequence movements list */}
                        {ex.isSequence && ex.sequenceMovements && ex.sequenceMovements.length > 0 && (
                          <View style={styles.sequenceMovementsBox}>
                            <Text style={styles.sequenceMovementsTitle}>Movimentos da Sequência:</Text>
                            {ex.sequenceMovements.map((mov, mIdx) => (
                              <Text key={mIdx} style={styles.sequenceMovementItem}>
                                {mIdx + 1}. {mov}
                              </Text>
                            ))}
                          </View>
                        )}

                        {/* Sets Summary */}
                        <View style={styles.setRow}>
                          <Text style={styles.setItem}>
                            <Text style={styles.setItemBold}>{ex.summaryString}</Text>
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  // Combination Group Block
                  const label = u.combType.replace("_", "-");
                  return (
                    <View key={`comb-${uIdx}`} style={styles.pdfCombinationCard} wrap={false}>
                      <View style={styles.pdfCombHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={styles.combBadge}>{label}</Text>
                          {u.combTitle && <Text style={styles.pdfCombTitle}>{u.combTitle}</Text>}
                        </View>
                        <Text style={styles.pdfCombRest}>Pós-rodada: {u.restSeconds ?? 60}s</Text>
                      </View>

                      {u.items.map((it, itIdx) => (
                        <View
                          key={`c-item-${itIdx}`}
                          style={[styles.pdfCombRow, itIdx > 0 ? styles.pdfCombDivider : {}]}
                        >
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 4 }}>
                            <Text style={styles.pdfCombLetter}>{LETTERS[itIdx] || `${itIdx + 1}`}</Text>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 1 }}>
                                {it.isCustomExercise && <Text style={styles.customBadge}>Personalizado</Text>}
                                <Text style={styles.exerciseName}>{it.name}</Text>
                                {(it.muscleGroup || it.equipment) && (
                                  <Text style={styles.exerciseMetaBadge}>
                                    {[it.muscleGroup, it.equipment].filter(Boolean).join(" • ")}
                                  </Text>
                                )}
                              </View>

                              {/* Method / Observation */}
                              {it.notes && it.notes.trim().length > 0 && (
                                <View style={styles.methodBadge}>
                                  <Text style={styles.methodBadgeText}>Método / Obs: {it.notes.trim()}</Text>
                                </View>
                              )}

                              {/* Sequence movements list */}
                              {it.isSequence && it.sequenceMovements && it.sequenceMovements.length > 0 && (
                                <View style={styles.sequenceMovementsBox}>
                                  <Text style={styles.sequenceMovementsTitle}>Movimentos da Sequência:</Text>
                                  {it.sequenceMovements.map((mov, mIdx) => (
                                    <Text key={mIdx} style={styles.sequenceMovementItem}>
                                      {mIdx + 1}. {mov}
                                    </Text>
                                  ))}
                                </View>
                              )}

                              <Text style={styles.setItemBold}>{it.summaryString}</Text>
                            </View>
                          </View>
                          {itIdx < u.items.length - 1 && (
                            <Text style={styles.pdfTransitionText}>↓ Transição direta (sem descanso)</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                });
              })()}
            </View>
          ))}
        </View>

        {/* Fixed Footer with dynamic page numbering (Página X de Y) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            TREVO ONE • {plan.consultancyName || "Sistema Profissional"}
            {plan.versionNumber ? ` • Versão ${plan.versionNumber}` : ""}
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
