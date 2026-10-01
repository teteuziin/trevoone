/**
 * TREVO ONE — AI IMPORT STRUCTURED OUTPUT SCHEMAS
 * Strict JSON Schemas for OpenAI Structured Outputs
 */

export interface RawTrainingExerciseItem {
  originalText: string;
  exerciseNameCandidate: string;
  sets: number | null;
  reps: number | null;
  repsMax?: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  load: number | null;
  notes: string | null;
}

export interface RawTrainingCategory {
  name: string;
  exercises: RawTrainingExerciseItem[];
}

export interface RawTrainingImportProposal {
  title: string;
  studentNameCandidate: string | null;
  objective: string | null;
  notes: string | null;
  categories: RawTrainingCategory[];
}

export interface RawNutritionFoodItem {
  originalText: string;
  foodNameCandidate: string;
  quantity: number | null;
  unitCandidate: string | null;
  notes: string | null;
  sourceDocumentClaim: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  substitutions?: RawNutritionFoodItem[];
}

export interface RawNutritionMeal {
  name: string;
  time: string | null;
  notes: string | null;
  foods: RawNutritionFoodItem[];
}

export interface RawNutritionImportProposal {
  title: string;
  patientNameCandidate: string | null;
  objective: string | null;
  notes: string | null;
  meals: RawNutritionMeal[];
}

export const TRAINING_IMPORT_JSON_SCHEMA = {
  name: "training_import_v1",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      studentNameCandidate: { type: ["string", "null"] },
      objective: { type: ["string", "null"] },
      notes: { type: ["string", "null"] },
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  originalText: { type: "string" },
                  exerciseNameCandidate: { type: "string" },
                  sets: { type: ["number", "null"] },
                  reps: { type: ["number", "null"] },
                  repsMax: { type: ["number", "null"] },
                  durationSeconds: { type: ["number", "null"] },
                  restSeconds: { type: ["number", "null"] },
                  load: { type: ["number", "null"] },
                  notes: { type: ["string", "null"] },
                },
                required: [
                  "originalText",
                  "exerciseNameCandidate",
                  "sets",
                  "reps",
                  "repsMax",
                  "durationSeconds",
                  "restSeconds",
                  "load",
                  "notes",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "exercises"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "studentNameCandidate", "objective", "notes", "categories"],
    additionalProperties: false,
  },
};

export const NUTRITION_IMPORT_JSON_SCHEMA = {
  name: "nutrition_import_v1",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      patientNameCandidate: { type: ["string", "null"] },
      objective: { type: ["string", "null"] },
      notes: { type: ["string", "null"] },
      meals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            time: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
            foods: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  originalText: { type: "string" },
                  foodNameCandidate: { type: "string" },
                  quantity: { type: ["number", "null"] },
                  unitCandidate: { type: ["string", "null"] },
                  notes: { type: ["string", "null"] },
                  sourceDocumentClaim: {
                    type: ["object", "null"],
                    properties: {
                      kcal: { type: ["number", "null"] },
                      protein: { type: ["number", "null"] },
                      carbs: { type: ["number", "null"] },
                      fat: { type: ["number", "null"] },
                    },
                    required: ["kcal", "protein", "carbs", "fat"],
                    additionalProperties: false,
                  },
                  substitutions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        originalText: { type: "string" },
                        foodNameCandidate: { type: "string" },
                        quantity: { type: ["number", "null"] },
                        unitCandidate: { type: ["string", "null"] },
                        notes: { type: ["string", "null"] },
                        sourceDocumentClaim: {
                          type: ["object", "null"],
                          properties: {
                            kcal: { type: ["number", "null"] },
                            protein: { type: ["number", "null"] },
                            carbs: { type: ["number", "null"] },
                            fat: { type: ["number", "null"] },
                          },
                          required: ["kcal", "protein", "carbs", "fat"],
                          additionalProperties: false,
                        },
                      },
                      required: [
                        "originalText",
                        "foodNameCandidate",
                        "quantity",
                        "unitCandidate",
                        "notes",
                        "sourceDocumentClaim",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "originalText",
                  "foodNameCandidate",
                  "quantity",
                  "unitCandidate",
                  "notes",
                  "sourceDocumentClaim",
                  "substitutions",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "time", "notes", "foods"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "patientNameCandidate", "objective", "notes", "meals"],
    additionalProperties: false,
  },
};
