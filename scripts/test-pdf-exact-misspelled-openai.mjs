import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

register(pathToFileURL(path.resolve("scripts/ts-loader.mjs")).href, import.meta.url);

const { callOpenAiForTraining } = await import(
  pathToFileURL(path.resolve("lib/ai/openai-client.ts")).href
);
const { generateTrainingPlanPdfBuffer } = await import(
  pathToFileURL(path.resolve("lib/training-v2/generate-training-pdf.ts")).href
);

const samplePlan = {
  title: "Treino de Força A",
  subtitle: "Prescrição com grafia original",
  objective: "Hipertrofia",
  studentName: "Aluno Teste Ortografia",
  personalTrainerName: "Personal Trainer QA",
  consultancyName: "Trevo One QA",
  generationDateFormatted: "12/10/2026",
  isDraft: false,
  blocks: [
    {
      name: "Treino A",
      instructions: "Executar na ordem",
      exercises: [
        {
          name: "Puxada frental triangulo",
          summaryString: "3 séries | 12 repetições",
          setsDetail: [
            { setNumber: 1, reps: 12 },
            { setNumber: 2, reps: 12 },
            { setNumber: 3, reps: 12 },
          ],
        },
        {
          name: "Supino reto halteris",
          summaryString: "4 séries | 8-10 repetições",
          setsDetail: [
            { setNumber: 1, reps: 8 },
            { setNumber: 2, reps: 10 },
            { setNumber: 3, reps: 8 },
            { setNumber: 4, reps: 10 },
          ],
        },
        {
          name: "Elevação monstra do João",
          summaryString: "3 séries | Até a falha (3xF)",
          notes: "3xF",
          setsDetail: [
            { setNumber: 1, reps: null },
            { setNumber: 2, reps: null },
            { setNumber: 3, reps: null },
          ],
        },
        {
          name: "Remada máquina",
          summaryString: "3 séries | 12+10",
          notes: "12+10",
          setsDetail: [
            { setNumber: 1, reps: 12 },
            { setNumber: 2, reps: 12 },
            { setNumber: 3, reps: 12 },
          ],
        },
        {
          name: "Puxada frental triangulo",
          summaryString: "1 série | AMRAP",
          notes: "AMRAP",
          setsDetail: [
            { setNumber: 1, reps: null },
          ],
        },
      ],
    },
  ],
};

console.log("=== 1. GERANDO PDF LOCALMENTE COM @react-pdf/renderer ===");
const pdfBuffer = await generateTrainingPlanPdfBuffer(samplePlan);
console.log(`PDF Buffer gerado com sucesso: ${pdfBuffer.length} bytes (Header: ${pdfBuffer.slice(0, 5).toString("ascii")})`);

console.log("\n=== 2. PASSANDO PELO MESMO callOpenAiForTraining COM gpt-4o ===");
try {
  const result = await callOpenAiForTraining({
    buffer: pdfBuffer,
    filename: "treino-ortografia-teste.pdf",
    mimeType: "application/pdf",
  });

  console.log("\n=== 3. JSON BRUTO COMPLETO DA PROPOSTA ===");
  console.log(JSON.stringify(result.proposal, null, 2));

  console.log("\n=== 4. METADATA DA EXTRAÇÃO ===");
  console.log(JSON.stringify(result.metadata, null, 2));

  console.log("\n=== 5. ANÁLISE DE PRESERVAÇÃO ORTOGRÁFICA ===");
  const expectedItems = [
    "Puxada frental triangulo",
    "Supino reto halteris",
    "Elevação monstra do João",
    "Remada máquina",
    "Puxada frental triangulo",
  ];

  const extractedExercises = result.proposal.categories?.flatMap((c) => c.exercises) || [];
  console.log(`Total de exercícios extraídos: ${extractedExercises.length}`);

  for (let i = 0; i < expectedItems.length; i++) {
    const expected = expectedItems[i];
    const actual = extractedExercises[i];
    const candidate = actual?.exerciseNameCandidate || "N/A";
    const originalText = actual?.originalText || "N/A";
    const isVerbatim = candidate.toLowerCase().trim() === expected.toLowerCase().trim();
    console.log(`Item ${i + 1}:`);
    console.log(`  Esperado : "${expected}"`);
    console.log(`  Extraído : candidate="${candidate}" | originalText="${originalText}"`);
    console.log(`  Verbatim : ${isVerbatim ? "SIM (preservado sem correção)" : "NÃO (modificado pelo modelo)"}`);
  }
} catch (err) {
  console.error("ERRO ao chamar callOpenAiForTraining:", err);
}
