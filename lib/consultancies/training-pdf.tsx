import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Image,
} from "@react-pdf/renderer";
import type {
  TrainingPlanDto,
} from "./training";

const WEEKDAY_NAMES: Record<number, string> = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#18181b",
    backgroundColor: "#ffffff",
  },
  coverPage: {
    padding: 48,
    fontFamily: "Helvetica",
    color: "#18181b",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  coverHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  coverLogo: {
    width: 120,
    height: 40,
    objectFit: "contain",
    marginBottom: 8,
  },
  coverConsultancyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#00A859",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  coverBadge: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 24,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#09090b",
    marginTop: 8,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 13,
    color: "#52525b",
    marginTop: 6,
    lineHeight: 1.4,
  },
  coverMetaCard: {
    backgroundColor: "#f4f4f5",
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  coverMetaRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverMetaLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#71717a",
  },
  coverMetaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#18181b",
  },
  coverDescription: {
    fontSize: 9,
    color: "#52525b",
    marginTop: 12,
    lineHeight: 1.5,
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 12,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverFooterText: {
    fontSize: 8,
    color: "#a1a1aa",
  },
  // Inner Pages Header & Footer
  pageHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingBottom: 8,
    marginBottom: 16,
  },
  pageHeaderTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#71717a",
    textTransform: "uppercase",
  },
  pageHeaderConsultancy: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#00A859",
  },
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f4f4f5",
    paddingTop: 6,
  },
  pageFooterText: {
    fontSize: 7,
    color: "#a1a1aa",
  },
  // Workout Header
  workoutContainer: {
    marginBottom: 20,
  },
  workoutHeader: {
    backgroundColor: "#18181b",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  workoutSubtitle: {
    fontSize: 9,
    color: "#d4d4d8",
    marginTop: 2,
  },
  workoutWeekday: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#27272a",
    color: "#a1a1aa",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  workoutNotes: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fef3c7",
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    fontSize: 8,
    color: "#92400e",
    lineHeight: 1.4,
  },
  // Sections & Blocks
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#00A859",
    paddingBottom: 4,
    marginTop: 10,
    marginBottom: 8,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#09090b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 8,
    color: "#71717a",
  },
  blockContainer: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  blockHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    paddingBottom: 4,
    marginBottom: 6,
  },
  blockBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#e4e4e7",
    color: "#27272a",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: "uppercase",
  },
  blockTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#18181b",
    marginLeft: 6,
  },
  blockMeta: {
    fontSize: 8,
    color: "#71717a",
  },
  blockInstructions: {
    fontSize: 8,
    color: "#52525b",
    fontStyle: "italic",
    marginBottom: 6,
  },
  // Exercise Item
  exerciseCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 4,
    padding: 7,
    marginBottom: 5,
  },
  exerciseTopRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#09090b",
  },
  exerciseVideoLink: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#00A859",
    textDecoration: "none",
  },
  exerciseTags: {
    fontSize: 7,
    color: "#71717a",
    marginTop: 2,
    marginBottom: 4,
  },
  prescriptionGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#f4f4f5",
  },
  prescriptionBadge: {
    fontSize: 8,
    backgroundColor: "#f4f4f5",
    color: "#18181b",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  prescriptionTechnique: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f5f3ff",
    color: "#6d28d9",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  exerciseNotes: {
    fontSize: 7.5,
    color: "#52525b",
    marginTop: 4,
    lineHeight: 1.3,
  },
});

type TrainingPdfProps = {
  plan: TrainingPlanDto;
  studentName: string;
  consultancyName: string;
  consultancyLogoPath?: string | null;
};

