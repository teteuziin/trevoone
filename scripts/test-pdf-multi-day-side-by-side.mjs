import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);
import assert from "node:assert/strict";

const { generateTrainingPlanPdfBuffer } = await import("../lib/training-v2/generate-training-pdf.ts");

console.log("=== TESTE DE PDF MULTI-DIAS LADO A LADO ===");

const multiDayPlan = {
  title: "Ficha Semanal Completa ABCDE",
  subtitle: "Divisão 5 Dias Lado a Lado",
  objective: "Hipertrofia e definição",
  studentName: "Djean Silva",
  personalTrainerName: "Coach Roberto Santos",
  consultancyName: "Saiya Shape",
  startsOnFormatted: "19/10/2026",
  generationDateFormatted: "18/10/2026 às 22:30",
  notes: "Treinar com cadência controlada e descansar de acordo com o planejado.",
  isDraft: false,
  versionNumber: 3,
  blocks: [
    {
      name: "Segunda • Quadríceps",
      instructions: "Foco em carga no agachamento",
      exercises: [
        {
          name: "Agachamento no Smith",
          muscleGroup: "Quadríceps",
          equipment: "Smith Machine",
          notes: "Descida lenta a cada 3 repetições",
          summaryString: "4 séries x 9 a 12 reps (Carga: 60 kg) · Descanso: 90s",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 10, loadKg: 60, restSeconds: 90 }],
        },
        {
          name: "Leg Press 45°",
          muscleGroup: "Quadríceps",
          equipment: "Aparelho",
          notes: "Amplitude máxima",
          summaryString: "3 séries x 12 reps (Carga: 180 kg) · Descanso: 60s",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 12, loadKg: 180, restSeconds: 60 }],
        },
        {
          name: "Cadeira Extensora",
          muscleGroup: "Quadríceps",
          equipment: "Máquina",
          notes: "Pico de contração 2s",
          summaryString: "3 séries x 15 reps · Descanso: 45s",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 15, restSeconds: 45 }],
        },
      ],
    },
    {
      name: "Terça • Peito e Tríceps",
      instructions: "Aquecer manguito",
      exercises: [
        {
          name: "Supino Reto com Barra",
          muscleGroup: "Peitoral",
          equipment: "Barra",
          notes: null,
          summaryString: "4 séries x 8 a 10 reps (Carga: 80 kg) · Descanso: 90s",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 8, loadKg: 80, restSeconds: 90 }],
        },
        {
          name: "Supino Inclinado com Halteres",
          muscleGroup: "Peitoral Superior",
          equipment: "Halteres",
          notes: null,
          summaryString: "3 séries x 10 a 12 reps",
          combinationId: "comb-1",
          combinationType: "BI_SET",
          combinationTitle: "Bi-set Peito Superior",
          combinationRestSeconds: 60,
          setsDetail: [{ setNumber: 1, reps: 10, restSeconds: 0 }],
        },
        {
          name: "Crucifixo Inclinado",
          muscleGroup: "Peitoral Superior",
          equipment: "Halteres",
          notes: null,
          summaryString: "3 séries x 12 reps",
          combinationId: "comb-1",
          combinationType: "BI_SET",
          combinationTitle: "Bi-set Peito Superior",
          combinationRestSeconds: 60,
          setsDetail: [{ setNumber: 1, reps: 12, restSeconds: 60 }],
        },
      ],
    },
    {
      name: "Quarta • Costas e Bíceps",
      instructions: "Puxar com as costas, não com os braços",
      exercises: [
        {
          name: "Puxada Frontal",
          muscleGroup: "Dorsal",
          equipment: "Polia",
          notes: null,
          summaryString: "4 séries x 10 reps (Carga: 65 kg)",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 10, loadKg: 65, restSeconds: 60 }],
        },
        {
          name: "Remada Curvada",
          muscleGroup: "Dorsal",
          equipment: "Barra",
          notes: null,
          summaryString: "4 séries x 8 a 10 reps",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 8, restSeconds: 60 }],
        },
      ],
    },
    {
      name: "Quinta • Posterior e Glúteo",
      instructions: "Alongamento na descida",
      exercises: [
        {
          name: "Stiff com Halteres",
          muscleGroup: "Posterior de Coxa",
          equipment: "Halteres",
          notes: "Coluna neutra",
          summaryString: "4 séries x 10 a 12 reps",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 10, restSeconds: 60 }],
        },
        {
          name: "Mesa Flexora",
          muscleGroup: "Posterior de Coxa",
          equipment: "Máquina",
          notes: null,
          summaryString: "3 séries x 12 reps",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 12, restSeconds: 45 }],
        },
      ],
    },
    {
      name: "Sexta • Ombros e Braços",
      instructions: "Sem balanço",
      exercises: [
        {
          name: "Desenvolvimento com Halteres",
          muscleGroup: "Ombros",
          equipment: "Halteres",
          notes: null,
          summaryString: "4 séries x 10 reps",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 10, restSeconds: 60 }],
        },
        {
          name: "Elevação Lateral",
          muscleGroup: "Deltoide Lateral",
          equipment: "Halteres",
          notes: null,
          summaryString: "4 séries x 12 a 15 reps",
          combinationId: null,
          setsDetail: [{ setNumber: 1, reps: 12, restSeconds: 45 }],
        },
      ],
    },
  ],
};

const pdfBuffer = await generateTrainingPlanPdfBuffer(multiDayPlan);
assert.ok(Buffer.isBuffer(pdfBuffer), "Must return a Buffer");
assert.ok(pdfBuffer.length > 2000, `Buffer must be > 2000 bytes (got ${pdfBuffer.length})`);
assert.equal(pdfBuffer.slice(0, 5).toString("utf-8"), "%PDF-", "Buffer must start with %PDF-");

console.log(`✓ 5 dias lado a lado gerados com sucesso! Tamanho: ${pdfBuffer.length} bytes`);
console.log("=== TODOS OS TESTES DE PDF MULTI-DIAS PASSARAM! ===");
