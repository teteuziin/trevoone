import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WorkoutItemSetDto } from "./types";
import { formatDurationToMinutes } from "./reps-normalizer";

const styles = StyleSheet.create({
  page: {
    size: "A4",
    paddingTop: 36,
    paddingBottom: 48,
    paddingLeft: 36,
    paddingRight: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b", // slate-800
    backgroundColor: "#ffffff",
  },
  headerBar: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#10b981", // Emerald accent
    paddingBottom: 10,
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  brandLogo: {
    fontSize: 13,
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
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#d97706", // amber-600
    backgroundColor: "#fef3c7", // amber-100
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#fcd34d",
    textTransform: "uppercase",
  },
  consultancyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  workoutSubtitle: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 6,
  },
  metadataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 4,
  },
  metadataCol: {
    width: "50%",
    paddingVertical: 2,
  },
  metadataLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metadataValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  notesBox: {
    backgroundColor: "#f8fafc",
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  notesText: {
    fontSize: 8.5,
    color: "#334155",
    lineHeight: 1.35,
  },
  categoryBlock: {
    marginBottom: 12,
  },
  categoryHeader: {
    backgroundColor: "#f1f5f9", // slate-100
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    marginBottom: 6,
    borderRadius: 2,
  },
  categoryTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  categoryInstructions: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
    fontStyle: "italic",
  },
  exerciseCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    flex: 1,
  },
  exerciseMetaBadge: {
    fontSize: 7.5,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  setRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#f8fafc",
    padding: 5,
    borderRadius: 4,
    marginTop: 3,
  },
  setItem: {
    fontSize: 8.5,
    color: "#334155",
    fontFamily: "Helvetica",
  },
  setItemBold: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  exerciseNotes: {
    fontSize: 8,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#f1f5f9",
    paddingTop: 3,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.75,
    borderTopColor: "#cbd5e1",
    paddingTop: 6,
    fontSize: 7.5,
    color: "#94a3b8",
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
  const allSameReps = sets.every((s) => s.targetReps === firstSet.targetReps && s.targetRepsMax === firstSet.targetRepsMax);
  const allSameLoad = sets.every((s) => s.targetLoadKg === firstSet.targetLoadKg);
  const allSameRest = sets.every((s) => s.targetRestSeconds === firstSet.targetRestSeconds);

  const parts: string[] = [];

  // Sets and Reps
  if (allSameReps && firstSet.targetReps) {
    const repsStr = firstSet.targetRepsMax && firstSet.targetRepsMax > firstSet.targetReps
      ? `${firstSet.targetReps}–${firstSet.targetRepsMax}`
      : `${firstSet.targetReps}`;
    parts.push(`${numSets} × ${repsStr}`);
  } else if (allSameReps && firstSet.targetDurationSeconds) {
    parts.push(`${numSets} × ${formatDurationToMinutes(firstSet.targetDurationSeconds)}`);
  } else {
    parts.push(`${numSets} séries`);
  }

  // Load (ONLY if load is not null and > 0)
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
    durationSeconds: s.targetDurationSeconds && Number(s.targetDurationSeconds) > 0 ? Number(s.targetDurationSeconds) : null,
  }));

  return { summaryString, setsDetail };
}

export function ServerTrainingPdfDocument({ plan }: { plan: PresentedTrainingPlan }) {
  return (
    <Document
      title={`Ficha de Treino — ${plan.studentName || plan.title}`}
      author={plan.personalTrainerName || plan.consultancyName || "Trevo One"}
      subject="Prescrição de Treino Oficial"
      keywords="treino, musculação, ficha, trevo one, personal"
    >
      <Page size="A4" style={styles.page}>
        {/* Document Header */}
        <View style={styles.headerBar}>
          <View style={styles.brandRow}>
            <Text style={styles.brandLogo}>
              TREVO <Text style={styles.brandAccent}>ONE</Text>
            </Text>
            <View style={styles.headerRight}>
              {plan.isDraft && <Text style={styles.draftBadge}>Rascunho</Text>}
              <Text style={styles.consultancyName}>{plan.consultancyName}</Text>
            </View>
          </View>

          <Text style={styles.workoutTitle}>{plan.title}</Text>
          {plan.subtitle && <Text style={styles.workoutSubtitle}>{plan.subtitle}</Text>}

          <View style={styles.metadataGrid}>
            {plan.studentName && plan.studentName.trim() && (
              <View style={styles.metadataCol}>
                <Text style={styles.metadataLabel}>Aluno(a)</Text>
                <Text style={styles.metadataValue}>{plan.studentName.trim()}</Text>
              </View>
            )}

            {plan.personalTrainerName && (
              <View style={styles.metadataCol}>
                <Text style={styles.metadataLabel}>Personal Trainer</Text>
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
              <Text style={styles.metadataValue}>{plan.startsOnFormatted || plan.generationDateFormatted}</Text>
            </View>
          </View>
        </View>

        {/* General Notes / Guidance */}
        {plan.notes && plan.notes.trim().length > 0 && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Orientações Gerais</Text>
            <Text style={styles.notesText}>{plan.notes.trim()}</Text>
          </View>
        )}

        {/* Categories and Exercises */}
        {plan.blocks.map((block, bIdx) => (
          <View key={`b-${bIdx}`} style={styles.categoryBlock} wrap={false}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{block.name}</Text>
              {block.instructions && block.instructions.trim().length > 0 && (
                <Text style={styles.categoryInstructions}>{block.instructions.trim()}</Text>
              )}
            </View>

            {block.exercises.map((ex, eIdx) => (
              <View key={`e-${eIdx}`} style={styles.exerciseCard} wrap={false}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  {(ex.muscleGroup || ex.equipment) && (
                    <Text style={styles.exerciseMetaBadge}>
                      {[ex.muscleGroup, ex.equipment].filter(Boolean).join(" • ")}
                    </Text>
                  )}
                </View>

                {/* Sets Summary */}
                <View style={styles.setRow}>
                  <Text style={styles.setItem}>
                    <Text style={styles.setItemBold}>{ex.summaryString}</Text>
                  </Text>
                </View>

                {/* Exercise Notes (ONLY if present) */}
                {ex.notes && ex.notes.trim().length > 0 && (
                  <Text style={styles.exerciseNotes}>{ex.notes.trim()}</Text>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Fixed Footer */}
        <View style={styles.footer} fixed>
          <Text>TREVO ONE • Sistema Profissional</Text>
          <Text>
            Gerado em {plan.generationDateFormatted}
            {plan.versionNumber ? ` • Versão ${plan.versionNumber}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
