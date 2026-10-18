import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const { generateTrainingPlanPdfBuffer, createSafeTrainingPdfFilename } = await import("../lib/training-v2/generate-training-pdf.ts");

async function runPdfQaTest() {
  console.log("=== INICIANDO TESTE DE QA DO GERADOR DE PDF V2 ===");

  const mockPlan = {
    title: "Hipertrofia Avançada — Trevo Pro",
    subtitle: "Ciclo 1: Força e Densidade",
    objective: "Hipertrofia miofibrilar com foco em peitorais e deltoides",
    studentName: "Carlos Eduardo Silva",
    personalTrainerName: "Coach Roberto Santos",
    consultancyName: "Studio Performance Trevo",
    startsOnFormatted: "19/10/2026",
    generationDateFormatted: "18/10/2026 às 20:00",
    notes: "Aquecer 10 minutos na esteira ou mobilidade articular antes de iniciar. Respeitar o tempo de descanso.",
    isDraft: false,
    versionNumber: 2,
    blocks: [
      {
        name: "Treino A — Peito e Tríceps (Foco em Carga)",
        instructions: "Execução controlada, cadência 3-0-1-0.",
        exercises: [
          {
            name: "Supino Reto com Barra",
            muscleGroup: "Peitoral",
            equipment: "Barra e Banco Reto",
            notes: "Manter escápulas aduzidas. Pausa de 1s embaixo.",
            summaryString: "4 séries x 8 a 10 reps (Carga: 80 kg) · Descanso: 90s",
            combinationId: null,
            setsDetail: [
              { setNumber: 1, reps: 10, loadKg: 80, restSeconds: 90 },
              { setNumber: 2, reps: 10, loadKg: 80, restSeconds: 90 },
              { setNumber: 3, reps: 8, loadKg: 85, restSeconds: 90 },
              { setNumber: 4, reps: 8, loadKg: 85, restSeconds: 90 },
            ],
          },
          // Bi-set combination
          {
            name: "Supino Inclinado com Halteres",
            muscleGroup: "Peitoral Superior",
            equipment: "Halteres",
            notes: "Amplitude máxima.",
            summaryString: "3 voltas x 10 a 12 reps (Carga: 26 kg)",
            combinationId: "comb-biset-1",
            combinationType: "BI_SET",
            combinationTitle: "Bi-set Peito Superior",
            combinationRestSeconds: 60,
            setsDetail: [
              { setNumber: 1, reps: 12, loadKg: 26, restSeconds: 0 },
              { setNumber: 2, reps: 10, loadKg: 26, restSeconds: 0 },
              { setNumber: 3, reps: 10, loadKg: 26, restSeconds: 0 },
            ],
          },
          {
            name: "Crucifixo Inclinado com Halteres",
            muscleGroup: "Peitoral Superior",
            equipment: "Halteres",
            notes: "Leve flexão de cotovelos, sem bater os halteres no topo.",
            summaryString: "3 voltas x 12 a 15 reps (Carga: 14 kg)",
            combinationId: "comb-biset-1",
            combinationType: "BI_SET",
            combinationTitle: "Bi-set Peito Superior",
            combinationRestSeconds: 60,
            setsDetail: [
              { setNumber: 1, reps: 15, loadKg: 14, restSeconds: 60 },
              { setNumber: 2, reps: 12, loadKg: 14, restSeconds: 60 },
              { setNumber: 3, reps: 12, loadKg: 14, restSeconds: 60 },
            ],
          },
          // Sequence / Custom exercise
          {
            name: "Tríceps Pulley + Francês (Sequência Combinada)",
            muscleGroup: "Tríceps",
            equipment: "Polia",
            notes: "Sequência fluida sem pausa entre fases.",
            summaryString: "3 séries x 12 reps · Descanso: 60s",
            combinationId: null,
            isSequence: true,
            sequenceMovements: ["Tríceps Corda no Pulley", "Extensão Francesa Unilateral"],
            setsDetail: [
              { setNumber: 1, reps: 12, loadKg: 25, restSeconds: 60 },
              { setNumber: 2, reps: 12, loadKg: 25, restSeconds: 60 },
              { setNumber: 3, reps: 10, loadKg: 25, restSeconds: 60 },
            ],
          },
          {
            name: "Tríceps Testa com Barra W",
            muscleGroup: "Tríceps",
            equipment: "Barra W",
            notes: "Manter cotovelos fechados.",
            summaryString: "3 séries x 10 a 12 reps (Carga: 20 kg) · Descanso: 60s",
            combinationId: null,
            setsDetail: [
              { setNumber: 1, reps: 12, loadKg: 20, restSeconds: 60 },
              { setNumber: 2, reps: 10, loadKg: 20, restSeconds: 60 },
              { setNumber: 3, reps: 10, loadKg: 20, restSeconds: 60 },
            ],
          },
        ],
      },
      {
        name: "Treino B — Costas e Bíceps (Densidade)",
        instructions: "Foco na contração dorsal completa.",
        exercises: [
          {
            name: "Puxada Frontal Aberta",
            muscleGroup: "Dorsal",
            equipment: "Polia Alta",
            notes: "Trazer a barra até a altura da clavícula.",
            summaryString: "4 séries x 10 a 12 reps (Carga: 60 kg) · Descanso: 75s",
            combinationId: null,
            setsDetail: [
              { setNumber: 1, reps: 12, loadKg: 60, restSeconds: 75 },
              { setNumber: 2, reps: 10, loadKg: 60, restSeconds: 75 },
              { setNumber: 3, reps: 10, loadKg: 65, restSeconds: 75 },
              { setNumber: 4, reps: 8, loadKg: 65, restSeconds: 75 },
            ],
          },
          {
            name: "Remada Curvada com Barra",
            muscleGroup: "Costas",
            equipment: "Barra",
            notes: "Tronco inclinado a 45 graus, coluna alinhada.",
            summaryString: "4 séries x 8 a 10 reps (Carga: 50 kg) · Descanso: 90s",
            combinationId: null,
            setsDetail: [
              { setNumber: 1, reps: 10, loadKg: 50, restSeconds: 90 },
              { setNumber: 2, reps: 10, loadKg: 50, restSeconds: 90 },
              { setNumber: 3, reps: 8, loadKg: 55, restSeconds: 90 },
              { setNumber: 4, reps: 8, loadKg: 55, restSeconds: 90 },
            ],
          },
          // Tri-set
          {
            name: "Rosca Direta com Barra W",
            muscleGroup: "Bíceps",
            equipment: "Barra W",
            notes: "Sem balançar o tronco.",
            summaryString: "3 voltas x 10 reps (Carga: 22 kg)",
            combinationId: "comb-triset-1",
            combinationType: "TRI_SET",
            combinationTitle: "Tri-set de Bíceps e Antebraço",
            combinationRestSeconds: 90,
            setsDetail: [
              { setNumber: 1, reps: 10, loadKg: 22, restSeconds: 0 },
              { setNumber: 2, reps: 10, loadKg: 22, restSeconds: 0 },
              { setNumber: 3, reps: 8, loadKg: 22, restSeconds: 0 },
            ],
          },
          {
            name: "Rosca Martelo com Halteres",
            muscleGroup: "Braquial / Bíceps",
            equipment: "Halteres",
            notes: "Pegada neutra contínua.",
            summaryString: "3 voltas x 12 reps (Carga: 12 kg)",
            combinationId: "comb-triset-1",
            combinationType: "TRI_SET",
            combinationTitle: "Tri-set de Bíceps e Antebraço",
            combinationRestSeconds: 90,
            setsDetail: [
              { setNumber: 1, reps: 12, loadKg: 12, restSeconds: 0 },
              { setNumber: 2, reps: 12, loadKg: 12, restSeconds: 0 },
              { setNumber: 3, reps: 10, loadKg: 12, restSeconds: 0 },
            ],
          },
          {
            name: "Rosca Inversa na Polia",
            muscleGroup: "Antebraço",
            equipment: "Polia Baixa",
            notes: "Pegada pronada.",
            summaryString: "3 voltas x 15 reps (Carga: 15 kg)",
            combinationId: "comb-triset-1",
            combinationType: "TRI_SET",
            combinationTitle: "Tri-set de Bíceps e Antebraço",
            combinationRestSeconds: 90,
            setsDetail: [
              { setNumber: 1, reps: 15, loadKg: 15, restSeconds: 90 },
              { setNumber: 2, reps: 15, loadKg: 15, restSeconds: 90 },
              { setNumber: 3, reps: 12, loadKg: 15, restSeconds: 90 },
            ],
          },
        ],
      },
    ],
  };

  const filename = createSafeTrainingPdfFilename("treino", mockPlan.studentName);
  console.log(`Nome do arquivo seguro: ${filename}`);

  const start = Date.now();
  const pdfBuffer = await generateTrainingPlanPdfBuffer(mockPlan);
  const elapsed = Date.now() - start;

  console.log(`Buffer gerado com sucesso em ${elapsed}ms! Tamanho: ${pdfBuffer.length} bytes`);

  // Validar assinatura do PDF (%PDF-)
  const magicBytes = pdfBuffer.slice(0, 5).toString("utf-8");
  if (!magicBytes.startsWith("%PDF-")) {
    throw new Error(`Arquivo gerado não é um PDF válido! Header: ${magicBytes}`);
  }

  console.log(`Assinatura do cabeçalho PDF verificada: ${magicBytes}`);
  console.log("=== TESTE DE QA DO PDF CONCLUÍDO COM SUCESSO! ===");
}

runPdfQaTest().catch((err) => {
  console.error("ERRO NO TESTE DE QA DO PDF:", err);
  process.exit(1);
});