export function TrainingPlanPdfDocument({
  plan,
  studentName,
  consultancyName,
  consultancyLogoPath,
}: TrainingPdfProps) {
  const formattedStart = plan.startsOn ? plan.startsOn.split("-").reverse().join("/") : null;
  const formattedEnd = plan.endsOn ? plan.endsOn.split("-").reverse().join("/") : null;

  return (
    <Document
      title={`Plano de Treino - ${plan.title}`}
      author={consultancyName}
      subject="Prescrição de Treinamento Físico"
      creator="Trevo One"
    >
      {/* CAPA (Cover Page) */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          {consultancyLogoPath ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={consultancyLogoPath} style={styles.coverLogo} />
          ) : (
            <Text style={styles.coverConsultancyName}>{consultancyName}</Text>
          )}

          <Text style={styles.coverBadge}>Prescrição de Treinamento</Text>
          <Text style={styles.coverTitle}>{plan.title}</Text>
          {plan.subtitle && <Text style={styles.coverSubtitle}>{plan.subtitle}</Text>}

          <View style={styles.coverMetaCard}>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Aluno:</Text>
              <Text style={styles.coverMetaValue}>{studentName}</Text>
            </View>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Consultoria:</Text>
              <Text style={styles.coverMetaValue}>{consultancyName}</Text>
            </View>
            {(formattedStart || formattedEnd) && (
              <View style={styles.coverMetaRow}>
                <Text style={styles.coverMetaLabel}>Período de Vigência:</Text>
                <Text style={styles.coverMetaValue}>
                  {formattedStart || "Início"} {formattedEnd ? `até ${formattedEnd}` : ""}
                </Text>
              </View>
            )}
            {plan.activatedAt && (
              <View style={styles.coverMetaRow}>
                <Text style={styles.coverMetaLabel}>Disponibilizado em:</Text>
                <Text style={styles.coverMetaValue}>
                  {new Date(plan.activatedAt).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            )}
          </View>

          {plan.description && (
            <Text style={styles.coverDescription}>
              Objetivo / Orientações: {plan.description}
            </Text>
          )}
        </View>

        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>
            Trevo One — Plataforma de Gestão e Prescrição
          </Text>
          <Text style={styles.coverFooterText}>Documento Oficial</Text>
        </View>
      </Page>

      {/* PÁGINAS DE TREINO (Workouts) */}
      {plan.workouts.map((workout, wIdx) => (
        <Page key={workout.publicId || wIdx} size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderTitle}>
              {plan.title} • {workout.title}
            </Text>
            <Text style={styles.pageHeaderConsultancy}>{consultancyName}</Text>
          </View>

          {/* Workout Header */}
          <View style={styles.workoutContainer}>
            <View style={styles.workoutHeader}>
              <View>
                <Text style={styles.workoutTitle}>{workout.title}</Text>
                {workout.subtitle && <Text style={styles.workoutSubtitle}>{workout.subtitle}</Text>}
              </View>
              {workout.scheduledWeekday && (
                <Text style={styles.workoutWeekday}>
                  {WEEKDAY_NAMES[workout.scheduledWeekday] || ""}
                </Text>
              )}
            </View>

            {workout.notes && (
              <Text style={styles.workoutNotes}>
                Orientações do Treino: {workout.notes}
              </Text>
            )}

            {/* Sections */}
            {workout.sections.map((section, sIdx) => (
              <View key={section.publicId || sIdx} wrap={false}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.description && (
                    <Text style={styles.sectionDesc}>{section.description}</Text>
                  )}
                </View>

                {/* Blocks */}
                {section.blocks.map((block, bIdx) => {
                  const isMulti = block.blockType !== "SINGLE";
                  return (
                    <View key={block.publicId || bIdx} style={styles.blockContainer} wrap={false}>
                      <View style={styles.blockHeader}>
                        <View style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                          <Text style={styles.blockBadge}>{block.blockType.replace("_", " ")}</Text>
                          {block.title && <Text style={styles.blockTitle}>{block.title}</Text>}
                        </View>
                        <View style={{ display: "flex", flexDirection: "row", gap: 6 }}>
                          {block.rounds && (
                            <Text style={styles.blockMeta}>{block.rounds} rounds</Text>
                          )}
                          {block.restBetweenExercisesSeconds !== null && block.restBetweenExercisesSeconds > 0 && (
                            <Text style={styles.blockMeta}>{block.restBetweenExercisesSeconds}s entre</Text>
                          )}
                          {block.restAfterBlockSeconds !== null && block.restAfterBlockSeconds > 0 && (
                            <Text style={styles.blockMeta}>{block.restAfterBlockSeconds}s descanso</Text>
                          )}
                        </View>
                      </View>

                      {block.instructions && (
                        <Text style={styles.blockInstructions}>
                          Instruções: {block.instructions}
                        </Text>
                      )}

                      {/* Exercises */}
                      {block.exercises.map((exercise, eIdx) => {
                        const orderTag = isMulti
                          ? `${String.fromCharCode(65 + bIdx)}${eIdx + 1}`
                          : null;
                        const hasVideo = exercise.videoUrl && exercise.videoUrl.startsWith("https://");

                        return (
                          <View key={exercise.publicId || eIdx} style={styles.exerciseCard}>
                            <View style={styles.exerciseTopRow}>
                              <Text style={styles.exerciseName}>
                                {orderTag ? `${orderTag}. ` : ""}
                                {exercise.exerciseName}
                              </Text>
                              {hasVideo && (
                                <Link src={exercise.videoUrl!} style={styles.exerciseVideoLink}>
                                  ▶ VER EXECUÇÃO
                                </Link>
                              )}
                            </View>

                            {(exercise.muscleGroup || exercise.equipment) && (
                              <Text style={styles.exerciseTags}>
                                {[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(" • ")}
                              </Text>
                            )}

                            <View style={styles.prescriptionGrid}>
                              {exercise.sets !== null && (
                                <Text style={styles.prescriptionBadge}>
                                  {exercise.sets} {exercise.sets === 1 ? "série" : "séries"}
                                </Text>
                              )}
                              {exercise.repetitionsText && (
                                <Text style={styles.prescriptionBadge}>
                                  {exercise.repetitionsText} reps
                                </Text>
                              )}
                              {exercise.loadGuidance && (
                                <Text style={styles.prescriptionBadge}>
                                  Carga: {exercise.loadGuidance}
                                </Text>
                              )}
                              {exercise.restSeconds !== null && exercise.restSeconds > 0 && (
                                <Text style={styles.prescriptionBadge}>
                                  Descanso: {exercise.restSeconds}s
                                </Text>
                              )}
                              {exercise.technique && (
                                <Text style={styles.prescriptionTechnique}>
                                  {exercise.technique}
                                </Text>
                              )}
                            </View>

                            {exercise.instructions && (
                              <Text style={styles.exerciseNotes}>
                                Instruções: {exercise.instructions}
                              </Text>
                            )}
                            {exercise.notes && (
                              <Text style={styles.exerciseNotes}>
                                Obs: {exercise.notes}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.pageFooter} fixed>
            <Text style={styles.pageFooterText}>Trevo One • {consultancyName}</Text>
            <Text
              style={styles.pageFooterText}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </Page>
      ))}
    </Document>
  );
}
