import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PresentedNutritionPlan } from "./nutrition-plan-presentation";

// PDF Stylesheet (A4 calibrated with 15mm margins, clear hierarchy, zero text overflow)
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
  // Fixed Header Bar
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
    color: "#0f172a", // slate-900
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: "#10b981",
  },
  consultancyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#059669", // emerald-600
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  planTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  planSubtitle: {
    fontSize: 9,
    color: "#64748b", // slate-500
    marginBottom: 6,
  },
  metadataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f8fafc", // slate-50
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0", // slate-200
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
  // Macro Totals Box
  macroBox: {
    backgroundColor: "#f0fdf4", // emerald-50
    borderWidth: 1,
    borderColor: "#bbf7d0", // emerald-200
    borderRadius: 6,
    padding: 8,
    marginVertical: 10,
  },
  macroTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
  },
  macroItemLabel: {
    fontSize: 7.5,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  macroItemValue: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  // Guidance / Notes Box
  noticeBox: {
    backgroundColor: "#f8fafc",
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    padding: 8,
    borderRadius: 4,
    marginVertical: 6,
  },
  noticeTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  noticeText: {
    fontSize: 8.5,
    color: "#334155",
    lineHeight: 1.35,
  },
  // Section Headings
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  // Meals (Intelligent break: container flows, items wrap={false})
  mealContainer: {
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    overflow: "hidden",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  mealTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  mealTimeBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#a7f3d0",
  },
  mealNotes: {
    fontSize: 8,
    color: "#64748b",
    fontStyle: "italic",
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  itemsContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Item Row with wrap={false} (prevents food & quantity from tearing)
  itemCard: {
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  itemMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    flex: 1,
    paddingRight: 8,
  },
  itemQuantity: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "right",
  },
  itemNotes: {
    fontSize: 7.5,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 1,
  },
  // Substitutions block
  substitutionsBlock: {
    marginTop: 3,
    paddingLeft: 8,
    borderLeftWidth: 1.5,
    borderLeftColor: "#cbd5e1",
  },
  substitutionsHeading: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    marginBottom: 2,
  },
  substitutionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 1,
  },
  substitutionName: {
    fontSize: 8,
    color: "#475569",
    flex: 1,
    paddingRight: 6,
  },
  substitutionQuantity: {
    fontSize: 8,
    color: "#334155",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  // Fixed Footer
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

interface ServerPdfDocumentProps {
  plan: PresentedNutritionPlan;
}

export function ServerPdfDocument({ plan }: ServerPdfDocumentProps) {
  return (
    <Document
      title={`Plano Alimentar — ${plan.studentName}`}
      author={plan.prescriberName || plan.consultancyName || "Trevo One"}
      subject="Prescrição Nutricional Oficial"
      keywords="nutrição, dieta, cardápio, trevo one, saúde"
    >
      <Page size="A4" style={styles.page}>
        {/* Document Header */}
        <View style={styles.headerBar}>
          <View style={styles.brandRow}>
            <Text style={styles.brandLogo}>
              TREVO <Text style={styles.brandAccent}>ONE</Text>
            </Text>
            <Text style={styles.consultancyName}>{plan.consultancyName}</Text>
          </View>

          <Text style={styles.planTitle}>{plan.title}</Text>
          {plan.subtitle && <Text style={styles.planSubtitle}>{plan.subtitle}</Text>}

          <View style={styles.metadataGrid}>
            <View style={styles.metadataCol}>
              <Text style={styles.metadataLabel}>Aluno(a)</Text>
              <Text style={styles.metadataValue}>{plan.studentName}</Text>
            </View>

            {plan.prescriberName && (
              <View style={styles.metadataCol}>
                <Text style={styles.metadataLabel}>Nutricionista Prescritor</Text>
                <Text style={styles.metadataValue}>{plan.prescriberName}</Text>
              </View>
            )}

            {plan.periodFormatted && (
              <View style={styles.metadataCol}>
                <Text style={styles.metadataLabel}>Período de Vigência</Text>
                <Text style={styles.metadataValue}>{plan.periodFormatted}</Text>
              </View>
            )}

            <View style={styles.metadataCol}>
              <Text style={styles.metadataLabel}>Emissão do Documento</Text>
              <Text style={styles.metadataValue}>{plan.generationDateFormatted}</Text>
            </View>
          </View>
        </View>

        {/* Nutritional Summary (Rendered ONLY if at least one macro exists) */}
        {plan.totals.hasAnyMacro && (
          <View style={styles.macroBox}>
            <Text style={styles.macroTitle}>Metas Nutricionais Estimadas</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroItemLabel}>Calorias</Text>
                <Text style={styles.macroItemValue}>{plan.totals.caloriesFormatted}</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroItemLabel}>Proteínas</Text>
                <Text style={styles.macroItemValue}>{plan.totals.proteinFormatted}</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroItemLabel}>Carboidratos</Text>
                <Text style={styles.macroItemValue}>{plan.totals.carbohydrateFormatted}</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroItemLabel}>Gorduras</Text>
                <Text style={styles.macroItemValue}>{plan.totals.fatFormatted}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Objective Note (if present) */}
        {plan.objective && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Objetivo do Plano</Text>
            <Text style={styles.noticeText}>{plan.objective}</Text>
          </View>
        )}

        {/* Guidance (if present) */}
        {plan.generalGuidance && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Orientações Gerais do Nutricionista</Text>
            <Text style={styles.noticeText}>{plan.generalGuidance}</Text>
          </View>
        )}

        {/* Personal Note for Student (if present) */}
        {plan.notesForStudent && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Instruções Específicas da Prescrição</Text>
            <Text style={styles.noticeText}>{plan.notesForStudent}</Text>
          </View>
        )}

        {/* Meals Section */}
        <Text style={styles.sectionTitle}>Cardápio e Refeições Prescritas</Text>

        {plan.meals.map((meal) => (
          <View key={meal.id} style={styles.mealContainer}>
            {/* Meal Header (stays with meal content) */}
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{meal.title}</Text>
              {meal.timeFormatted && (
                <Text style={styles.mealTimeBadge}>{meal.timeFormatted}</Text>
              )}
            </View>

            {meal.notes && (
              <Text style={styles.mealNotes}>{meal.notes}</Text>
            )}

            {/* Meal Items (each item is wrap={false} to keep food + quantity + substitutions together, while meal can span pages) */}
            <View style={styles.itemsContainer}>
              {meal.items.map((item) => (
                <View key={item.id} style={styles.itemCard} wrap={false}>
                  {/* Food main line */}
                  <View style={styles.itemMainRow}>
                    <Text style={styles.itemName}>{item.foodName}</Text>
                    {item.quantityFormatted && (
                      <Text style={styles.itemQuantity}>{item.quantityFormatted}</Text>
                    )}
                  </View>

                  {item.notes && (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  )}

                  {/* Substitutions */}
                  {item.substitutions.length > 0 && (
                    <View style={styles.substitutionsBlock}>
                      <Text style={styles.substitutionsHeading}>
                        Pode ser substituído por:
                      </Text>
                      {item.substitutions.map((sub) => (
                        <View key={sub.id} style={styles.substitutionRow}>
                          <Text style={styles.substitutionName}>• {sub.foodName}</Text>
                          {sub.quantityFormatted && (
                            <Text style={styles.substitutionQuantity}>
                              {sub.quantityFormatted}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Fixed Footer with Dynamic Pagination */}
        <View style={styles.footer} fixed>
          <Text>Trevo One • Plataforma de Gestão Nutricional e Performance</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
