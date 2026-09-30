/**
 * TREVO ONE — OPENAI IMPORT PROVIDER ABSTRACTION
 * Decouples production OpenAI API calls from deterministic mock providers
 * for zero-cost, high-speed automated testing.
 */

import {
  type DocumentInput,
  type ExtractionMetadata,
  callOpenAiForTraining,
  callOpenAiForNutrition,
  DEFAULT_OPENAI_IMPORT_MODEL,
  isOpenAiConfigured,
} from "./openai-client";
import type {
  RawTrainingImportProposal,
  RawNutritionImportProposal,
} from "./schemas";

export interface OpenAIImportProvider {
  importTraining(
    input: DocumentInput,
    model?: string
  ): Promise<{ proposal: RawTrainingImportProposal; metadata: ExtractionMetadata }>;

  importNutrition(
    input: DocumentInput,
    model?: string
  ): Promise<{ proposal: RawNutritionImportProposal; metadata: ExtractionMetadata }>;
}

export class RealOpenAIImportProvider implements OpenAIImportProvider {
  async importTraining(
    input: DocumentInput,
    model = DEFAULT_OPENAI_IMPORT_MODEL
  ): Promise<{ proposal: RawTrainingImportProposal; metadata: ExtractionMetadata }> {
    return await callOpenAiForTraining(input, model);
  }

  async importNutrition(
    input: DocumentInput,
    model = DEFAULT_OPENAI_IMPORT_MODEL
  ): Promise<{ proposal: RawNutritionImportProposal; metadata: ExtractionMetadata }> {
    return await callOpenAiForNutrition(input, model);
  }
}

export interface MockProviderOptions {
  forceError?: "TIMEOUT" | "500_SERVER_ERROR" | "NETWORK_ERROR";
  customTrainingProposal?: RawTrainingImportProposal;
  customNutritionProposal?: RawNutritionImportProposal;
}

export class MockOpenAIImportProvider implements OpenAIImportProvider {
  private options: MockProviderOptions;

  constructor(options: MockProviderOptions = {}) {
    this.options = options;
  }

  setOptions(options: MockProviderOptions) {
    this.options = options;
  }

  async importTraining(
    input: DocumentInput,
    model = "mock-model"
  ): Promise<{ proposal: RawTrainingImportProposal; metadata: ExtractionMetadata }> {
    if (this.options.forceError === "TIMEOUT") {
      throw new Error("OpenAI API request timed out after 30000ms.");
    }
    if (this.options.forceError === "500_SERVER_ERROR") {
      throw new Error("OpenAI Internal Server Error (500).");
    }
    if (this.options.forceError === "NETWORK_ERROR") {
      throw new Error("Network connection error to api.openai.com.");
    }

    if (this.options.customTrainingProposal) {
      return {
        proposal: this.options.customTrainingProposal,
        metadata: {
          inputTokens: 120,
          outputTokens: 250,
          totalTokens: 370,
          model,
          providerRequestId: "mock-req-custom",
        },
      };
    }

    const textContent = input.text || (input.buffer ? input.buffer.toString("utf8") : "");

    // Deterministic mock generation based on document contents
    let studentCandidate: string | null = null;
    if (textContent.toLowerCase().includes("marcos")) {
      studentCandidate = "Marcos Silva";
    }

    const categories: RawTrainingImportProposal["categories"] = [];

    // Category: Peito / Superior
    categories.push({
      name: "PEITO",
      exercises: [
        {
          originalText: "Supino reto com barra — 4 séries de 10 reps, 60s descanso, 30kg",
          exerciseNameCandidate: "Supino reto",
          sets: 4,
          reps: 10,
          durationSeconds: null,
          restSeconds: 60,
          load: 30,
          notes: "Manter escápulas aduzidas",
        },
        {
          originalText: "Crucifixo inclinado com halteres 3x12 descanso 45s",
          exerciseNameCandidate: "Crucifixo inclinado",
          sets: 3,
          reps: 12,
          durationSeconds: null,
          restSeconds: 45,
          load: null,
          notes: null,
        },
      ],
    });

    // Check for ambiguity test case: "Remada"
    if (textContent.toLowerCase().includes("remada")) {
      categories.push({
        name: "COSTAS",
        exercises: [
          {
            originalText: "Remada — 4x10",
            exerciseNameCandidate: "Remada",
            sets: 4,
            reps: 10,
            durationSeconds: null,
            restSeconds: null,
            load: null,
            notes: null,
          },
        ],
      });
    }

    // Check for not found test case
    if (textContent.toLowerCase().includes("alienígena") || textContent.toLowerCase().includes("desconhecido")) {
      categories.push({
        name: "OUTROS",
        exercises: [
          {
            originalText: "Exercício Alienígena 999 — 3x15",
            exerciseNameCandidate: "Exercício Alienígena 999",
            sets: 3,
            reps: 15,
            durationSeconds: null,
            restSeconds: null,
            load: null,
            notes: null,
          },
        ],
      });
    }

    const proposal: RawTrainingImportProposal = {
      title: "Ficha Hipertrofia V1",
      studentNameCandidate: studentCandidate,
      objective: "Hipertrofia",
      notes: "Periodização de 8 semanas",
      categories,
    };

    return {
      proposal,
      metadata: {
        inputTokens: 150,
        outputTokens: 300,
        totalTokens: 450,
        model,
        providerRequestId: "mock-req-tr-001",
      },
    };
  }

