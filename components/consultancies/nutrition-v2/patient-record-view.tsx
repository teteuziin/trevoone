"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PatientRecordDetail,
  UpdatePatientRecordInput,
  AddAnthropometricEntryInput,
  UpdatePregnancyInput,
  PregnancyStatus,
} from "@/lib/nutrition-v2/patient-record-types";
import { deriveTrimester } from "@/lib/nutrition-v2/patient-record-validation";
import {
  updatePatientRecordAction,
  addAnthropometricEntryAction,
  deleteAnthropometricEntryAction,
  updatePregnancyAction,
} from "@/app/consultoria/[slug]/planos-v2/patient-actions";

interface PatientRecordViewProps {
  slug: string;
  initialDetail: PatientRecordDetail;
}

type TabType = "resumo" | "clinico" | "alimentar" | "estilo_vida" | "antropometria" | "gestacao";

export function PatientRecordView({ slug, initialDetail }: PatientRecordViewProps) {
  const [detail, setDetail] = useState<PatientRecordDetail>(initialDetail);
  const [activeTab, setActiveTab] = useState<TabType>("resumo");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for clinical fields
  const [clinicalForm, setClinicalForm] = useState<UpdatePatientRecordInput>({
    occupation: detail.record.occupation,
    routineNotes: detail.record.routineNotes,
    followUpReason: detail.record.followUpReason,
    mainObjective: detail.record.mainObjective,
    clinicalObservations: detail.record.clinicalObservations,
    diagnosedConditions: detail.record.diagnosedConditions,
    previousSurgeries: detail.record.previousSurgeries,
    hospitalizations: detail.record.hospitalizations,
    allergies: detail.record.allergies,
    foodAllergiesIntolerances: detail.record.foodAllergiesIntolerances,
    currentMedications: detail.record.currentMedications,
    supplements: detail.record.supplements,
    familyHistory: detail.record.familyHistory,
    gastrointestinalNotes: detail.record.gastrointestinalNotes,
    bowelHabit: detail.record.bowelHabit,
    sleepNotes: detail.record.sleepNotes,
    hydrationNotes: detail.record.hydrationNotes,
    foodPreferences: detail.record.foodPreferences,
    dislikedFoods: detail.record.dislikedFoods,
    dietaryRestrictions: detail.record.dietaryRestrictions,
    usualEatingRoutine: detail.record.usualEatingRoutine,
    mealScheduleNotes: detail.record.mealScheduleNotes,
    appetiteNotes: detail.record.appetiteNotes,
    difficultiesAdherenceNotes: detail.record.difficultiesAdherenceNotes,
    physicalActivityNotes: detail.record.physicalActivityNotes,
    smokingStatus: detail.record.smokingStatus,
    alcoholNotes: detail.record.alcoholNotes,
    sleepRoutine: detail.record.sleepRoutine,
    workStudyRoutine: detail.record.workStudyRoutine,
  });

  // Form states for pregnancy
  const [pregnancyForm, setPregnancyForm] = useState<UpdatePregnancyInput>({
    pregnancyStatus: (detail.pregnancy?.pregnancyStatus || "NOT_APPLICABLE") as PregnancyStatus,
    estimatedDueDate: detail.pregnancy?.estimatedDueDate || null,
    gestationalWeeks: detail.pregnancy?.gestationalWeeks || null,
    lastMenstrualPeriodDate: detail.pregnancy?.lastMenstrualPeriodDate || null,
    prePregnancyWeightKg: detail.pregnancy?.prePregnancyWeightKg || null,
    currentPregnancyWeightKg: detail.pregnancy?.currentPregnancyWeightKg || null,
    pregnancyType: detail.pregnancy?.pregnancyType || null,
    pregnancyNotes: detail.pregnancy?.pregnancyNotes || null,
    obstetricNotes: detail.pregnancy?.obstetricNotes || null,
    supplementationNotes: detail.pregnancy?.supplementationNotes || null,
    deliveryDate: detail.pregnancy?.deliveryDate || null,
    breastfeedingStatus: detail.pregnancy?.breastfeedingStatus || null,
    postpartumNotes: detail.pregnancy?.postpartumNotes || null,
  });

  // State for new anthropometric entry modal
  const [showAddAnthro, setShowAddAnthro] = useState(false);
  const [newAnthro, setNewAnthro] = useState<AddAnthropometricEntryInput>({
    measurementDate: new Date().toISOString().slice(0, 10),
    weightKg: null,
    heightCm: null,
    waistCm: null,
    hipCm: null,
    armCm: null,
    thighCm: null,
    calfCm: null,
    chestCm: null,
    notes: null,
  });

  const handleSaveClinicalRecord = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await updatePatientRecordAction(slug, detail.student.membershipPublicId, clinicalForm);
      if (res.success) {
        setMessage({ type: "success", text: "Prontuário salvo com sucesso!" });
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao salvar prontuário." });
      }
    });
  };

  const handleSavePregnancy = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await updatePregnancyAction(slug, detail.student.membershipPublicId, pregnancyForm);
      if (res.success) {
        setMessage({ type: "success", text: "Dados gestacionais atualizados com sucesso!" });
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao salvar gestação." });
      }
    });
  };

  const handleAddAnthropometric = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await addAnthropometricEntryAction(slug, detail.student.membershipPublicId, newAnthro);
      if (res.success) {
        setShowAddAnthro(false);
        setMessage({ type: "success", text: "Nova medição registrada com sucesso!" });
        window.location.reload();
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao adicionar medição." });
      }
    });
  };

  const handleDeleteAnthropometric = (publicId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta medição?")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteAnthropometricEntryAction(slug, detail.student.membershipPublicId, publicId);
      if (res.success) {
        setMessage({ type: "success", text: "Medição excluída." });
        setDetail((prev) => ({
          ...prev,
          anthropometrics: prev.anthropometrics.filter((a) => a.publicId !== publicId),
        }));
      } else {
        setMessage({ type: "error", text: res.error || "Erro ao excluir medição." });
      }
    });
  };

  const handleCopyFromOnboarding = () => {
    const ob = detail.onboardingReference;
    if (!ob.hasOnboardingData) return;

    setClinicalForm((prev) => ({
      ...prev,
      occupation: prev.occupation || ob.occupation,
      mainObjective: prev.mainObjective || ob.mainObjective,
      foodAllergiesIntolerances: prev.foodAllergiesIntolerances || ob.foodAllergies,
      dietaryRestrictions: prev.dietaryRestrictions || ob.dietaryRestrictions,
      currentMedications: prev.currentMedications || ob.medications,
      diagnosedConditions: prev.diagnosedConditions || ob.healthConditions,
      previousSurgeries: prev.previousSurgeries || ob.surgeries,
      bowelHabit: prev.bowelHabit || ob.bowelHabit,
      hydrationNotes: prev.hydrationNotes || ob.waterIntake,
      foodPreferences: prev.foodPreferences || ob.preferredFoods,
      dislikedFoods: prev.dislikedFoods || ob.dislikedFoods,
      physicalActivityNotes: prev.physicalActivityNotes || ob.physicalActivity,
      smokingStatus: prev.smokingStatus || ob.smoking,
      alcoholNotes: prev.alcoholNotes || ob.alcoholFrequency,
    }));
    setMessage({ type: "success", text: "Dados do onboarding copiados para os campos de edição!" });
  };

  const trimesterLabel = deriveTrimester(pregnancyForm.gestationalWeeks ?? null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/consultoria/${slug}/planos-v2/prontuario`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar aos Pacientes
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {detail.student.fullName}
            <Badge variant="neutral" className="text-xs font-normal">
              Paciente Nutrição V2
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {detail.student.email} • Membro desde {new Date(detail.student.joinedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== "antropometria" && activeTab !== "gestacao" && (
            <Button
              onClick={handleSaveClinicalRecord}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isPending ? "Salvando..." : "Salvar Prontuário"}
            </Button>
          )}
          {activeTab === "gestacao" && (
            <Button
              onClick={handleSavePregnancy}
              disabled={isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
            >
              {isPending ? "Salvando..." : "Salvar Dados Gestacionais"}
            </Button>
          )}
          {activeTab === "antropometria" && (
            <Button
              onClick={() => setShowAddAnthro(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              + Nova Medição
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-border/40 pb-2">
        {(
          [
            { id: "resumo", label: "Resumo Geral" },
            { id: "clinico", label: "Histórico Clínico" },
            { id: "alimentar", label: "Histórico Alimentar" },
            { id: "estilo_vida", label: "Estilo de Vida" },
            { id: "antropometria", label: `Antropometria (${detail.anthropometrics.length})` },
            {
              id: "gestacao",
              label:
                pregnancyForm.pregnancyStatus === "PREGNANT"
                  ? "Gestação (Ativa)"
                  : pregnancyForm.pregnancyStatus === "POSTPARTUM"
                  ? "Pós-parto"
                  : "Gestação",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: RESUMO GERAL */}
      {activeTab === "resumo" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
              <h2 className="text-lg font-semibold text-foreground border-b border-border/20 pb-2">
                Informações Clínicas de Entrada
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-medium">Profissão / Ocupação</label>
                  <p className="font-medium text-foreground">{clinicalForm.occupation || "Não informada"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-medium">Objetivo Principal</label>
                  <p className="font-medium text-foreground">{clinicalForm.mainObjective || "Não informado"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-medium">Motivo do Acompanhamento</label>
                  <p className="text-foreground">{clinicalForm.followUpReason || "Não informado"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-medium">Alergias / Intolerâncias</label>
                  <p className="text-foreground">{clinicalForm.foodAllergiesIntolerances || "Nenhuma registrada"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
              <h2 className="text-lg font-semibold text-foreground border-b border-border/20 pb-2">
                Observações Clínicas Relevantes
              </h2>
              <textarea
                value={clinicalForm.clinicalObservations || ""}
                onChange={(e) =>
                  setClinicalForm({ ...clinicalForm, clinicalObservations: e.target.value })
                }
                rows={4}
                className="w-full text-sm rounded-lg border border-border/50 bg-background p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Anotações clínicas do nutricionista..."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">Dados de Onboarding</h3>
                <Badge variant="neutral" className="text-[10px]">
                  Somente Leitura
                </Badge>
              </div>

              {detail.onboardingReference.hasOnboardingData ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Data Nascimento:</span>{" "}
                    <span className="font-medium text-foreground">
                      {detail.onboardingReference.birthDate || "Não informada"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sexo Informado:</span>{" "}
                    <span className="font-medium text-foreground">
                      {detail.onboardingReference.sex || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peso Inicial Onboarding:</span>{" "}
                    <span className="font-medium text-foreground">
                      {detail.onboardingReference.reportedWeightKg
                        ? `${detail.onboardingReference.reportedWeightKg} kg`
                        : "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Altura Onboarding:</span>{" "}
                    <span className="font-medium text-foreground">
                      {detail.onboardingReference.reportedHeightCm
                        ? `${detail.onboardingReference.reportedHeightCm} cm`
                        : "Não informada"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Queixas / Saúde:</span>{" "}
                    <span className="text-foreground">
                      {detail.onboardingReference.healthConditions || "Nenhuma"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Atividade Física:</span>{" "}
                    <span className="text-foreground">
                      {detail.onboardingReference.physicalActivity || "Não informada"}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyFromOnboarding}
                    className="w-full mt-2 text-xs"
                  >
                    Importar para Edição do Prontuário
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum questionário de anamnese preenchido pelo aluno até o momento.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3 text-xs">
              <h4 className="font-medium text-foreground">Status do Paciente</h4>
              <div className="flex flex-wrap gap-2">
                {pregnancyForm.pregnancyStatus === "PREGNANT" && (
                  <Badge className="bg-purple-600/20 text-purple-700 dark:text-purple-300 border-purple-500/30">
                    Gestante {pregnancyForm.gestationalWeeks ? `(${pregnancyForm.gestationalWeeks} semanas)` : ""}
                  </Badge>
                )}
                {pregnancyForm.pregnancyStatus === "POSTPARTUM" && (
                  <Badge className="bg-pink-600/20 text-pink-700 dark:text-pink-300 border-pink-500/30">
                    Pós-Parto
                  </Badge>
                )}
                {detail.anthropometrics.length > 0 && (
                  <Badge variant="neutral">
                    Último peso: {detail.anthropometrics[0].weightKg} kg (
                    {detail.anthropometrics[0].measurementDate})
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTÓRICO CLÍNICO */}
      {activeTab === "clinico" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground text-sm border-b border-border/20 pb-2">
                Condições de Saúde e Histórico
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Patologias / Condições Diagnosticadas</label>
                  <textarea
                    value={clinicalForm.diagnosedConditions || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, diagnosedConditions: e.target.value })}
                    rows={3}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Diabetes Tipo 2, Hipertensão, Hipotireoidismo..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Cirurgias Prévias</label>
                  <input
                    type="text"
                    value={clinicalForm.previousSurgeries || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, previousSurgeries: e.target.value })}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Apendicectomia (2018), Colecistectomia (2021)..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Hospitalizações Relevantes</label>
                  <input
                    type="text"
                    value={clinicalForm.hospitalizations || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, hospitalizations: e.target.value })}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Histórico Familiar de Doenças</label>
                  <textarea
                    value={clinicalForm.familyHistory || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, familyHistory: e.target.value })}
                    rows={2}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Doença cardiovascular (pai), Diabetes (mãe)..."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground text-sm border-b border-border/20 pb-2">
                Alergias, Medicações e Gastrointestinal
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Alergias Gerais</label>
                  <input
                    type="text"
                    value={clinicalForm.allergies || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, allergies: e.target.value })}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Dipirona, Pólen..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Alergias e Intolerâncias Alimentares</label>
                  <textarea
                    value={clinicalForm.foodAllergiesIntolerances || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, foodAllergiesIntolerances: e.target.value })}
                    rows={2}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Lactose, Glúten, Amendoim, Frutos do mar..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Medicamentos de Uso Contínuo</label>
                  <textarea
                    value={clinicalForm.currentMedications || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, currentMedications: e.target.value })}
                    rows={2}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Levotiroxina 50mcg, Enalapril 10mg..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Suplementação em Uso</label>
                  <input
                    type="text"
                    value={clinicalForm.supplements || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, supplements: e.target.value })}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Whey protein, Creatina, Vitamina D..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Hábito Intestinal</label>
                    <input
                      type="text"
                      value={clinicalForm.bowelHabit || ""}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, bowelHabit: e.target.value })}
                      className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                      placeholder="Ex: Regular (diário)..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Hidratação (Água/dia)</label>
                    <input
                      type="text"
                      value={clinicalForm.hydrationNotes || ""}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, hydrationNotes: e.target.value })}
                      className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                      placeholder="Ex: 2.5 litros/dia..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Observações Gastrointestinais</label>
                  <input
                    type="text"
                    value={clinicalForm.gastrointestinalNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, gastrointestinalNotes: e.target.value })}
                    className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    placeholder="Ex: Refluxo ocasional, distensão abdominal..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTÓRICO ALIMENTAR */}
      {activeTab === "alimentar" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm border-b border-border/20 pb-2">
              Preferências e Restrições
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Alimentos Preferidos / Bem Aceitos</label>
                <textarea
                  value={clinicalForm.foodPreferences || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, foodPreferences: e.target.value })}
                  rows={3}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Frango grelhado, arroz, banana, aveia, ovos..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Alimentos Rejeitados / Não Consome</label>
                <textarea
                  value={clinicalForm.dislikedFoods || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, dislikedFoods: e.target.value })}
                  rows={3}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Fígado, peixe, quiabo, coentro..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Restrições Dietéticas / Padrão Alimentar</label>
                <input
                  type="text"
                  value={clinicalForm.dietaryRestrictions || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, dietaryRestrictions: e.target.value })}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Vegetariano, Vegano, Sem glúten, Halal..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm border-b border-border/20 pb-2">
              Rotina Alimentar e Apetite
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Rotina Alimentar Habitual</label>
                <textarea
                  value={clinicalForm.usualEatingRoutine || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, usualEatingRoutine: e.target.value })}
                  rows={3}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Café da manhã às 7h, almoço no trabalho às 12h, lanche às 16h..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Horários e Observações de Refeições</label>
                <input
                  type="text"
                  value={clinicalForm.mealScheduleNotes || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, mealScheduleNotes: e.target.value })}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Janela curta para almoçar, come fora 3x na semana..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Padrão de Apetite e Fome</label>
                <input
                  type="text"
                  value={clinicalForm.appetiteNotes || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, appetiteNotes: e.target.value })}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Mais fome no final da tarde, sem apetite ao acordar..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Dificuldades Prévias e Adesão</label>
                <textarea
                  value={clinicalForm.difficultiesAdherenceNotes || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, difficultiesAdherenceNotes: e.target.value })}
                  rows={2}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Dificuldade em preparar refeições aos finais de semana..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ESTILO DE VIDA */}
      {activeTab === "estilo_vida" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm border-b border-border/20 pb-2">
              Atividade Física e Sono
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Atividade Física e Exercícios</label>
                <textarea
                  value={clinicalForm.physicalActivityNotes || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, physicalActivityNotes: e.target.value })}
                  rows={3}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Musculação 4x/semana, corrida no sábado..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Rotina e Qualidade do Sono</label>
                <textarea
                  value={clinicalForm.sleepRoutine || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, sleepRoutine: e.target.value })}
                  rows={3}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Dorme às 23h, acorda às 6h30, sono reparador..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm border-b border-border/20 pb-2">
              Trabalho, Tabagismo e Álcool
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Rotina de Trabalho / Estudos</label>
                <textarea
                  value={clinicalForm.workStudyRoutine || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, workStudyRoutine: e.target.value })}
                  rows={2}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Trabalho administrativo sentado 8h/dia..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Tabagismo</label>
                <input
                  type="text"
                  value={clinicalForm.smokingStatus || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, smokingStatus: e.target.value })}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Não fumante / Ex-fumante / Fumante ocasional..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Consumo de Bebidas Alcoólicas</label>
                <input
                  type="text"
                  value={clinicalForm.alcoholNotes || ""}
                  onChange={(e) => setClinicalForm({ ...clinicalForm, alcoholNotes: e.target.value })}
                  className="w-full text-sm rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  placeholder="Ex: Socialmente aos finais de semana (1 a 2 doses)..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANTROPOMETRIA */}
      {activeTab === "antropometria" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-card p-5">
            <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-base">Histórico Antropométrico</h3>
                <p className="text-xs text-muted-foreground">Registro cronológico de medições físicas e corporais.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddAnthro(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                + Adicionar Medição
              </Button>
            </div>

            {detail.anthropometrics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma medição antropométrica registrada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-xs uppercase text-muted-foreground">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Peso</th>
                      <th className="py-2.5 px-3">Altura</th>
                      <th className="py-2.5 px-3">Cintura</th>
                      <th className="py-2.5 px-3">Quadril</th>
                      <th className="py-2.5 px-3">Braço</th>
                      <th className="py-2.5 px-3">Coxa</th>
                      <th className="py-2.5 px-3">Observações</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.anthropometrics.map((entry) => (
                      <tr key={entry.publicId} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 font-medium text-foreground">
                          {new Date(`${entry.measurementDate}T12:00:00Z`).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {entry.weightKg !== null ? `${entry.weightKg} kg` : "-"}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {entry.heightCm !== null ? `${entry.heightCm} cm` : "-"}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {entry.waistCm !== null ? `${entry.waistCm} cm` : "-"}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {entry.hipCm !== null ? `${entry.hipCm} cm` : "-"}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {entry.armCm !== null ? `${entry.armCm} cm` : "-"}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {entry.thighCm !== null ? `${entry.thighCm} cm` : "-"}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground max-w-xs truncate">
                          {entry.notes || "-"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAnthropometric(entry.publicId)}
                            className="text-xs text-destructive hover:underline"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal / Form for adding measurement */}
          {showAddAnthro && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-card border border-border/60 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-border/30 pb-2">
                  <h4 className="font-semibold text-foreground text-base">Nova Medição Antropométrica</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddAnthro(false)}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddAnthropometric} className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Data da Medição *</label>
                    <input
                      type="date"
                      required
                      value={newAnthro.measurementDate}
                      onChange={(e) => setNewAnthro({ ...newAnthro, measurementDate: e.target.value })}
                      className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Peso (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="500"
                        placeholder="Ex: 75.5"
                        value={newAnthro.weightKg ?? ""}
                        onChange={(e) =>
                          setNewAnthro({ ...newAnthro, weightKg: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Altura (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="40"
                        max="260"
                        placeholder="Ex: 175"
                        value={newAnthro.heightCm ?? ""}
                        onChange={(e) =>
                          setNewAnthro({ ...newAnthro, heightCm: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Cintura (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 82"
                        value={newAnthro.waistCm ?? ""}
                        onChange={(e) =>
                          setNewAnthro({ ...newAnthro, waistCm: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Quadril (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 98"
                        value={newAnthro.hipCm ?? ""}
                        onChange={(e) =>
                          setNewAnthro({ ...newAnthro, hipCm: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Braço (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 34"
                        value={newAnthro.armCm ?? ""}
                        onChange={(e) =>
                          setNewAnthro({ ...newAnthro, armCm: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Coxa (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 56"
                        value={newAnthro.thighCm ?? ""}
                        onChange={(e) =>
                          setNewAnthro({ ...newAnthro, thighCm: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Observações</label>
                    <input
                      type="text"
                      maxLength={500}
                      placeholder="Ex: Medição pós-treino..."
                      value={newAnthro.notes ?? ""}
                      onChange={(e) => setNewAnthro({ ...newAnthro, notes: e.target.value || null })}
                      className="w-full rounded-lg border border-border/50 bg-background p-2 mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddAnthro(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isPending ? "Salvando..." : "Salvar Medição"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: GESTAÇÃO */}
      {activeTab === "gestacao" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/20 pb-3">
              <div>
                <h3 className="font-semibold text-foreground text-base">Acompanhamento Gestacional e Pós-Parto</h3>
                <p className="text-xs text-muted-foreground">
                  Módulo clínico para registro obstétrico e acompanhamento nutricional.
                </p>
              </div>

              {trimesterLabel && (
                <Badge className="bg-purple-600 text-white text-xs px-3 py-1">
                  {trimesterLabel}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium uppercase">Status da Paciente</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: "NOT_APPLICABLE", label: "Não se Aplica" },
                    { id: "NOT_PREGNANT", label: "Não Gestante" },
                    { id: "PREGNANT", label: "Gestante" },
                    { id: "POSTPARTUM", label: "Pós-Parto" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setPregnancyForm({ ...pregnancyForm, pregnancyStatus: st.id })}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                      pregnancyForm.pregnancyStatus === st.id
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {pregnancyForm.pregnancyStatus === "PREGNANT" && (
              <div className="space-y-4 pt-4 border-t border-border/20 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Semana Gestacional</label>
                    <input
                      type="number"
                      min="1"
                      max="45"
                      placeholder="Ex: 24"
                      value={pregnancyForm.gestationalWeeks ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          gestationalWeeks: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Data Provável do Parto (DPP)</label>
                    <input
                      type="date"
                      value={pregnancyForm.estimatedDueDate ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          estimatedDueDate: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Data Última Menstruação (DUM)</label>
                    <input
                      type="date"
                      value={pregnancyForm.lastMenstrualPeriodDate ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          lastMenstrualPeriodDate: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Peso Pré-Gestacional (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 62.0"
                      value={pregnancyForm.prePregnancyWeightKg ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          prePregnancyWeightKg: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Peso Gestacional Atual (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 68.5"
                      value={pregnancyForm.currentPregnancyWeightKg ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          currentPregnancyWeightKg: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Tipo de Gestação</label>
                    <select
                      value={pregnancyForm.pregnancyType || "SINGLETON"}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          pregnancyType: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    >
                      <option value="SINGLETON">Única</option>
                      <option value="TWINS">Gemelar</option>
                      <option value="TRIPLETS_PLUS">Trigêmeos ou mais</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Suplementação Obstétrica</label>
                    <input
                      type="text"
                      placeholder="Ex: Ácido fólico 400mcg, Ferro 30mg, Ômega-3 DHA..."
                      value={pregnancyForm.supplementationNotes ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          supplementationNotes: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Observações Obstétricas e Clínicas</label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Pré-natal de baixo risco, sem glicemia alterada no TOTG..."
                      value={pregnancyForm.obstetricNotes ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          obstetricNotes: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {pregnancyForm.pregnancyStatus === "POSTPARTUM" && (
              <div className="space-y-4 pt-4 border-t border-border/20 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Data do Parto</label>
                    <input
                      type="date"
                      value={pregnancyForm.deliveryDate ?? ""}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          deliveryDate: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Status de Amamentação</label>
                    <select
                      value={pregnancyForm.breastfeedingStatus || "EXCLUSIVE"}
                      onChange={(e) =>
                        setPregnancyForm({
                          ...pregnancyForm,
                          breastfeedingStatus: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                    >
                      <option value="EXCLUSIVE">Aleitamento Materno Exclusivo</option>
                      <option value="PARTIAL">Aleitamento Misto / Parcial</option>
                      <option value="FORMULA_ONLY">Fórmula Infantil Exclusiva</option>
                      <option value="WEANED">Desmamado</option>
                      <option value="NOT_APPLICABLE">Não se Aplica</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium">Observações do Pós-Parto</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Recuperação puerperal satisfatória, boa ingestão hídrica para lactação..."
                    value={pregnancyForm.postpartumNotes ?? ""}
                    onChange={(e) =>
                      setPregnancyForm({
                        ...pregnancyForm,
                        postpartumNotes: e.target.value || null,
                      })
                    }
                    className="w-full rounded-lg border border-border/50 bg-background p-2.5 mt-1"
                  />
                </div>
              </div>
            )}

            {pregnancyForm.pregnancyStatus !== "PREGNANT" && pregnancyForm.pregnancyStatus !== "POSTPARTUM" && (
              <p className="text-xs text-muted-foreground py-2">
                Nenhum acompanhamento obstétrico ativo para este paciente. Altere o status acima caso deseje registrar gestação ou puerpério.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