  async importNutrition(
    input: DocumentInput,
    model = "mock-model"
  ): Promise<{ proposal: RawNutritionImportProposal; metadata: ExtractionMetadata }> {
    if (this.options.forceError === "TIMEOUT") {
      throw new Error("OpenAI API request timed out after 30000ms.");
    }
    if (this.options.forceError === "500_SERVER_ERROR") {
      throw new Error("OpenAI Internal Server Error (500).");
    }
    if (this.options.forceError === "NETWORK_ERROR") {
      throw new Error("Network connection error to api.openai.com.");
    }

    if (this.options.customNutritionProposal) {
      return {
        proposal: this.options.customNutritionProposal,
        metadata: {
          inputTokens: 140,
          outputTokens: 280,
          totalTokens: 420,
          model,
          providerRequestId: "mock-req-custom-nutri",
        },
      };
    }

    const textContent = input.text || (input.buffer ? input.buffer.toString("utf8") : "");

    let patientCandidate: string | null = null;
    if (textContent.toLowerCase().includes("joão") || textContent.toLowerCase().includes("joao")) {
      patientCandidate = "João Silva";
    }

    const meals: RawNutritionImportProposal["meals"] = [];

    // Meal 1: Café da Manhã
    meals.push({
      name: "Café da Manhã",
      time: "08:00",
      notes: "Mastigar devagar",
      foods: [
        {
          originalText: "Pão francês 1 unidade (50g)",
          foodNameCandidate: "Pão francês",
          quantity: 1,
          unitCandidate: "unidade",
          notes: null,
          sourceDocumentClaim: null,
        },
        {
          originalText: "Ovo mexido 2 unidades",
          foodNameCandidate: "Ovo de galinha mexido",
          quantity: 2,
          unitCandidate: "unidade",
          notes: null,
          sourceDocumentClaim: null,
        },
      ],
    });

    // Meal 2: Almoço - includes Critical Test fixture if requested
    const lunchFoods: RawNutritionImportProposal["meals"][0]["foods"] = [];

    if (textContent.includes("999 kcal") || textContent.toLowerCase().includes("arroz")) {
      // CRITICAL NUTRITION TEST FIXTURE:
      // Document claims 999 kcal for 100g rice. Trevo MUST ignore this claim as authority!
      lunchFoods.push({
        originalText: "100g Arroz cozido = 999 kcal alegadas no PDF",
        foodNameCandidate: "Arroz branco cozido",
        quantity: 100,
        unitCandidate: "g",
        notes: null,
        sourceDocumentClaim: {
          kcal: 999,
          protein: 50,
          carbs: 180,
          fat: 20,
        },
      });
    }

    // Cooking preparation test: "Mandioca cozida" vs "Mandioca crua"
    if (textContent.toLowerCase().includes("mandioca") || textContent.toLowerCase().includes("aipim")) {
      lunchFoods.push({
        originalText: "150g Mandioca cozida",
        foodNameCandidate: "Mandioca cozida",
        quantity: 150,
        unitCandidate: "g",
        notes: null,
        sourceDocumentClaim: null,
      });
    }

    // Ambiguity test: "Banana"
    if (textContent.toLowerCase().includes("banana")) {
      lunchFoods.push({
        originalText: "Banana 1 unidade",
        foodNameCandidate: "Banana",
        quantity: 1,
        unitCandidate: "unidade",
        notes: null,
        sourceDocumentClaim: null,
      });
    }

    // Not found test
    if (textContent.toLowerCase().includes("fruta galáctica") || textContent.toLowerCase().includes("desconhecido")) {
      lunchFoods.push({
        originalText: "Fruta Galáctica 100g",
        foodNameCandidate: "Fruta Galáctica 999",
        quantity: 100,
        unitCandidate: "g",
        notes: null,
        sourceDocumentClaim: null,
      });
    }

    // Default food if lunch is empty
    if (lunchFoods.length === 0) {
      lunchFoods.push({
        originalText: "100g Peito de frango grelhado",
        foodNameCandidate: "Peito de frango grelhado",
        quantity: 100,
        unitCandidate: "g",
        notes: null,
        sourceDocumentClaim: null,
      });
    }

    meals.push({
      name: "Almoço",
      time: "12:30",
      notes: null,
      foods: lunchFoods,
    });

    const proposal: RawNutritionImportProposal = {
      title: "Plano Alimentar Eutrófico",
      patientNameCandidate: patientCandidate,
      objective: "Emagrecimento",
      notes: "Ingerir 2,5L de água por dia",
      meals,
    };

    return {
      proposal,
      metadata: {
        inputTokens: 160,
        outputTokens: 320,
        totalTokens: 480,
        model,
        providerRequestId: "mock-req-nu-001",
      },
    };
  }
}

// Global active provider override (useful for tests)
let activeProviderOverride: OpenAIImportProvider | null = null;

export function setGlobalAiImportProvider(provider: OpenAIImportProvider | null): void {
  activeProviderOverride = provider;
}

export function getAiImportProvider(): OpenAIImportProvider {
  if (activeProviderOverride) {
    return activeProviderOverride;
  }

  // If AI_MOCK_PROVIDER=true or no OPENAI_API_KEY in non-prod environment, fallback to mock
  if (process.env.AI_MOCK_PROVIDER === "true" || !isOpenAiConfigured()) {
    return new MockOpenAIImportProvider();
  }

  return new RealOpenAIImportProvider();
}
